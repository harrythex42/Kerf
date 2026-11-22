"""Annotate the verified 3 May row in the Northline comparison PNGs.

Run scripts/readme-comparison.mjs first. Requires Pillow.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

root = Path(__file__).resolve().parents[1]
out = root / "output/readme-comparison/northline-quarterly"
font_path = root / "packages/playwright/assets/fonts/UnslicedSansSC.ttf"
heading = ImageFont.truetype(str(font_path), 28)
label = ImageFont.truetype(str(font_path), 22)
red = "#bd292f"
ink = "#183845"


def page(mode, number):
    return Image.open(out / mode / f"page-{number}.png").convert("RGB")


def panel(mode, title):
    canvas = Image.new("RGB", (508, 680), "#f1f6f7")
    draw = ImageDraw.Draw(canvas)
    draw.text((18, 14), title, font=heading, fill=ink)
    for i in range(2):
        image = page(mode, i + 1)
        image.thumbnail((222, 315), Image.Resampling.LANCZOS)
        x = 20 + 245 * i
        canvas.paste(ImageOps.expand(image, border=1, fill="#9cb4bc"), (x, 74))
        draw.text((x, 46), f"Page {i + 1}", font=label, fill=ink)
    draw.text((20, 393), "Zoom: the 3 May table row", font=heading, fill=ink)
    return canvas, draw


def zoom(canvas, draw, img, box, y, marked, color):
    crop = img.crop(box)
    width = 462
    scaled = crop.resize((width, round(crop.height * width / crop.width)), Image.Resampling.LANCZOS)
    canvas.paste(scaled, (22, y))
    draw.rectangle((22, y, 22 + width, y + scaled.height), outline="#9cb4bc", width=1)
    top, bottom = (round(value * width / crop.width) for value in marked)
    draw.rectangle((23, y + top, 20 + width, y + bottom), outline=color, width=4)


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
