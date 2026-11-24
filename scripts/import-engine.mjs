import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { files, hash, pin, repository, verifyEngine } from './verify-engine.mjs';

const asset = 'unsliced-engine.tar.gz';
const response = await fetch(`${repository}/releases/download/${pin.tag}/${asset}`,
  { signal: AbortSignal.timeout(120_000) });
assert.ok(response.ok, `Core download failed: HTTP ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
assert.equal(hash(bytes), pin.sha256, 'Core archive checksum mismatch');

const stage = await mkdtemp(join(tmpdir(), 'unsliced-engine-import-'));
try {
  const archive = join(stage, asset);
  await writeFile(archive, bytes);
  execFileSync('tar', ['-xzf', archive, '-C', stage], { stdio: 'inherit' });
  const source = join(stage, 'engine');
  await verifyEngine(source);
  const engine = fileURLToPath(new URL('../engine/', import.meta.url));
  for (const file of [...files, 'manifest.json']) {
    const target = join(engine, file);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(source, file), target);
  }
} finally {
  await rm(stage, { recursive: true, force: true });
}
console.log(`Imported verified Unsliced Core ${pin.tag} (${pin.commit})`);
