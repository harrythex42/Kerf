# Unsliced MCP

**Unsliced 家族 / Unsliced family:** [Core](https://github.com/harrythex42/unsliced-core) · [MCP](https://github.com/harrythex42/unsliced-mcp) · [Web](https://github.com/harrythex42/unsliced-web)

Give an AI assistant a local tool for turning Markdown or HTML into searchable PDFs. Long tables break only between complete rows and repeat their headers. Chinese text can be searched and copied.

[简体中文](README.zh-CN.md) · [Use Unsliced in a browser](https://harrythex42.github.io/unsliced-web/)

## Use the released tool

Requires Node.js 22 or newer. Add `unsliced` as a local **stdio** MCP server:

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

Ask your assistant to create a PDF and provide Markdown or HTML. Files are saved locally, by default under `Documents/Unsliced`. Use `UNSLICED_OUTPUT_DIR` to choose another folder. Remote images are not fetched; embed them as data URLs instead. Chromium may be downloaded on the first run if no suitable browser is installed.

## Development

[Build a local package, run acceptance, or update the pinned engine](docs/development.md).

This project imports a fixed, verified release directly from [Unsliced Core](https://github.com/harrythex42/unsliced-core), not from the web app. The engine ships with the MCP tool, so creating a PDF does not download it again.

[MIT and BreakFlow copyright](LICENSE) · [Font license (OFL)](engine/assets/fonts/OFL.txt)
