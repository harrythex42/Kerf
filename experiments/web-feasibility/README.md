# Unsliced 网页可行性测试

这只是本地实验，没有发布。Markdown 在浏览器里转换、排版；本地启动命令只负责提供静态文件，不接收或处理你粘贴的文稿。打印按钮直接打开当前预览的打印对话框，不另排一遍。

查看 [本次结论](FINDINGS.md)、[每份样例的检查结果](../../output/web-feasibility/report.md)或[逐页图片](../../output/web-feasibility/images.html)。

## 在 Mac 上打开

在终端进入 Unsliced 文件夹。第一次需要装好 Node.js、项目依赖及 Python 依赖；如果已经准备好且 `dist` 已生成，可以只运行最后两条命令。若机器没有 `pnpm` 命令而有 Corepack，先运行 `corepack enable pnpm`，或请协作者准备环境。下面的 `.venv` 仅用于此实验。

```sh
pnpm install --frozen-lockfile
python3 -m venv experiments/web-feasibility/.venv
experiments/web-feasibility/.venv/bin/python -m pip install fonttools brotli -r scripts/requirements.txt
pnpm build
UNSLICED_PYTHON=experiments/web-feasibility/.venv/bin/python node experiments/web-feasibility/build.mjs
mkdir -p output/web-feasibility/manual
python3 -m http.server 4173 --bind 127.0.0.1 --directory experiments/web-feasibility/dist
```

终端不要关。在 Safari 或 Firefox 打开 **<http://127.0.0.1:4173/>**。验证结束后，在该终端按 `Ctrl+C` 停止。网页不能直接双击打开，必须用上面这个本地地址。

## Safari / Firefox 手动清单（各约 10 分钟）

每个浏览器各做下面三份，一共各存三个文件。Chrome 也可按同样步骤补测，将文件名开头改为 `chrome-`。

1. 展开「测试入口：载入样例」，按下表选字体、样例，点「载入并分页」。记下网页上显示的页数。
2. 点「打印 / 存为 PDF」：
   - **Safari**：如果只看到简化对话框，点「显示详细信息」。纸张选「A4」、方向选「纵向」、比例 `100%`；如果有 Safari 选项，关闭「打印页眉和页脚」，打开「打印背景」。左下角「PDF」菜单选「存储为 PDF」。
   - **Firefox**：目标选「另存为 PDF」，在「更多设置」选「A4」「纵向」、比例 `100%`、边距「无」；关闭「打印页眉和页脚」，打开「打印背景」。不要打开简化打印或适合页面。
   - 若一开始已经没有日期和网址，也请记下；如果必须关闭选项才消失，同样请记下。不同版本的选项名称可能略有不同。
3. 保存到项目的 **`output/web-feasibility/manual/`**，按下表命名。打开 PDF（用 Mac「预览」即可），用 `⌘F` 找表中的词；选中文字复制，必要时粘回测试页的框里对照，不用再次生成。

| 顺序 | 样例与字体 | 正常应该看到什么（每条回答是 / 否） | 文件名（`浏览器` 换成 `safari` 或 `firefox`） |
| --- | --- | --- | --- |
| 1 | `web-01-report.md`，B | 能找到「青榆借阅归档」吗？复制 `⾨、門、门` 后三字仍和原文一样吗？ | `浏览器-B-web-01-report-md.pdf` |
| 2 | `web-02-table.md`，B | 续页有「班次／站点／值班组／交接说明」这行表头吗？有没有做到每个班次都不被切半，并能找到「值班归档完成」？ | `浏览器-B-web-02-table-md.pdf` |
| 3 | `breakflow-report-zh.html`，A | 「登记 → 选书 → 借出 → 归还」流程图有没有完整留在一页？能找到「记录口径」吗？复制页尾的「一」和「⼀」后，两个字仍和原文一样吗？ | `浏览器-A-breakflow-report-zh-html.pdf` |

**每份再回答四个是 / 否**：PDF 页数和网页写的页数相同吗？每页开头和网页相同吗？没有多出来的空白页吗？没有日期、网址或网页按钮吗？请同时交回网页显示的页数、PDF，以及「是否需要关掉页眉页脚选项」的答案。

## 给协作者：重跑检查

```sh
pnpm exec playwright install chromium
UNSLICED_PYTHON=experiments/web-feasibility/.venv/bin/python node experiments/web-feasibility/check.mjs
```

这会使用单独的短时本地地址，不用先启动手动测试的网页。可在命令末尾传一个或多个样例全名，只跑指定的样例；可加环境变量 `UNSLICED_WEB_CHANNEL=chrome` 改用已安装的 Chrome（仍是自动打印，输出另放 `chrome-auto/`）。任一检查有差异会返回非零，但保留报告和逐页图片。文件在 `output/web-feasibility/`。整批检查才写 `metrics.json`，指定样例写 `metrics-partial.json`。

手动 PDF 保存后，例：网页显示 2 页，可执行下面的命令；输出页数、空白页、纸张和与 Chromium 参照的文字差异。Safari/Firefox 若自己在不同位置分页，和 Chromium 的表头、每页文字也可能不同；这不单独证明它们漏字。

```sh
UNSLICED_PYTHON=experiments/web-feasibility/.venv/bin/python node experiments/web-feasibility/check-manual.mjs safari B web-02-table.md 2
```

只改页面代码、字体已切好时，可给 `build.mjs` 加 `--reuse-fonts`。`dist/` 不入库；构建会把仓库的 BreakFlow MIT 声明和字体 `OFL.txt` 带进去。已有 HTML 仅用于测试，构建时嵌入同目录的样式，把两张外链 SVG 转为内嵌 PNG，以符合 MCP 不加载外部资源的规则。网页用户只接受 Markdown，禁止原样插入 HTML，以及外链或本地图片。
