"""Publish the validated pnpm acceptance --sweep results as paired page images."""

import json
import math
from collections import defaultdict
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
output = root / "output/acceptance"
dest = root / "docs/comparison"
font_path = root / "packages/playwright/assets/fonts/KerfSansSC.ttf"
font = ImageFont.truetype(str(font_path), 21)
large = ImageFont.truetype(str(font_path), 30)
small = ImageFont.truetype(str(font_path), 16)
names = {
    "balanced-sections": "固定高度段落", "block-limit": "501 个内容块",
    "breakflow-report-zh": "中文报告", "invoice": "服务发票",
    "layout-stress": "图表与密集标题", "report-genius-factory": "天才工厂报告",
    "root-font-size": "继承字号", "root-text": "容器中的裸文本",
    "table-small": "3 行小表", "table-medium": "15 行中表", "table-long": "60 行长表",
    "table-multiline": "多行文字单元格", "table-heading": "表前标题与说明",
}


def sheet(stem, rows, sweep):
    width = 560
    height = round(width * 297 / 210)
    gutter, top, band = 20, 108, 36
    canvas = Image.new("RGB", (gutter + len(rows) * (width + gutter),
                               top + max(r["pages"] for r in rows) * (height + band + gutter)), "#edf1f2")
    draw = ImageDraw.Draw(canvas)
    draw.text((gutter, 10), names.get(stem, stem), font=large, fill="#172e37")
    for col, row in enumerate(rows):
        x = gutter + col * (width + gutter)
        title = (f"拆分惩罚 · {row['penalty']} 行" if sweep else
                 ("全局最优" if row["strategy"] == "optimal" else "贪心"))
        draw.text((x, 58), f"{title}   /   {row['pages']} 页", font=font, fill="#205956")
        for i, file in enumerate(row["images"]):
            y = top + i * (height + band + gutter)
            draw.text((x, y), f"第 {i+1} 页    留白 {row['whitespace'][i]}", font=small, fill="#31454e")
            with Image.open(Path(row["directory"]) / file) as image:
                canvas.paste(image.convert("RGB").resize((width, height), Image.Resampling.LANCZOS), (x, y + band))
    name = stem + ("-penalties" if sweep else "") + ".png"
    canvas.save(dest / name, optimize=True)
    return name


def figures():
    data = json.loads((output / "metrics.json").read_text())
    if not data["sweep"] or any(r["details"] for r in data["rows"] + data["sweep"]):
        raise ValueError("Run pnpm acceptance --sweep successfully before publishing images.")
    dest.mkdir(exist_ok=True, parents=True)
    docs = defaultdict(list)
    trials = defaultdict(list)
    for row in data["rows"]:
        docs[Path(row["filename"]).stem].append(row)
    for row in data["sweep"]:
        trials[Path(row["filename"]).stem].append(row)
    lines = ["# Kerf 分页对比", "", "每张图从上到下排列同一份文档的各页。灰色空位表示该版本已结束。"
             "留白以分页时测得的可排版高度计算，末页留白不计代价。", "",
             "| 样例 | 贪心、最优逐页图 | 总代价（贪心 / 最优） | 页数（贪心 / 最优） |",
             "| --- | --- | ---: | ---: |"]
    for stem, rows in docs.items():
        name = sheet(stem, rows, False)
        costs = " / ".join(f"{row['cost']:.2f}" for row in rows)
        pages = " / ".join(str(row["pages"]) for row in rows)
        lines.append(f"| {names.get(stem, stem)} | [打开图片]({name}) | {costs} | {pages} |")
    lines += ["", "## 拆分惩罚", "", "每格给出每部分的数据行数。表头单独计高。四列使用相同的输入和字体。", "",
              "| 样例 | 四档逐页图 | 0 行 | 15 行 | 30 行 | 45 行 | 改为整表时的临界值 |",
              "| --- | --- | --- | --- | --- | --- | --- |"]
    for stem, rows in trials.items():
        name = sheet(stem, rows, True)
        parts = ["、".join("+".join(map(str, part)) for part in row["parts"]) or "整表" for row in rows]
        threshold = "四档均相同"
        # If the free-split optimum uses one cut, all plans with more cuts
        # remain dominated for every nonnegative charge. Compare the two intercepts.
        if rows[0]["cuts"] == 1 and rows[-1]["cuts"] == 0:
            delta = rows[-1]["cost"] - rows[0]["cost"]
            threshold = f"约 {2 + math.log1p(delta) / math.log(1.18):.1f} 行"
        lines.append(f"| {names[stem]} | [打开图片]({name}) | " + " | ".join(parts) + f" | {threshold} |")
    lines += ["", "临界值由两种排法在拆表免费时的代价差换算。低于临界值选拆表，高于临界值保留整表。"
              "数值对应本次生成图片的浏览器和字体。", "",
              "整套默认对比与四档实验均通过文字、页边界、页底标题和数据行核对。"
              "两项故障注入均触发验收错误。", ""]
    (dest / "README.md").write_text("\n".join(lines))


if __name__ == "__main__":
    figures()
