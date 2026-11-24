"""Make existing HTML fixtures self-contained for MCP's no-external-assets rules."""
import base64
import re
import sys
from pathlib import Path

import pymupdf


def local_file(sample, url):
    path = (sample.parent / url).resolve()
    if not path.is_relative_to(sample.parent.resolve()):
        raise ValueError(f"Not a local fixture asset: {url}")
    return path


def inline(sample):
    html = sample.read_text(encoding="utf-8")
    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">\s*',
                  lambda m: "<style>" + local_file(sample, m[1]).read_text(encoding="utf-8") + "</style>", html)

    def rasterize(match):
        with pymupdf.open(local_file(sample, match[1])) as svg:
            png = svg[0].get_pixmap().tobytes("png")
        return 'src="data:image/png;base64,' + base64.b64encode(png).decode("ascii") + '"'

    return re.sub(r'<img\s+src="([^"]+\.svg)"', lambda m: "<img " + rasterize(m), html)


if __name__ == "__main__":
    for filename in sorted(Path(sys.argv[1]).rglob("*.html")):
        dest = Path(sys.argv[2]) / filename.relative_to(sys.argv[1])
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(inline(filename), encoding="utf-8")
