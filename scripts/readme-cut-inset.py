"""Build the Northline row close-ups and bilingual README comparisons.

Run scripts/readme-comparison.mjs first. Requires Pillow.
"""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

root = Path(__file__).resolve().parents[1]
out = root / "output/readme-comparison/northline-quarterly"
font_path = root / "packages/playwright/assets/fonts/UnslicedSansSC.ttf"
heading = ImageFont.truetype(str(font_path), 28)
label = ImageFont.truetype(str(font_path), 22)
red = "#bd292f"
ink = "#183845"


def page(mode, number, scale=1):
    directory = out if scale == 1 else out / "hi-res"
    with Image.open(directory / mode / f"page-{number}.png") as image:
        return image.convert("RGB")


def panel(mode, title, scale=1, chinese=False):
    canvas = Image.new("RGB", (508 * scale, 680 * scale), "#f1f6f7")
    draw = ImageDraw.Draw(canvas)
    title_font = heading if scale == 1 else ImageFont.truetype(str(font_path), 28 * scale)
    label_font = label if scale == 1 else ImageFont.truetype(str(font_path), 22 * scale)
    draw.text((18 * scale, 14 * scale), title, font=title_font, fill=ink)
    page_y, thumb_height = (74, 315) if scale == 1 else (84, 312)
    for i in range(2):
        image = page(mode, i + 1, scale)
        image.thumbnail((222 * scale, thumb_height * scale), Image.Resampling.LANCZOS)
        x = (20 + 245 * i) * scale
        canvas.paste(ImageOps.expand(image, border=scale, fill="#9cb4bc"), (x, page_y * scale))
        draw.text((x, 46 * scale), f"第 {i + 1} 页" if chinese else f"Page {i + 1}",
                  font=label_font, fill=ink)
    draw.text((20 * scale, 393 * scale), "放大：3 May 表格行" if chinese else "Zoom: the 3 May table row",
              font=title_font, fill=ink)
    return canvas, draw


def zoom(canvas, draw, img, box, y, marked, color, scale=1):
    crop = img.crop(tuple(value * scale for value in box))
    width = 462 * scale
    scaled = crop.resize((width, round(crop.height * width / crop.width)), Image.Resampling.LANCZOS)
    x, y = 22 * scale, y * scale
    canvas.paste(scaled, (x, y))
    draw.rectangle((x, y, x + width, y + scaled.height), outline="#9cb4bc", width=scale)
    top, bottom = (round(value * scale * width / crop.width) for value in marked)
    draw.rectangle((x + scale, y + top, 20 * scale + width, y + bottom), outline=color, width=4 * scale)


sliced, draw = panel("jspdf", "jsPDF · fixed slices")
first, second = page("jspdf", 1), page("jspdf", 2)
x = round(first.width * 15 / 210)
margin = round(first.height * 15 / 297)
boundary = first.height - margin
draw.text((22, 438), "Page 1 ends halfway through the row", font=label, fill=red)
zoom(sliced, draw, first, (x, boundary - 47, x + 295, boundary + 6), 469, (26, 51), red)
draw.text((22, 562), "Page 2 starts with the remainder", font=label, fill=red)
zoom(sliced, draw, second, (x, margin - 4, x + 295, margin + 35), 595, (1, 20), red)
sliced.save(out / "readme-jspdf-inset.png", optimize=True)

uncut, draw = panel("optimal", "Unsliced")
second = page("optimal", 2)
x = round(second.width * 15 / 210)
baseline = round(second.height * 250 / 841.92)
draw.text((22, 438), "Page 2 keeps the entire row together", font=label, fill=ink)
zoom(uncut, draw, second, (x, baseline - 50, x + 295, baseline + 56), 469, (35, 67), "#08776e")
uncut.save(out / "readme-unsliced-inset.png", optimize=True)

both = Image.new("RGB", (1032, 680), "#d9e4e8")
both.paste(sliced, (0, 0))
both.paste(uncut, (524, 0))
both.save(out / "readme-two-columns.png", optimize=True)

cedarway = out.parent / "cedarway-readiness-report"
with Image.open(cedarway / "greedy.png") as greedy, Image.open(cedarway / "optimal.png") as optimal:
    paired = Image.new("RGB", (greedy.width + optimal.width + 16, max(greedy.height, optimal.height)), "#d9e4e8")
    paired.paste(greedy, (0, 0))
    paired.paste(optimal, (greedy.width + 16, 0))
    paired.save(cedarway / "greedy-vs-global.png", optimize=True)


def hero(chinese):
    scale = 2
    caption = ImageFont.truetype(str(font_path), 22 * scale)
    left, draw = panel("jspdf", "jsPDF 固定切片" if chinese else "jsPDF · fixed slices", scale, chinese)
    first, second = (page("jspdf", n, scale) for n in (1, 2))
    x = round(first.width / scale * 15 / 210)
    margin = round(first.height / scale * 15 / 297)
    boundary = round(first.height / scale) - margin
    draw.text((44, 870), "第 1 页在这一行中间结束" if chinese else "Page 1 ends halfway through the row",
              font=caption, fill=red)
    zoom(left, draw, first, (x, boundary - 47, x + 295, boundary + 6), 469, (26, 51), red, scale)
    draw.text((44, 1118), "第 2 页从剩下半行开始" if chinese else "Page 2 starts with the remainder",
              font=caption, fill=red)
    zoom(left, draw, second, (x, margin - 4, x + 295, margin + 35), 595, (1, 20), red, scale)

    right, draw = panel("optimal", "Unsliced", scale, chinese)
    second = page("optimal", 2, scale)
    x = round(second.width / scale * 15 / 210)
    baseline = round(second.height / scale * 250 / 841.92)
    draw.text((44, 870), "第 2 页保留整行" if chinese else "Page 2 keeps the entire row together",
              font=caption, fill=ink)
    zoom(right, draw, second, (x, baseline - 50, x + 295, baseline + 56), 469, (35, 67), "#08776e", scale)

    canvas = Image.new("RGB", (1032 * scale, 680 * scale), "#d9e4e8")
    canvas.paste(left, (0, 0))
    canvas.paste(right, (524 * scale, 0))
    return canvas


def invoice(rows, chinese):
    scale = 2
    width, page_width, page_height, gap, padding = 880, 270, 382, 16, 20
    row_height = page_height + 103
    canvas = Image.new("RGB", (width * scale, (2 * row_height + gap) * scale), "#d9e4e8")
    draw = ImageDraw.Draw(canvas)
    title_font = ImageFont.truetype(str(font_path), 28 * scale)
    label_font = ImageFont.truetype(str(font_path), 22 * scale)
    greedy = "逐页排" if chinese else "Page by page"

    for index, (name, row) in enumerate(zip((greedy, "Unsliced"), rows, strict=True)):
        y = index * (row_height + gap)
        draw.rectangle((0, y * scale, canvas.width - 1, (y + row_height) * scale - 1), fill="#f1f6f7")
        pages = row["pages"]
        title = f"{name} · {pages} 页" if chinese else f"{name} · {pages} pages"
        draw.text((padding * scale, (y + 10) * scale), title, font=title_font, fill=ink)
        row_width = pages * page_width + (pages - 1) * gap
        for i, (file, blank) in enumerate(zip(row["images"], row["whitespace"], strict=True)):
            x = (width - row_width) * scale // 2 + i * (page_width + gap) * scale
            text = f"第 {i + 1} 页 · 留白 {blank}" if chinese else f"Page {i + 1} · {blank} blank"
            draw.text((x, (y + 52) * scale), text, font=label_font, fill=ink)
            with Image.open(Path(row["directory"]) / file) as source:
                image = source.convert("RGB")
                image.thumbnail((page_width * scale, page_height * scale), Image.Resampling.LANCZOS)
            canvas.paste(ImageOps.expand(image, border=scale, fill="#9cb4bc"), (x, (y + 88) * scale))
    return canvas


metrics = json.loads((root / "output/acceptance/metrics.json").read_text(encoding="utf-8"))
rows = {row["strategy"]: row for row in metrics["rows"] if row["filename"] == "invoice.html"}
invoice_rows = [rows[strategy] for strategy in ("greedy-scored", "optimal")]
if metrics["paper"] != "A4" or any(row["details"] for row in invoice_rows):
    raise ValueError("Run the A4 acceptance checks successfully before generating the invoice images.")

images = root / "docs/images"
for chinese, suffix in [(False, ""), (True, "-zh")]:
    hero(chinese).save(images / f"hero-slices{suffix}.png", optimize=True)
    invoice(invoice_rows, chinese).save(images / f"invoice-pages{suffix}.png", optimize=True)
