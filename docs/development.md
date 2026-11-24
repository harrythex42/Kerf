# MCP 本地开发与验收

需要 Node.js 22 或更新版本、pnpm 12.3.4 和 Python。在本项目目录运行：

```sh
pnpm install --frozen-lockfile
python3 -m venv .venv
.venv/bin/python -m pip install -r scripts/requirements.txt
pnpm exec playwright install chromium --only-shell
UNSLICED_PYTHON=.venv/bin/python pnpm acceptance
```

Linux 如果缺少 Chromium 系统库，按 Playwright 提示安装。`pnpm acceptance` 打出本地安装包，把它安装到独立临时目录，再通过 MCP 调用检查 Markdown、HTML、分页、中文搜索和复制、外部图片限制、原稿归档。PDF 和逐页图片在 `output/mcp/`。`pnpm pack:local` 只打包，文件写入 `output/npm/`；两个命令都不发布 npm。

## 更新分页程序

`engine/` 只保存从 [Unsliced Core 发布页](https://github.com/harrythex42/unsliced-core/releases) 取来的打包文件和许可证。`engine-release.json` 固定版本标签、完整源码版本号、压缩包校验值和清单校验值。打包会核对清单和每个文件。用户生成 PDF、本地打包和验收不需要再下载分页包。

1. 从 Core 的指定发布下载压缩包和校验文件。核对压缩包后，记录该版本的标签、源码版本号、压缩包和 `engine/manifest.json` 的 SHA-256 到 `engine-release.json`。如果清单中的 Playwright 版本变了，也要更新本项目依赖。
2. 在装有 `tar` 的电脑上运行 `pnpm engine:import`，从 Core 下载、校验并更新 `engine/`。不要手动修改其中的代码。
3. 跑 `pnpm acceptance`，检查 PDF 和逐页图片，再一起提交版本记录和 `engine/`。要发 npm 新版本时，另走发布审批。
