// Stages the web app into www/, which is what Capacitor packages into the APK.
// Keeping it separate means node_modules/ and android/ never end up inside the
// app bundle.
//
//   node tools/build-www.mjs

import { cp, rm, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'www');

const ENTRIES = [
  'index.html',
  'styles.css',
  'sw.js',
  'manifest.webmanifest',
  'js',
  'icons',
];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (const entry of ENTRIES) {
  await cp(join(ROOT, entry), join(OUT, entry), { recursive: true });
}

const listed = await readdir(OUT);
console.log(`staged ${listed.length} entries into www/: ${listed.join(', ')}`);
