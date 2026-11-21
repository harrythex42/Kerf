# 在 Cherry Studio 使用 Unsliced

Unsliced 把 Markdown 或 HTML 排成可搜索、能复制文字的 PDF。默认用 A4 和全局最优分页。表格拆分惩罚是 15 行。

## 安装

1. 安装 [Node.js 22 或更新版本](https://nodejs.org/zh-cn/download)。macOS 和 Linux 可直接使用下方的启动脚本。
2. 在 [Unsliced 仓库](https://github.com/harrythex42/Unsliced) 点 **Code → Download ZIP**，解压到容易找到的位置。例如把文件夹放到桌面，命名为 `Unsliced`。
3. 打开 Cherry Studio，进入 **设置 → MCP → MCP 服务器 → 添加 → 快速创建**。名称填 **Unsliced**，类型选 **STDIO**。在 macOS 的命令栏填一行 `/Users/你的用户名/Desktop/Unsliced/scripts/unsliced-mcp`，把用户名换成自己的。参数留空，保存。下载包若没有执行权限，命令填 `/bin/sh`，参数加一行启动脚本的完整路径。
4. 第一次连接会安装依赖并构建。若 Cherry Studio 在构建期间提示连接超时，可以在终端运行一次同一个启动命令。看到构建完成后按 **Ctrl+C**，回到 Cherry Studio 重新打开 Unsliced 开关。
5. 看到 **Unsliced 已连接** 后，点 **工具 (1)**，确认列表里有 **create_pdf**。回到聊天，在输入区的 MCP 菜单或智能体的工具设置里启用 Unsliced。选用支持工具调用的模型。[Cherry Studio 官方配置说明](https://cherryai.com.cn/docs/zh-cn/advanced-basic/extensions/mcp/)

在 Windows 上，从解压目录打开终端，先运行 `npx --yes pnpm@12.3.4 install --frozen-lockfile`，然后运行 `npx --yes pnpm@12.3.4 build`。Cherry Studio 的命令填 `node`，参数加一行 `packages/mcp/server.mjs` 的完整路径，例如 `C:\Unsliced\packages\mcp\server.mjs`。

## 生成第一份 PDF

可以直接对助手说：

> 请调用 Unsliced 的 create_pdf，把这段 Markdown 排成 PDF，文件名叫「Unsliced 测试」。生成后告诉我保存路径和排版体检。
>
> # Unsliced 测试
>
> 中文可以在 PDF 里搜索和复制。

复测《天才工厂》时，打开原对话并启用 Unsliced，发下面这句话即可：

> 请使用 Unsliced 的 create_pdf，把本对话中的《天才工厂与董厂长》报告排成 A4 PDF。完整保留文字、表格和小标题，文件名为「天才工厂」。如果保留原来的版式就用 HTML，否则用 Markdown。完成后告诉我保存路径、页数和排版体检。

文件默认保存到你的 **文稿 → Unsliced** 文件夹。同名文件会自动加数字后缀。想更换目录，可以在 MCP 环境变量中填写 `UNSLICED_OUTPUT_DIR`。返回的路径可以在 Finder 中用 **前往 → 前往文件夹** 打开。

## 浏览器与排查

Unsliced 优先使用电脑现有的 Google Chrome 或 Microsoft Edge。首次调用时如果没有可用浏览器，会下载 Playwright 的 Chromium。详细下载进度和错误会写到 MCP 服务日志。支持 MCP 进度通知的客户端也会看到下载提示。下载超时或失败时可以检查网络，或安装 Chrome 后重新调用。Linux 如提示缺少系统库，可在项目目录运行 `npx --yes pnpm@12.3.4 exec playwright install-deps chromium`。

Markdown 支持标题、列表、表格、代码块、引用和图片。图片以嵌入文档的 PNG、JPEG、GIF 或 WebP 提交，HTML 也可以使用内联 SVG。若助手提交了图片网址或本机路径，工具会提示改为嵌入图片。HTML 样式应随文档提交，可给正文容器加上 `data-unsliced-root`。

## npm 安装方式（发布后）

在 Windows 上先装 [Node.js](https://nodejs.org/zh-cn/download)，然后重启 Cherry Studio，让应用找到 npm。在 **设置 → MCP → 添加 → 快速创建** 中选择 **STDIO**。命令填写 `npx`（找不到时，见下方 Windows 备用填法），参数分别填 `-y` 和`unsliced-pdf-mcp`。macOS 和 Linux 使用相同填法。不需要从 GitHub 下载项目。发布前，上面的源码配置可继续使用。

Windows 备用填法用 `cmd.exe` 作命令，依次填 `/d`、`/c`、`npx`、`-y`、`unsliced-pdf-mcp`，每行一个。这个方法由 Windows 的命令解释器启动 Node.js 自带的 `npx.cmd`。

## 国内网络与自定义镜像

Unsliced 依次尝试已安装的 **Chrome、Edge** 和缓存里的 Chromium。Windows 已经装了能启动的 Edge 时，通常可以直接使用。三个都不可用时才会首次下载 Playwright Chromium Headless Shell。

- npm 包本身下载慢时，可以在 Cherry Studio 的 MCP 环境变量中设置 `npm_config_registry`，值可以填 `https://registry.npmmirror.com`。npm 镜像和浏览器镜像是两种设置。
- Chromium 下载慢时，可以安装 [Microsoft Edge](https://www.microsoft.com/edge/download)，或将 `PLAYWRIGHT_DOWNLOAD_HOST` 设为 `https://cdn.npmmirror.com/binaries/playwright`。这个地址已在 macOS 空缓存下实测下载成功。也可以填写组织提供的可信、兼容当前 Playwright 版本的镜像。只替换 Chromium 下载源可用 `PLAYWRIGHT_CHROMIUM_DOWNLOAD_HOST`。镜像必须提供该版本的构建和相应系统的文件。首次下载最多等待约 5 分钟，详细进度可看 MCP 日志。[Playwright 下载设置](https://playwright.dev/docs/browsers#download-from-artifact-repository)
