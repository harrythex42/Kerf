"""Create a PDF text-friendly derivative of the upstream Noto Sans SC TTF.

Requires fonttools. Usage: python prepare_cjk_font.py upstream.ttf UnslicedSansSC.ttf
"""

from collections import defaultdict
from copy import copy
from pathlib import Path
import sys

from fontTools.ttLib import TTFont


def font_with_distinct_characters(source: Path, destination: Path) -> None:
    font = TTFont(source, recalcTimestamp=False)
    cmaps = [
        table.cmap for table in font["cmap"].tables
        if table.isUnicode() and hasattr(table, "cmap")
    ]
    by_glyph = defaultdict(set)
    for mapping in cmaps:
        for character, glyph in mapping.items():
            by_glyph[glyph].add(character)

    # Chromium's PDF character map can reuse one Unicode value per glyph.
    # Give each alias its own glyph ID while retaining the original outline.
    order = list(font.getGlyphOrder())
    glyf = font["glyf"]
    metrics = [font[tag].metrics for tag in ("hmtx", "vmtx") if tag in font]
    for glyph, characters in by_glyph.items():
        if len(characters) == 1:
            continue
        # Keep the main ideograph in the original font's shaping tables.
        ranked = sorted(characters, key=lambda cp: (not (0x3400 <= cp <= 0x9FFF), cp))
        for character in ranked[1:]:
            alternate = f"unsliced_uni{character:X}_{len(order)}"
            glyf[alternate] = copy(glyf[glyph])
            for table in metrics:
                table[alternate] = table[glyph]
            order.append(alternate)
            for mapping in cmaps:
                if mapping.get(character) == glyph:
                    mapping[character] = alternate

    font.setGlyphOrder(order)
    names = {
        1: "Unsliced Sans SC", 2: "Regular", 3: "Unsliced Sans SC Regular",
        4: "Unsliced Sans SC Regular", 6: "UnslicedSansSC-Regular",
        16: "Unsliced Sans SC", 17: "Regular",
    }
    name_table = font["name"]
    for record in list(name_table.names):
        if record.nameID in names:
            name_table.setName(names[record.nameID], record.nameID, record.platformID,
                               record.platEncID, record.langID)
    font.save(destination)


if __name__ == "__main__":
    font_with_distinct_characters(Path(sys.argv[1]), Path(sys.argv[2]))
