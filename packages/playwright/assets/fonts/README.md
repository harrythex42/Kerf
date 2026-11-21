# Kerf Sans SC

Kerf Sans SC is based on the regular-weight Noto Sans SC TrueType font served by
Google Fonts. The original font maps some different Unicode characters to
the same glyph. Chromium can then choose a compatibility character in the
PDF's text map. Kerf Sans SC gives those aliases distinct glyph IDs while
retaining their outlines. The font is renamed to identify this derivative.

[OFL.txt](OFL.txt) contains the original copyright notice and the SIL Open Font
License 1.1, which also applies to the derivative.

- [Original TrueType download](https://fonts.gstatic.com/s/notosanssc/v41/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_FnYw.ttf)
- Source SHA-256 `450625c8d46ab3df97b7904ded955ec2746d17ec76740cb1e91d1ba63a0f89af`
- Kerf Sans SC SHA-256 `f7d08e9508f439729b097ce99f1d8a6b11ceea5f08b611dd530d95804083a62f`
- Regenerate with `python3 scripts/prepare_cjk_font.py source.ttf packages/playwright/assets/fonts/KerfSansSC.ttf` using FontTools 4.68.0.
