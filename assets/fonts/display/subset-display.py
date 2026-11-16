from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib.instancer import instantiateVariableFont
import json
root=Path(__file__).resolve().parent
project=root.parents[2]
text=''.join((project/name).read_text() for name in ['template.html','game.js','objects.js'])
text+='隔窗有雨窗裡的燈今晚先到這裡雨還在等你留在房間裡的話'
chars=set(text)|set(chr(i) for i in range(32,127))
report=[]
specs=[('noto-serif-tc-source.ttf','window-display.woff2',chars,'Window Rain Display','Black',900),('oswald-source.ttf','window-condensed.woff2',set('in the mood for love'),'Window Rain Condensed','Light',300)]
for source,target,requested,family,style,weight in specs:
    font=TTFont(root/source)
    cmap=font.getBestCmap()
    missing=sorted(c for c in requested if 0x3400<=ord(c)<=0x9fff and ord(c) not in cmap)
    if missing: raise ValueError(f'{source} missing CJK {missing}')
    supported=sorted(ord(c) for c in requested if ord(c) in cmap)
    opts=subset.Options(); opts.flavor='woff2'; opts.name_IDs=['*']; opts.name_legacy=True; opts.name_languages=['*']; opts.notdef_glyph=True; opts.notdef_outline=True
    worker=subset.Subsetter(options=opts); worker.populate(unicodes=supported); worker.subset(font)
    if 'fvar' in font: font=instantiateVariableFont(font,{'wght':weight},inplace=True)
    ps=family.replace(' ','')+'-'+style
    names={1:family,2:style,3:ps+'-Subset',4:family+' '+style,6:ps,16:family,17:style}
    for rec in font['name'].names:
        if rec.nameID in names: rec.string=names[rec.nameID].encode(rec.getEncoding(),errors='replace')
    font.flavor='woff2'; font.save(root/target)
    check=TTFont(root/target)
    assert set(supported)<=set(check.getBestCmap())
    report.append({'file':target,'source':source,'family':family,'style':style,'weight':weight,'supported_characters':len(supported),'bytes':(root/target).stat().st_size,'missing_cjk':missing,'source_files':['template.html','game.js','objects.js'] if weight==900 else ['in the mood for love']})
(root/'subset-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False))
