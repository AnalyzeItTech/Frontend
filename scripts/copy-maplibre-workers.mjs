#!/usr/bin/env node
/** Copy MapLibre v6 workers into public/ so GeoJSON layers work under Next.js. */
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'maplibre-gl', 'dist');
const dest = join(root, 'public', 'maplibre');

const files = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];
if (!existsSync(join(src, files[0]))) {
  console.warn('[copy-maplibre-workers] maplibre-gl not installed — skip');
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
for (const f of files) {
  copyFileSync(join(src, f), join(dest, f));
}
console.log('[copy-maplibre-workers] copied', files.join(', '));
