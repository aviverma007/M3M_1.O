"""Common Area pages -> summary.commonAreaData (+ Req: benchmark answers -> inferred Common Design catalogue)"""
from ._spec_common import CFG, parse_room_tables, sections_to_data

cfg = CFG['commonAreaData']
CAT_KEY = {'premium': 'premiumAns', 'affluent': 'affluentAns', 'hi_street': 'hiStreetAns', 'enclosed_mall': 'enclosedMallAns'}


def parse(pages, ctx):
    notes = []
    if not pages or any('No Common Area specifications configured' in t['text'] for p in pages for t in p.texts):
        return {'summary': {}, 'notes': notes}
    ans_key = CAT_KEY.get(str(ctx['project'].get('category', '')).lower(), 'midEndAns')
    reqs = {}  # (chapterNumber, sectionTitle) -> {fieldName: [answers]}

    def on_cell(chapter, room, key, cell):
        if not cell.get('req'): return
        lst = [x for x in cell['req'][len('Req: '):].split(', ')] if cell['req'].startswith('Req: ') else [cell['req']]
        num = cfg['chapterNumber'][chapter]
        title = cfg['sectionTitles'][str(num)].get(room, room)
        if chapter == 'ceiling': title += ' Ceiling'
        reqs.setdefault((num, title), {})[key] = lst

    data = sections_to_data(cfg, parse_room_tables(pages), notes, on_cell)
    # catalogue in GET /project/:p/module/:m/chapter shape (only the fields that carried a benchmark)
    chapters, fid = {}, 1
    for (num, title), fields in reqs.items():
        ch = chapters.setdefault(num, dict(id=num, moduleId=3, chapterNumber=num, title=f'Ch {num}', chapterSections=[]))
        sec = dict(id=len(ch['chapterSections']) + 1 + num * 100, title=title, sectionFields=[])
        for k, lst in fields.items():
            f = dict(id=fid, fieldName=k, fieldType='select', midEndAns=[], premiumAns=[], affluentAns=[], hiStreetAns=[], enclosedMallAns=[], sectionFieldOptions=[])
            f[ans_key] = lst; fid += 1
            sec['sectionFields'].append(f)
        ch['chapterSections'].append(sec)
    inferred = {'moduleChapters': {'3': [chapters[k] for k in sorted(chapters)]}} if chapters else {}
    return {'summary': {'commonAreaData': data}, 'inferred': inferred, 'notes': notes}
