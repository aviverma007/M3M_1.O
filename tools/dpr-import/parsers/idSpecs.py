"""ID Specifications pages -> summary.idSpecificationsData"""
import re
from ._spec_common import CFG, parse_room_tables, sections_to_data, key_for_label, room_id_for, join_lines, split_multi, RE_FILL, _text

cfg = CFG['idSpecificationsData']


def _kitchen(pages, notes):
    """Kitchen Goods pages: group rows (room) with label/value rows -> {'kitchen-goods_<room>': {...}}"""
    data, cur, row = {}, None, None
    for p in pages:
        mode = None
        for l in p.ops:
            m = RE_FILL.match(l)
            if m and abs(float(m[1]) - 35.0) < 0.1:
                fill = m[5]
                if fill == '#DCE6F0': mode = 'group'; continue
                if fill in ('#FFFFFF', '#F5F7FA') and cur is not None:
                    mode = 'row'; row = dict(label=[], value=[]); cur['rows'].append(row); continue
                if fill == '#1A3566': mode = 'head'; continue
            t = _text(l)
            if not t or t['y'] < 62 or t['y'] > 570: continue
            if mode == 'group' and t['font'] == 'Bold':
                name = re.sub(r'\s*\(cont\.\)$', '', t['text'])
                if cur is not None and cur['name'] == name: continue
                cur = dict(name=name, rows=[]); data.setdefault('_groups', []).append(cur); mode = None; continue
            if mode == 'row':
                (row['label'] if t['x'] < 300 else row['value']).append(t['text'])
    out = {}
    for g in data.get('_groups', []):
        rid, ok = room_id_for(cfg, 'kitchen-goods', g['name'])
        if not ok: notes.append(f'Kitchen Goods: unknown item "{g["name"]}" stored as "{rid}"')
        entry = {}
        for r in g['rows']:
            k = key_for_label(cfg, join_lines(r['label']))
            v = join_lines(r['value'])
            entry[k] = split_multi(cfg, k, v) if k in cfg['arrayKeys'] else v
        out[f'kitchen-goods_{rid}'] = entry
    return out


def parse(pages, ctx):
    notes = []
    if not pages or any('No ID specifications configured' in t['text'] for p in pages for t in p.texts):
        return {'summary': {}, 'notes': notes}
    tables = [p for p in pages if 'kitchen goods' not in p.title.lower()]
    kitchen = [p for p in pages if 'kitchen goods' in p.title.lower()]
    data = sections_to_data(cfg, parse_room_tables(tables), notes)
    data.update(_kitchen(kitchen, notes))
    return {'summary': {'idSpecificationsData': data}, 'notes': notes}
