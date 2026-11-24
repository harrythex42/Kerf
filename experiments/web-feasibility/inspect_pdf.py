"""Check physical pages, searchable text and output images (including manual PDFs)."""
import json
import sys
from pathlib import Path

import pymupdf
from pypdf import PdfReader

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from verify_pdf_text import compact

ref = json.load(sys.stdin)
filename, prefix = sys.argv[1:3]
texts = [page.extract_text() for page in PdfReader(filename).pages]
with pymupdf.open(filename) as pdf:
    blank, mismatched, not_searchable, non_a4, image_counts = [], [], [], [], []
    for n, page in enumerate(pdf):
        pixmap = page.get_pixmap(dpi=120)
        pixmap.save(f"{prefix}-{n + 1:0{len(str(len(pdf)))}d}.png")
        if not texts[n].strip() and min(pixmap.samples) == 255:
            blank.append(n + 1)
        image_counts.append(len(page.get_image_info()))
        if abs(page.rect.width - 595.28) > 1.5 or abs(page.rect.height - 841.89) > 1.5:
            non_a4.append(n + 1)
        if n < len(ref):
            if compact(texts[n]) != compact(ref[n]["text"]):
                mismatched.append(n + 1)
            if ref[n]["anchors"] and not any(page.search_for(anchor) for anchor in ref[n]["anchors"]):
                not_searchable.append(n + 1)
    print(json.dumps(dict(pages=len(pdf), blank=blank, pageTextMismatch=mismatched,
                          notSearchable=not_searchable, nonA4=non_a4, imageCounts=image_counts)))
