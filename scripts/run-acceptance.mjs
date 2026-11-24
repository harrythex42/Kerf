import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import manifest from '../package.json' with { type: 'json' };

const root = fileURLToPath(new URL('../', import.meta.url));
execFileSync(process.execPath, [join(root, 'scripts/pack.mjs')], { stdio: 'inherit' });
const scratch = await mkdtemp(join(tmpdir(), 'unsliced-mcp-installed-'));
try {
  const tarball = join(root, 'output', 'npm', `${manifest.name}-${manifest.version}.tgz`);
  execFileSync('npm', ['install', '--prefix', scratch, '--no-audit', '--no-fund', tarball], {
    stdio: 'inherit', shell: process.platform === 'win32'
  });
  const entry = join(scratch, 'node_modules', manifest.name, 'dist/server.mjs');
  execFileSync(process.execPath, [join(root, 'acceptance.mjs')], {
    stdio: 'inherit', env: { ...process.env, UNSLICED_TEST_MCP_ENTRY: entry }
  });
} finally {
  await rm(scratch, { recursive: true, force: true });
}
