# Set up Unsliced / 安装 Unsliced

[English](#english) · [中文](#中文)

## English

### Any local MCP client

Install [Node.js 22 or later](https://nodejs.org/en/download). Add a local MCP server using **stdio**, with command `npx` and arguments `-y` and `unsliced-pdf-mcp`. The client runs `npx -y unsliced-pdf-mcp` for you. [Version 0.1.1 is available on npm](https://www.npmjs.com/package/unsliced-pdf-mcp/v/0.1.1). Unsliced does not expose an HTTP URL; a client that only accepts remote MCP URLs cannot connect directly.

### OpenCode

In OpenCode V2, add the server under `mcp.servers` in a project `opencode.jsonc` or in `~/.config/opencode/opencode.jsonc` for all projects. Merge it with your existing settings. Run `opencode mcp list` to check the connection. To pass Unsliced environment variables, add an `environment` object to the server entry. [Official OpenCode MCP guide](https://opencode.ai/docs/mcp-servers#local).

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": { "servers": { "unsliced": { "type": "local", "command": ["npx", "-y", "unsliced-pdf-mcp"] } } }
}
```

### Claude Desktop

Open **Settings → Developer → Edit Config**, merge the entry below into `claude_desktop_config.json`, then quit and reopen Claude Desktop. To pass environment variables, use an `env` object inside `unsliced`. This is a local server, not a web connector or a Desktop Extension. [Official MCP guide for Claude Desktop](https://modelcontextprotocol.io/docs/develop/connect-local-servers).

```json
{
  "mcpServers": { "unsliced": { "command": "npx", "args": ["-y", "unsliced-pdf-mcp"] } }
}
```

### Cursor

Merge this entry into `.cursor/mcp.json` in a project, or `~/.cursor/mcp.json` globally. Use an `env` object in the server entry for environment variables. Check the server in Cursor's **Customize** panel. [Official Cursor MCP guide](https://cursor.com/docs/context/mcp).

```json
{
  "mcpServers": { "unsliced": { "type": "stdio", "command": "npx", "args": ["-y", "unsliced-pdf-mcp"] } }
}
```

### Cherry Studio

Open **Settings → MCP → MCP Servers → Add**. Choose a local **STDIO** server named `Unsliced`, enter `npx` as the command and `-y` and `unsliced-pdf-mcp` as separate arguments. Enable the server and check that it lists `create_pdf`. In **Work → Agent menu → Edit → MCP**, enable it for the agent that will use it. [Official Cherry Studio MCP guide](https://docs.cherryai.com.cn/docs/en-us/advanced-basic/extensions/mcp).

### Try it and choose an output folder

Ask your assistant: “Use Unsliced’s `create_pdf` to turn the Markdown below into `report.pdf`. Keep the complete text and return the saved path and layout check.” Use Markdown for ordinary reports and HTML for complex layouts. Embed images as PNG, JPEG, GIF or WebP data URLs; HTML can also contain inline SVG. Add `data-unsliced-root` to the main HTML content container if needed.

PDFs go to `Documents/Unsliced` in your home directory unless you set `UNSLICED_OUTPUT_DIR`. Duplicate names receive numbered suffixes. Raw-source archiving is **off by default**. Set `UNSLICED_KEEP_SOURCE=1` and reconnect to save the unchanged `.md` or `.html` and a matching `.json` in the output directory's `sources/` folder. Use a private local directory for sensitive documents, and don't open untrusted archived HTML in a browser.

### Troubleshooting and running from source

- If the client cannot find `npx`, check `node --version` in a terminal and restart the client so it can pick up the new path. If necessary, use the full executable path; on Windows, a client that cannot launch `npx.cmd` directly can use command `cmd.exe` with arguments `/d`, `/c`, `npx`, `-y`, `unsliced-pdf-mcp`.
- Unsliced tries installed Chrome or Edge first, then cached Playwright Chromium. If none is available, the first PDF call downloads Chromium Headless Shell. Check MCP logs for progress. `npm_config_registry` controls the npm package registry; `PLAYWRIGHT_DOWNLOAD_HOST` controls the browser download mirror. A browser mirror must carry the Playwright build for your platform.
- Where the default downloads are slow, you can try `https://registry.npmmirror.com` for npm or `https://cdn.npmmirror.com/binaries/playwright` for the browser. These are separate settings. See [Playwright's download guide](https://playwright.dev/docs/browsers#download-from-artifact-repository) for browser overrides.
- To run a source checkout instead, run `npx --yes pnpm@12.3.4 install --frozen-lockfile` and `npx --yes pnpm@12.3.4 build` from the repository, then configure `node` with the absolute path to `packages/mcp/server.mjs` as its only argument.

## 中文

### 通用方式：支持本地 MCP 的客户端

安装 [Node.js 22 或更新版本](https://nodejs.org/zh-cn/download)。添加本地 **STDIO** MCP 服务：命令填 `npx`，参数依次填 `-y` 和 `unsliced-pdf-mcp`。客户端会替你运行 `npx -y unsliced-pdf-mcp`。[0.1.1 版已在 npm 发布](https://www.npmjs.com/package/unsliced-pdf-mcp/v/0.1.1)。Unsliced 不提供 HTTP 地址，只接受远程 MCP 地址的客户端无法直接连接。

### OpenCode

在 OpenCode V2 的项目 `opencode.jsonc`，或全局的 `~/.config/opencode/opencode.jsonc` 中，按[上面的配置](#opencode)把条目合并到 `mcp.servers`。运行 `opencode mcp list` 检查连接。环境变量放在服务条目的 `environment` 里。[OpenCode 官方 MCP 说明](https://opencode.ai/docs/mcp-servers#local)。

### Claude Desktop

打开 **Settings → Developer → Edit Config**，把[上面的配置](#claude-desktop)合并到 `claude_desktop_config.json`，完全退出并重新打开应用。环境变量放在 `unsliced` 的 `env` 里。这是本地服务，不是网页连接器或桌面扩展。[Claude Desktop 官方 MCP 安装示例](https://modelcontextprotocol.io/docs/develop/connect-local-servers)。

### Cursor

把[上面的配置](#cursor)合并到项目 `.cursor/mcp.json`，或全局 `~/.cursor/mcp.json`。环境变量放在服务条目的 `env` 里。在 Cursor 的 **Customize** 面板检查是否连接。[Cursor 官方 MCP 说明](https://cursor.com/docs/context/mcp)。

### Cherry Studio

打开 **设置 → MCP → MCP 服务器 → 添加**。选本地 **STDIO**，名称填 `Unsliced`，命令填 `npx`，参数分两项填 `-y`、`unsliced-pdf-mcp`。启用服务后检查工具列表中是否有 `create_pdf`。再到 **工作 → 智能体菜单 → 编辑 → MCP**，为要使用的智能体启用服务。[Cherry Studio 官方 MCP 说明](https://docs.cherryai.com.cn/docs/en-us/advanced-basic/extensions/mcp)。

### 生成第一份 PDF 和设置保存目录

可以对助手说：「请用 Unsliced 的 `create_pdf` 把下面的 Markdown 排成 `report.pdf`。保留全文，并告诉我保存位置和排版体检结果。」普通报告用 Markdown；复杂排版可用 HTML。图片请用内嵌的 PNG、JPEG、GIF 或 WebP data URL；HTML 也支持内联 SVG。如需指定正文容器，可加 `data-unsliced-root`。

文件默认保存在个人目录的 `Documents/Unsliced`（文稿下的 Unsliced），可用 `UNSLICED_OUTPUT_DIR` 修改。同名文件会自动加数字后缀。**默认不保存原稿**；设置 `UNSLICED_KEEP_SOURCE=1` 后重新连接，会在输出目录的 `sources/` 保存未经修改的 `.md` 或 `.html` 和对应的 `.json`。涉及私密信息时请选合适的本地目录，不要在浏览器打开不可信的 HTML 原稿。

### 排查问题和从源码启动

- 客户端找不到 `npx` 时，在终端用 `node --version` 检查版本，并重启客户端以刷新路径。必要时填可执行文件的完整路径；Windows 客户端如果不能直接启动 `npx.cmd`，可用 `cmd.exe` 作命令，参数依次填 `/d`、`/c`、`npx`、`-y`、`unsliced-pdf-mcp`。
- Unsliced 先尝试已安装的 Chrome 或 Edge，再尝试缓存中的 Playwright Chromium。都不可用时，第一次生成 PDF 会下载 Chromium Headless Shell，可查看 MCP 日志。npm 下载源由 `npm_config_registry` 控制；浏览器下载源由 `PLAYWRIGHT_DOWNLOAD_HOST` 控制。浏览器镜像必须提供当前 Playwright 版本和系统对应的构建。
- 默认源下载慢时，npm 可以试 `https://registry.npmmirror.com`，浏览器可以试 `https://cdn.npmmirror.com/binaries/playwright`。这是两项独立设置。浏览器下载选项见 [Playwright 官方下载说明](https://playwright.dev/docs/browsers#download-from-artifact-repository)。
- 从源码运行时，先在仓库目录执行 `npx --yes pnpm@12.3.4 install --frozen-lockfile` 和 `npx --yes pnpm@12.3.4 build`，再把客户端命令设为 `node`，唯一参数设为 `packages/mcp/server.mjs` 的完整路径。
