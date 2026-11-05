/**
 * Verifies PNG pixels against src/config/palette.ts once assets exist (Phase 12+).
 * Phase 0–11: no-op pass when public/assets is empty or missing PNGs.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const assetsDir = join(import.meta.dirname, '..', 'public', 'assets');

function hasPng(dir) {
  if (!existsSync(dir)) return false;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (hasPng(full)) return true;
    } else if (name.endsWith('.png')) {
      return true;
    }
  }
  return false;
}

if (!hasPng(assetsDir)) {
  console.log('lint:palette skipped (no PNG assets yet)');
  process.exit(0);
}

console.error('lint:palette — PNG assets present but pixel check not implemented yet');
process.exit(1);
