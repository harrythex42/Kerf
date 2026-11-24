# Unsliced MCP

**Unsliced 家族 / Unsliced family:** [Core](https://github.com/harrythex42/unsliced-core) · [MCP](https://github.com/harrythex42/unsliced-mcp) · [Web](https://github.com/harrythex42/unsliced-web)

给 AI 助手使用的本地 PDF 工具。把 Markdown 或 HTML 排成可搜索的 PDF；长表只在完整的行之间分页，续页重复表头，中文也可以搜索和复制。

[English](README.md) · [直接用网页版](https://harrythex42.github.io/unsliced-web/)

## 使用正式版本

需要 Node.js 22 或更新版本。在 AI 客户端里，把 `unsliced` 添加为本地 **STDIO** MCP 服务：

```json
{
  "mcpServers": {
    "unsliced": {
      "command": "npx",
      "args": ["-y", "unsliced-pdf-mcp"]
    }
  }
}
```

把 Markdown 或 HTML 交给助手，告诉它生成 PDF。文件留在本机，默认放在 `Documents/Unsliced`；可以用 `UNSLICED_OUTPUT_DIR` 指定其他目录。插图要嵌在文稿里，工具不下载外链图片。如果本机没有合适的浏览器，第一次使用可能需要下载 Chromium。

## 开发

见[开发说明](docs/development.md)，包括本地打包、验收和换用指定的分页版本。MCP 直接使用 [Unsliced Core](https://github.com/harrythex42/unsliced-core) 发布的固定版本并校验，不依赖网页版。分页包随 MCP 工具一起安装，生成 PDF 时不另下载。

[MIT 许可证和 BreakFlow 版权声明](LICENSE) · [字体 OFL 许可证](engine/assets/fonts/OFL.txt)
