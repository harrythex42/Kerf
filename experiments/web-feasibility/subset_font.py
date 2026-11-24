"""Split the existing copy-friendly font, not upstream Noto Sans SC."""
import json
import shutil
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "packages/playwright/assets/fonts/UnslicedSansSC.ttf"
# Same ranges as the MCP font face. Leave Latin to the document's own font.
RANGES = [(0x2E80, 0x2FFF), (0x3000, 0x303F), (0x31C0, 0x31EF),
          (0x3400, 0x4DBF), (0x4E00, 0x9FFF), (0xF900, 0xFAFF),
          (0xFE30, 0xFE4F), (0xFF00, 0xFFEF), (0x20000, 0x323AF)]


def css_ranges(points):
    groups = []
    for cp in sorted(points):
        if groups and groups[-1][-1] + 1 == cp:
            groups[-1][-1] = cp
        else:
            groups.append([cp, cp])
    return ",".join(f"U+{a:X}" if a == b else f"U+{a:X}-{b:X}" for a, b in groups)


def split(destination):
    destination.mkdir(parents=True, exist_ok=True)
    original = TTFont(SOURCE)
    cmap = original.getBestCmap()
    mapped = {cp for cp in cmap if any(a <= cp <= b for a, b in RANGES)}
    assert len({cmap[cp] for cp in mapped}) == len(mapped), "Original aliases share a glyph"
    # GB2312 level 1 is a fixed, sample-independent set of common Han characters.
    common = {ord(bytes([row, cell]).decode("gb2312")) for row in range(0xB0, 0xD7 + 1)
              for cell in range(0xA1, (0xF9 if row == 0xD7 else 0xFE) + 1)}
    common |= {cp for cp in mapped if cp < 0x3400 or 0xFE30 <= cp <= 0xFFEF}
    common &= mapped
    rest = sorted(mapped - common)
    groups = [common] + [rest[i:i + 512] for i in range(0, len(rest), 512)]
    for index, points in enumerate(groups):
        filename = f"sc-{index:02d}.woff2"
        font = TTFont(SOURCE, recalcTimestamp=False)
        options = subset.Options()
        options.glyph_names = True
        options.layout_features = ["*"]
        cutter = subset.Subsetter(options=options)
        cutter.populate(unicodes=points)
        cutter.subset(font)
        font.flavor = "woff2"
        font.save(destination / filename)
        with TTFont(destination / filename) as reopened:
            actual = reopened.getBestCmap()
            assert actual == {cp: cmap[cp] for cp in points}, filename
            for glyph in actual.values():
                assert reopened["hmtx"][glyph] == original["hmtx"][glyph], glyph
    assert set().union(*map(set, groups)) == mapped and sum(map(len, groups)) == len(mapped)
    (destination / "ranges.json").write_text(json.dumps(
        {"mcp": css_ranges([cp for a, b in RANGES for cp in range(a, b + 1)]),
         "parts": [css_ranges(points) for points in groups]}), encoding="utf-8")
    shutil.copyfile(SOURCE.with_name("OFL.txt"), destination / "OFL.txt")


if __name__ == "__main__":
    split(Path(sys.argv[1]))
