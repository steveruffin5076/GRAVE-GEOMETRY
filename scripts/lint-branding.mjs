import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const RETIRED = 'LAST TILE';
const SKIP = new Set(['plan.md', 'CHANGELOG.md', 'scripts/lint-branding.mjs']);

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(ROOT, full).replace(/\\/g, '/');
    if (SKIP.has(rel)) continue;
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
      walk(full, out);
    } else if (/\.(ts|tsx|js|mjs|html|css|json|md)$/.test(name)) {
      out.push(full);
    }
  }
}

const targets = ['src', 'index.html', 'public', 'README.md', 'package.json'].map((p) =>
  join(ROOT, p),
);

const files = [];
for (const t of targets) {
  try {
    const st = statSync(t);
    if (st.isDirectory()) walk(t, files);
    else files.push(t);
  } catch {
    /* optional path */
  }
}

let failed = false;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  if (text.includes(RETIRED)) {
    console.error(`lint:branding — retired title found in ${relative(ROOT, file)}`);
    failed = true;
  }
}

try {
  const strings = readFileSync(join(ROOT, 'src/data/strings.ts'), 'utf8');
  if (!strings.includes("GAME_TITLE = 'GRAVE GEOMETRY'")) {
    console.error('lint:branding — GAME_TITLE missing or wrong');
    failed = true;
  }
  if (!strings.includes("GAME_TAGLINE = 'One map. No last wave.'")) {
    console.error('lint:branding — GAME_TAGLINE missing or wrong');
    failed = true;
  }
} catch {
  console.error('lint:branding — src/data/strings.ts not found');
  failed = true;
}

if (failed) process.exit(1);
console.log('lint:branding OK');
