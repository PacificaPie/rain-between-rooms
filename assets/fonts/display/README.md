# Display typography — 隔窗有雨

Active opening and all h1/h2 headings use a real 900-weight Ming serif, replacing the prior calligraphic experiment. Chinese title is a single tight horizontal line; the English line is centered above in a narrow upright retro face. Body text remains the separate Rain Hand font.

- **Noto Serif TC**, weight 900 (Black), official source: https://github.com/google/fonts/tree/main/ofl/notoseriftc
- **Oswald**, weight 300 (Light), official source: https://github.com/google/fonts/tree/main/ofl/oswald
- Both are SIL Open Font License 1.1; original licenses are saved here and embedded in the standalone template.
- Downloaded 2026-11-16 from `raw.githubusercontent.com/google/fonts/main/ofl/...`.
- Subsets renamed **Window Rain Display** and **Window Rain Condensed**. No proprietary movie title font was used.
- `window-display.woff2` covers all supported characters from `template.html`, `game.js`, and `objects.js`, not just the opening. Traditional Chinese coverage was checked before and after subsetting; see `subset-report.json`.
- `subset-display.py` rebuilds font resources; run with fontTools and Brotli available. The resulting WOFF2 files are directly embedded in `template.html`, so standalone builds need no font network requests or build changes.

Layout keeps the existing responsive opening size caps and controls. The opening h1 is mildly skewed -5 degrees; menu/ending headings -4 degrees; paper headings -3 degrees. Heading typography does not affect body copy, puzzle numerals, h3, or small captions.
