"""Contracting Strategy -> summary.contractingStrategyData {contractors, packages, availableElements}"""
from .cs_common import fills, header_rects, header_columns, join, cell_texts, undash

GROUP_FILL = '#EEF2F8'
DEFAULT_ELEMENTS = ['Facade', 'Fire Fighting', 'Lift & Escalator', 'HVAC', 'Structure']


def grouped(page, n_group):
    """-> list of groups {cells:[..], rows:[[..]]} in page order"""
    hdr = header_rects(page)[0]
    xs, labels = header_columns(page, hdr)
    right = hdr['x'] + hdr['w']
    row_x = xs[n_group]
    fs = fills(page)
    gcells = [f for f in fs if f['fill'] == GROUP_FILL and abs(f['x'] - xs[0]) < 0.05]
    rows = [f for f in fs if f['fill'] in ('#FFFFFF', '#F0F4F8') and abs(f['x'] - row_x) < 0.05]
    groups = []
    for g in sorted(gcells, key=lambda f: f['y']):
        cells = []
        for i in range(n_group):
            x2 = xs[i + 1]
            cells.append(undash(join(cell_texts(page, xs[i], x2, g['y'], g['y'] + g['h']))))
        grows = []
        for r in sorted(rows, key=lambda f: f['y']):
            if g['y'] - 0.05 <= r['y'] < g['y'] + g['h'] - 0.05:
                c = []
                for i in range(n_group, len(xs)):
                    x2 = xs[i + 1] if i + 1 < len(xs) else right
                    c.append(undash(join(cell_texts(page, xs[i], x2, r['y'], r['y'] + r['h']))))
                grows.append(c)
        groups.append(dict(cells=cells, rows=grows))
    return labels, groups


def parse(pages, ctx):
    pk_groups, ct_groups = [], []
    for p in pages:
        if not header_rects(p):
            continue  # blank page = nothing configured
        if 'Packages' in p.title:
            _, gs = grouped(p, 2)
            for g in gs:
                if pk_groups and pk_groups[-1]['cells'] == g['cells'] and p.no != pk_groups[-1].get('page'):
                    pk_groups[-1]['rows'] += g['rows']; pk_groups[-1]['page'] = p.no
                else:
                    g['page'] = p.no; pk_groups.append(g)
        elif 'Contractors' in p.title:
            _, gs = grouped(p, 1)
            for g in gs:
                if ct_groups and ct_groups[-1]['cells'] == g['cells'] and p.no != ct_groups[-1].get('page'):
                    ct_groups[-1]['rows'] += g['rows']; ct_groups[-1]['page'] = p.no
                else:
                    g['page'] = p.no; ct_groups.append(g)
    if not pk_groups and not ct_groups:
        return {'summary': {}, 'notes': ['no contracting strategy configured']}
    packages, eid = [], 1
    for i, g in enumerate(pk_groups):
        name, ctype = (g['cells'] + ['', ''])[:2]
        els = []
        for r in g['rows']:
            r = r + [''] * 3
            els.append(dict(id=str(eid), name=r[0], type=ctype, numberOfContractors=r[1], typeOfContractors='', remarks=r[2])); eid += 1
        packages.append(dict(id=i + 1, name=name, contractType=ctype, elements=els))
    if not packages:
        packages = [dict(id=1, name='Package 1', elements=[])]
    contractors, cid = [], 1
    for g in ct_groups:
        for r in g['rows']:
            r = r + [''] * 4
            contractors.append(dict(id=cid, name=r[0], grade=g['cells'][0], benchmark=r[1], previous=r[2], remarks=r[3])); cid += 1
    used = [e['name'] for p in packages for e in p['elements']]
    available = DEFAULT_ELEMENTS + [n for n in dict.fromkeys(used) if n and n not in DEFAULT_ELEMENTS]
    out = {'packages': packages, 'availableElements': available}
    if contractors:
        out['contractors'] = contractors
    notes = [] if contractors else ['no contractor repository printed (form will show its default contractors)']
    return {'summary': {'contractingStrategyData': out}, 'notes': notes + ['element "type of contractors" is not printed in the DPR']}
