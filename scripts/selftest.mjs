import { spawn, spawnSync } from 'node:child_process';
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');

function parsePhase(argv) {
  for (const arg of argv) {
    if (arg.startsWith('--phase=')) {
      const n = Number(arg.slice('--phase='.length));
      if (Number.isInteger(n) && n >= 0 && n <= 12) return n;
    }
  }
  throw new Error('Usage: npm run selftest -- --phase=N (0..12)');
}

const phase = parsePhase(process.argv.slice(2));
const logDir = join(ROOT, 'selftest');
mkdirSync(logDir, { recursive: true });
const logPath = join(logDir, `phase-${String(phase).padStart(2, '0')}.log`);
writeFileSync(logPath, `SELFTEST phase ${phase} started ${new Date().toISOString()}\n`);

const steps = [
  { name: 'typecheck', cmd: 'npm', args: ['run', 'typecheck'] },
  { name: 'lint', cmd: 'npm', args: ['run', 'lint'] },
  { name: 'lint:branding', cmd: 'npm', args: ['run', 'lint:branding'] },
  { name: 'test', cmd: 'npm', args: ['run', 'test'], env: { ...process.env, PHASE: String(phase) } },
  { name: 'build', cmd: 'npm', args: ['run', 'build'] },
];

function runStep(step) {
  const start = Date.now();
  appendFileSync(logPath, `\n>>> ${step.name}: ${step.cmd} ${step.args.join(' ')}\n`);
  const result = spawnSync(step.cmd, step.args, {
    cwd: ROOT,
    env: step.env ?? process.env,
    encoding: 'utf8',
    shell: true,
    maxBuffer: 20 * 1024 * 1024,
  });
  const duration = Date.now() - start;
  const combined = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  const tail = combined.split('\n').slice(-40).join('\n');
  appendFileSync(
    logPath,
    `exit=${result.status ?? 1} durationMs=${duration}\n${tail}\n`,
  );
  return { code: result.status ?? 1, out: combined };
}

let failedStep = null;

for (const step of steps) {
  const { code } = runStep(step);
  if (code !== 0) {
    failedStep = step.name;
    break;
  }
}

async function smokeCheck() {
  appendFileSync(logPath, '\n>>> smoke: vite preview + fetch\n');
  const distIndex = join(ROOT, 'dist', 'index.html');
  if (!existsSync(distIndex)) {
    appendFileSync(logPath, 'dist/index.html missing\n');
    return 1;
  }
  const indexHtml = readFileSync(distIndex, 'utf8');
  if (/https?:\/\//i.test(indexHtml)) {
    appendFileSync(logPath, 'external http(s) URL in dist/index.html\n');
    return 1;
  }

  const previewProc = spawn('npm', ['run', 'preview'], {
    cwd: ROOT,
    shell: true,
    stdio: 'ignore',
    detached: process.platform !== 'win32',
  });

  await new Promise((r) => setTimeout(r, 3500));

  try {
    const res = await fetch('http://127.0.0.1:4173/');
    if (!res.ok) {
      appendFileSync(logPath, `index fetch status ${res.status}\n`);
      return 1;
    }
    const body = await res.text();
    if (/https?:\/\//i.test(body)) {
      appendFileSync(logPath, 'external http(s) in preview index\n');
      return 1;
    }
    const jsMatch = body.match(/src="\.\/assets\/[^"]+\.js"/);
    if (!jsMatch) {
      appendFileSync(logPath, 'no JS bundle reference in index\n');
      return 1;
    }
    const jsUrl = jsMatch[0].slice(5, -1);
    const jsRes = await fetch(`http://127.0.0.1:4173/${jsUrl.replace(/^\.\//, '')}`);
    if (!jsRes.ok) {
      appendFileSync(logPath, `bundle fetch status ${jsRes.status}\n`);
      return 1;
    }
  } catch (err) {
    appendFileSync(logPath, `smoke fetch error: ${String(err)}\n`);
    return 1;
  } finally {
    if (previewProc.pid !== undefined) {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/PID', String(previewProc.pid), '/T', '/F'], { shell: true });
      } else {
        try {
          process.kill(-previewProc.pid, 'SIGTERM');
        } catch {
          process.kill(previewProc.pid, 'SIGTERM');
        }
      }
    }
  }

  function walkTs(dir) {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walkTs(full);
      else if (name.endsWith('.ts')) {
        const text = readFileSync(full, 'utf8');
        if (text.includes('Math.random(')) {
          throw new Error(`Math.random in ${full}`);
        }
        if (/from\s+['"]phaser/.test(text) || /import\s+Phaser/.test(text)) {
          throw new Error(`Phaser import in ${full}`);
        }
      }
    }
  }
  walkTs(join(ROOT, 'src', 'core'));
  walkTs(join(ROOT, 'src', 'game'));
  appendFileSync(logPath, 'smoke OK\n');
  return 0;
}

if (!failedStep) {
  const smokeCode = await smokeCheck();
  if (smokeCode !== 0) failedStep = 'smoke';
}

if (failedStep) {
  appendFileSync(logPath, `\nSELFTEST phase ${phase}: FAIL (${failedStep})\n`);
  console.error(`SELFTEST phase ${phase}: FAIL (${failedStep})`);
  process.exit(1);
}

appendFileSync(logPath, `\nSELFTEST phase ${phase}: PASS\n`);
console.log(`SELFTEST phase ${phase}: PASS`);
process.exit(0);
