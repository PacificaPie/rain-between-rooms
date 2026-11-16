"""Rebuild the original game's local-use font subset; needs fonttools and brotli."""
from pathlib import Path
import json
from fontTools import subset
from fontTools.ttLib import TTFont

font_dir = Path(__file__).resolve().parent
project = font_dir.parent.parent
text = ''.join((project / name).read_text() for name in ['game.js', 'objects.js', 'template.html'])
# Keep ASCII and the actual text's CJK, punctuation and symbols; source-code words
# introduce no additional CJK and avoid brittle extraction from template literals.
characters = set(text) | set(chr(i) for i in range(32, 127))
characters = {c for c in characters if ord(c) >= 32}
font = TTFont(font_dir / 'source-regular.ttf')
available = font.getBestCmap()
missing_cjk = [c for c in sorted(characters) if '\u3400' <= c <= '\u9fff' and ord(c) not in available]
if missing_cjk:
    raise RuntimeError('Source font lacks CJK characters: ' + ''.join(missing_cjk))
opts = subset.Options()
opts.flavor = 'woff2'
opts.layout_features = ['kern', 'liga', 'locl']
opts.name_IDs = ['*']
opts.name_legacy = True
opts.name_languages = ['*']
opts.notdef_glyph = True
opts.notdef_outline = True
worker = subset.Subsetter(options=opts)
worker.populate(unicodes={ord(c) for c in characters if ord(c) in available})
worker.subset(font)
# Respect the upstream request not to use its author brand in derivative names.
names = {1: 'Rain Between Rooms Hand', 2: 'Regular', 3: 'RainBetweenRoomsHand-Regular-Subset',
         4: 'Rain Between Rooms Hand Regular', 6: 'RainBetweenRoomsHand-Regular',
         16: 'Rain Between Rooms Hand', 17: 'Regular'}
for record in font['name'].names:
    if record.nameID in names:
        record.string = names[record.nameID].encode(record.getEncoding(), errors='replace')
font.flavor = 'woff2'
output = font_dir / 'rain-hand.woff2'
font.save(output)
check = TTFont(output)
coverage = check.getBestCmap()
missing = [c for c in sorted(characters) if '\u3400' <= c <= '\u9fff' and ord(c) not in coverage]
assert not missing, missing
report = {'bytes': output.stat().st_size, 'glyphs': len(coverage),
          'cjk_characters': len([c for c in characters if '\u3400' <= c <= '\u9fff']),
          'missing_cjk': missing, 'family': 'Rain Between Rooms Hand'}
(font_dir / 'subset-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps(report, ensure_ascii=False))
