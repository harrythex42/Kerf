import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import project from '../package.json' with { type: 'json' };
import engine from '../engine/manifest.json' with { type: 'json' };

const root = fileURLToPath(new URL('../', import.meta.url));
for (const [file, sha] of Object.entries(engine.sha256)) {
  const bytes = await readFile(join(root, 'engine', file));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), sha, `Engine file changed: ${file}`);
}
const output = join(root, 'output/npm');
const stage = await mkdtemp(join(tmpdir(), 'unsliced-mcp-pack-'));
try {
  await mkdir(output, { recursive: true });
  await build({
    entryPoints: [join(root, 'server.mjs')], outfile: join(stage, 'dist/server.mjs'), bundle: true,
    format: 'esm', platform: 'node', target: 'node22', external: Object.keys(project.dependencies),
    banner: { js: '#!/usr/bin/env node\n/*! BreakFlow and Unsliced contributors — MIT. See ../LICENSE. */' }
  });
  await copyFile(join(root, 'engine/runtime/index.global.js'), join(stage, 'dist/index.global.js'));
  await cp(join(root, 'engine/assets'), join(stage, 'assets'), { recursive: true });
  await copyFile(join(root, 'LICENSE'), join(stage, 'LICENSE'));
  await copyFile(join(root, 'README.md'), join(stage, 'README.md'));
  await copyFile(join(root, 'engine/manifest.json'), join(stage, 'engine-manifest.json'));
  const manifest = {
    name: project.name, version: project.version, description: 'Unsliced MCP server for searchable, optimally paginated PDFs',
    mcpName: 'io.github.harrythex42/unsliced', type: 'module', bin: { [project.name]: './dist/server.mjs' },
    engines: project.engines, license: 'MIT', repository: 'https://github.com/harrythex42/unsliced-mcp',
    files: ['dist', 'assets', 'LICENSE', 'README.md', 'engine-manifest.json'], dependencies: project.dependencies
  };
  await writeFile(join(stage, 'package.json'), JSON.stringify(manifest, null, 2));
  execFileSync('npm', ['pack', '--pack-destination', output], {
    cwd: stage, stdio: 'inherit', shell: process.platform === 'win32'
  });
} finally {
  await rm(stage, { recursive: true, force: true });
}
