"""Measure bottom blank space inside the same PDF content box for each export."""
import json
import sys

import pymupdf

margin = 15 * 72 / 25.4
results = []
with pymupdf.open(sys.argv[1]) as pdf:
    for page in pdf:
        clip = pymupdf.Rect(margin, margin, page.rect.width - margin, page.rect.height - margin)
        pixmap = page.get_pixmap(dpi=96, clip=clip, colorspace=pymupdf.csGRAY)
        blank = 0
        pixels = pixmap.samples_mv
        for y in range(pixmap.height - 1, -1, -1):
            row = pixels[y * pixmap.stride:y * pixmap.stride + pixmap.width]
            if sum(1 for pixel in row if pixel < 248) >= 3:
                break
            blank += 1
        results.append(round(100 * blank / pixmap.height, 1))
print(json.dumps(results))
