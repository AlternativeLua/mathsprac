// Sets the version in package.json and in the Android build, keeping the
// Android versionCode monotonic.
//
//   node tools/bump-version.mjs 1.0.1

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = process.argv[2];

if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
  console.error('usage: node tools/bump-version.mjs <major.minor.patch>');
  process.exit(1);
}

const pkgPath = join(ROOT, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
pkg.version = version;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

const gradlePath = join(ROOT, 'android', 'app', 'build.gradle');
let gradle = readFileSync(gradlePath, 'utf8');
const match = /versionCode\s+(\d+)/.exec(gradle);
if (!match) {
  console.error('could not find versionCode in android/app/build.gradle');
  process.exit(1);
}
const code = Number(match[1]) + 1;
gradle = gradle
  .replace(/versionCode\s+\d+/, `versionCode ${code}`)
  .replace(/versionName\s+"[^"]*"/, `versionName "${version}"`);
writeFileSync(gradlePath, gradle);

console.log(`  package.json  -> ${version}`);
console.log(`  versionName   -> ${version}`);
console.log(`  versionCode   -> ${code}`);
