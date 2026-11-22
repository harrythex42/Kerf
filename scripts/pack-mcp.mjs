import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'tsup';

const project = fileURLToPath(new URL('../', import.meta.url));
const { name: packageName, version, dependencies } = JSON.parse(
  await readFile(join(project, 'packages/mcp/package.json'), 'utf8')
);
const [name = packageName, output = 'output/npm'] = process.argv.slice(2);
if (!name || !/^(@[a-z0-9][a-z0-9-]*\/)?[a-z0-9][a-z0-9-]*$/u.test(name)) {
  throw new Error('Usage: node scripts/pack-mcp.mjs <package-name> [output-directory]');
}
const destination = resolve(output);
const staging = await mkdtemp(join(tmpdir(), 'unsliced-npm-'));
try {
  const runtime = {};
  for (const dependency of Object.keys(dependencies).filter(name => !name.startsWith('@breakflow/'))) {
    const manifest = JSON.parse(await readFile(join(project, 'packages/mcp/node_modules', dependency, 'package.json'), 'utf8'));
    // Pin the workspace-tested versions, particularly the Playwright driver and its browser revision.
    runtime[dependency] = manifest.version;
  }
  await writeFile(join(staging, 'package.json'), JSON.stringify({
    name, version, description: 'Unsliced MCP server for searchable, optimally paginated PDFs',
    type: 'module', bin: { [name.split('/').at(-1)]: './dist/server.mjs' },
    engines: { node: '>=22' }, license: 'MIT', repository: 'https://github.com/harrythex42/Unsliced',
    files: ['dist', 'assets', 'LICENSE', 'README.md'], dependencies: runtime
  }, null, 2));
  await build({
    entry: { server: join(project, 'packages/mcp/server.mjs') },
    outDir: join(staging, 'dist'), format: ['esm'], platform: 'node', target: 'node22', dts: false,
    outExtension: () => ({ js: '.mjs' }),
    external: Object.keys(runtime), noExternal: [/^@breakflow\//u],
    banner: { js: '#!/usr/bin/env node' }
  });
  await cp(join(project, 'packages/browser/dist/index.global.js'), join(staging, 'dist/index.global.js'));
  await cp(join(project, 'packages/playwright/assets/fonts'), join(staging, 'assets/fonts'), { recursive: true });
  await cp(join(project, 'LICENSE'), join(staging, 'LICENSE'));
  await writeFile(join(staging, 'README.md'), '# Unsliced MCP\n\nRun `npx -y ' + name +
    '` to start the local PDF tool.\n\n[Setup / 中文安装说明](https://github.com/harrythex42/Unsliced/blob/main/docs/setup.md)\n');
  await mkdir(destination, { recursive: true });
  execFileSync(process.platform === 'win32' ? 'cmd.exe' : 'npm',
    [...(process.platform === 'win32' ? ['/d', '/c', 'npm.cmd'] : []), 'pack', '--pack-destination', destination],
    { cwd: staging, stdio: 'inherit' });
} finally {
  await rm(staging, { recursive: true, force: true });
}
