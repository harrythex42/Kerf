import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const [checkout, expected] = process.argv.slice(2);
assert.ok(checkout && /^[0-9a-f]{40}$/u.test(expected ?? ''),
  'Usage: pnpm engine:import <clean Unsliced checkout> <full commit SHA>');
const source = resolve(checkout);
const git = (...args) => execFileSync('git', args, { cwd: source, encoding: 'utf8' }).trim();
assert.equal(git('rev-parse', 'HEAD'), expected, 'The checkout is not the requested version.');
assert.equal(git('status', '--porcelain', '--', 'packages', 'LICENSE', 'pnpm-lock.yaml'), '',
  'Build the engine from an unmodified checkout.');

// Resolve and build the workspace from the checked-out lockfile, not from a
// potentially stale dist left by a previous checkout.
const pnpm = (...args) => execFileSync('pnpm', args, {
  cwd: source, stdio: 'inherit', shell: process.platform === 'win32'
});
pnpm('install', '--frozen-lockfile');
pnpm('exec', 'turbo', 'run', 'build', '--filter=@breakflow/playwright...');

const engine = fileURLToPath(new URL('../engine/', import.meta.url));
const files = ['runtime/index.mjs', 'runtime/index.global.js', 'assets/fonts/UnslicedSansSC.ttf',
  'assets/fonts/OFL.txt', 'assets/fonts/README.md', 'LICENSE'];
for (const name of files) await mkdir(dirname(join(engine, name)), { recursive: true });
await build({
  stdin: {
    contents: "export { DEFAULT_OPTIMAL_OPTIONS, generatePdf } from './packages/playwright/dist/index.js';",
    resolveDir: source,
    sourcefile: 'unsliced-engine-entry.mjs'
  },
  bundle: true, format: 'esm', platform: 'node', target: 'node22',
  external: ['playwright'], minify: true, outfile: join(engine, 'runtime/index.mjs'),
  banner: { js: '/*! Generated from Unsliced; BreakFlow and Unsliced contributors — MIT. See ../LICENSE. */' }
});
const browser = await readFile(join(source, 'packages/browser/dist/index.global.js'), 'utf8');
await writeFile(join(engine, 'runtime/index.global.js'),
  '/*! Generated from Unsliced; BreakFlow and Unsliced contributors — MIT. See ../LICENSE. */\n' +
  browser.replace(/\r?\n\/\/# sourceMappingURL=[^\r\n]+/u, ''));
for (const file of files.slice(2)) {
  const original = file === 'LICENSE' ? join(source, file) : join(source, 'packages/playwright', file);
  await copyFile(original, join(engine, file));
}
const hashes = {};
for (const file of files) hashes[file] = createHash('sha256').update(await readFile(join(engine, file))).digest('hex');
await writeFile(join(engine, 'manifest.json'), JSON.stringify({
  upstream: 'https://github.com/harrythex42/Unsliced', commit: expected, sha256: hashes
}, null, 2) + '\n');
console.log(`Imported Unsliced engine: ${expected}`);
