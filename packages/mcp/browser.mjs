import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
let installation;

function installChromium(progress) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(dirname(require.resolve('playwright/package.json')), 'cli.js'), 'install', 'chromium', '--only-shell'], {
      env: { ...process.env, PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT: process.env.PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT || '60000' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const heartbeat = setInterval(() => progress('仍在下载 Chromium，请稍候。'), 5000);
    const timeout = setTimeout(() => child.kill(), 300_000);
    for (const stream of [child.stdout, child.stderr]) stream.on('data', data => process.stderr.write(data));
    child.once('error', error => reject(new Error('无法启动 Chromium 下载：' + error.message)));
    child.once('close', (code, signal) => {
      clearInterval(heartbeat);
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(signal ? 'Chromium 下载超时。请尝试已有的 Chrome / Edge，或在 MCP 环境变量中设定 Playwright 镜像后重试。'
        : 'Chromium 下载失败。请查看 MCP 日志，检查网络或安装 Chrome 后重试。'));
    });
  });
}

export async function openBrowser(progress) {
  if (process.env.UNSLICED_CHROME) return chromium.launch({ executablePath: process.env.UNSLICED_CHROME, timeout: 15000 });
  // Playwright's channel discovery covers standard Google Chrome installations.
  if (!process.env.UNSLICED_USE_BUNDLED_BROWSER) {
    for (const channel of ['chrome', 'msedge']) {
      try {
        return await chromium.launch({ channel, timeout: 10000 });
      } catch (error) {
        if (!/not found|doesn.t exist|distribution/i.test(error.message)) {
          console.error('[Unsliced] ' + channel + ' 启动失败。', error.message.split('\n')[0]);
        }
      }
    }
  }
  try { return await chromium.launch({ timeout: 15000 }); }
  catch (error) {
    if (!error.message.includes("Executable doesn't exist")) throw error;
  }
  progress('没有找到可用浏览器。正在下载 Chromium，详细进度见 MCP 日志。');
  installation ??= installChromium(progress).finally(() => { installation = undefined; });
  await installation;
  return chromium.launch({ timeout: 15000 });
}
