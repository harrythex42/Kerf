import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import project from '../package.json' with { type: 'json' };
import pin from '../engine-release.json' with { type: 'json' };

export { pin };
export const repository = 'https://github.com/harrythex42/unsliced-core';
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const files = ['LICENSE', 'runtime/index.mjs', 'runtime/index.global.js',
  'assets/fonts/UnslicedSansSC.ttf', 'assets/fonts/OFL.txt', 'assets/fonts/README.md'];

assert.match(pin.tag, /^core-v\d+\.\d+\.\d+$/u);
assert.match(pin.commit, /^[0-9a-f]{40}$/u);
assert.match(pin.sha256, /^[0-9a-f]{64}$/u);
assert.match(pin.manifestSha256, /^[0-9a-f]{64}$/u);

export async function verifyEngine(engine) {
  const bytes = await readFile(join(engine, 'manifest.json'));
  assert.equal(hash(bytes), pin.manifestSha256, 'Core manifest checksum mismatch');
  const manifest = JSON.parse(bytes.toString('utf8'));
  assert.equal(manifest.upstream, repository);
  assert.equal(manifest.commit, pin.commit);
  assert.equal(manifest.playwright, project.dependencies.playwright);
  assert.deepEqual(Object.keys(manifest.sha256).sort(), [...files].sort());
  for (const file of files) {
    assert.equal(hash(await readFile(join(engine, file))), manifest.sha256[file], `Core file mismatch: ${file}`);
  }
}
