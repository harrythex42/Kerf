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

`engine/` 保存的是构建产物和许可证，不在这里修改分页源码。`engine/manifest.json` 记录 [核心仓库](https://github.com/harrythex42/Unsliced) 的完整提交号及各文件校验值。通常运行和验收不需要访问核心仓库。

1. 在核心仓库选好已验收的提交，准备一个干净的检出目录。
2. 在本项目运行 `pnpm engine:import <核心目录> <完整提交号>` 生成新产物。
3. 跑 `pnpm acceptance`，检查 PDF 和逐页图片，再提交新的 `engine/`。不要手动修改其中的代码。要发 npm 新版本时，另走发布审批。
