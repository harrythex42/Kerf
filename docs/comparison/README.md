# Unsliced 分页对比

每张图从上到下排列同一份文档的各页。灰色空位表示该版本已结束。留白以分页时测得的可排版高度计算，末页留白不计代价。

[README 的切口对比](../../README.md#compare-pagination)和 [Cedarway 的两种分页对比](../optimal-pagination.md#greedy-vs-global-optimum)来自五份英文报告的实测。要重跑对比，在仓库根目录依次运行：

1. `pnpm acceptance` 和 `pnpm acceptance --letter-demo`，生成 A4 和 Letter 的 PDF、逐页图片和验收数据。发票的页数和留白取自 A4 验收的 `output/acceptance/metrics.json`。
2. `npm install --prefix output/readme-comparison/tools jspdf@4.2.0`，再运行 `node scripts/readme-comparison.mjs`。对比结果在 `output/readme-comparison/index.html`，Northline 的双倍分辨率逐页图在 `output/readme-comparison/northline-quarterly/hi-res/`。
3. 在验收所用的 Python 环境中安装 Pillow，然后运行 `python scripts/readme-cut-inset.py`。它会把英文和中文的首屏图 `hero-slices*.png` 及发票图 `invoice-pages*.png` 写入 `docs/images/`。旧版切口特写仍输出到 `output/readme-comparison/`，不会覆盖 `docs/images/` 中的旧图。

| 样例 | 贪心、最优逐页图 | 总代价（贪心 / 最优） | 页数（贪心 / 最优） |
| --- | --- | ---: | ---: |
| 固定高度段落 | [打开图片](balanced-sections.png) | 36.64 / 27.77 | 3 / 3 |
| 501 个内容块 | [打开图片](block-limit.png) | 7.60 / 7.60 | 1 / 1 |
| 中文报告 | [打开图片](breakflow-report-zh.png) | 15.31 / 15.31 | 2 / 2 |
| 服务发票 | [打开图片](invoice.png) | 541.87 / 22.88 | 3 / 2 |
| 图表与密集标题 | [打开图片](layout-stress.png) | 22.53 / 22.53 | 2 / 2 |
| 继承字号 | [打开图片](root-font-size.png) | 7.60 / 7.60 | 1 / 1 |
| 容器中的裸文本 | [打开图片](root-text.png) | 7.60 / 7.60 | 1 / 1 |
| 表前标题与说明 | [打开图片](table-heading.png) | 35.27 / 22.80 | 2 / 2 |
| 60 行长表 | [打开图片](table-long.png) | 38.00 / 38.00 | 3 / 3 |
| 15 行中表 | [打开图片](table-medium.png) | 50.42 / 22.80 | 2 / 2 |
| 多行文字单元格 | [打开图片](table-multiline.png) | 72.38 / 22.80 | 2 / 2 |
| 3 行小表 | [打开图片](table-small.png) | 15.99 / 15.99 | 2 / 2 |

## 拆分惩罚

每格给出每部分的数据行数。表头单独计高。四列使用相同的输入和字体。

| 样例 | 四档逐页图 | 0 行 | 15 行 | 30 行 | 45 行 | 改为整表时的临界值 |
| --- | --- | --- | --- | --- | --- | --- |
| 服务发票 | [打开图片](invoice-penalties.png) | 12+2 | 12+2 | 12+2 | 整表 | 约 39.9 行 |
| 表前标题与说明 | [打开图片](table-heading-penalties.png) | 7+7 | 7+7 | 整表 | 整表 | 约 20.4 行 |
| 60 行长表 | [打开图片](table-long-penalties.png) | 16+22+22 | 16+22+22 | 16+22+22 | 16+22+22 | 四档均相同 |
| 15 行中表 | [打开图片](table-medium-penalties.png) | 11+4 | 11+4 | 整表 | 整表 | 约 23.7 行 |
| 多行文字单元格 | [打开图片](table-multiline-penalties.png) | 8+4 | 8+4 | 整表 | 整表 | 约 26.6 行 |
| 3 行小表 | [打开图片](table-small-penalties.png) | 整表 | 整表 | 整表 | 整表 | 四档均相同 |

临界值由两种排法在拆表免费时的代价差换算。低于临界值选拆表，高于临界值保留整表。数值对应本次生成图片的浏览器和字体。

整套默认对比与四档实验均通过文字、页边界、页底标题和数据行核对。两项故障注入均触发验收错误。
