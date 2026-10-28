"""Unit Level Design: typology pages -> summary.unitLevelDesignData (Typology[] as stored by UnitLevelDesignForm)."""
import os, re

# canonical row order of the typology table; None = derived row (computed by our calc, not stored)
CANON = [
    ('Type / Configuration', 'type'),
    ('No. of Units', 'noOfUnits'),
    ('Unit Saleable Area', 'saleableArea'),
    ('Unit Covered Area', 'coveredArea'),
    ('Unit FAR (exc. Balcony)', 'unitFar'),
    ('RERA Carpet Area', 'carpetArea'),
    ('Balcony Area — FAR', 'balconyAreaFar'),
    ('Balcony Area — Non-FAR', 'balconyAreaNonFar'),
    ('Total Balcony Area', None),
    ('Unit Area — Covered + Balcony', None),
    ('Core Area (Non Saleable FAR)', 'circulationFar'),
    ('Balcony FAR + Unit FAR', None),
    ('Wall area (Unit external wall Area)', 'wallArea'),
    ('AC Area', 'acArea'),
    ('Core Area (Non Saleable FAR)', 'coreArea'),
    ('Units Per Core', 'unitsPerCore'),
    ('CA / SA', None),
    ('Balcony / SA', None),
    ('Core Area Efficiency', None),
    ('Unit Area (Covered + Balcony) to Saleable', None),
]
FIELDS = ['type', 'noOfUnits', 'saleableArea', 'coveredArea', 'unitFar', 'balconyAreaNonFar', 'balconyAreaFar', 'carpetArea', 'coreArea',
          'unitsPerCore', 'internalWallThickness', 'commonWallThickness', 'wallArea', 'acArea', 'circulationFar', 'permissibleFar']
TITLE_RE = re.compile(r'^Unit Level Design — (.*) Details$')


def _rows(page):
    """[(label, value)] in table order: label at x≈41, value at the Specification column (255 or 426), ' Sqft' suffix dropped"""
    body = [t for t in page.texts if 95 < t['y'] < 560 and t['size'] == 7.5]
    labels = sorted([t for t in body if abs(t['x'] - 41) < 0.5], key=lambda t: t['y'])
    out = []
    for lab in labels:
        same = sorted([t for t in body if abs(t['y'] - lab['y']) < 0.3 and t['x'] > 200 and t['font'] == 'Semibold'], key=lambda t: t['x'])
        val = same[0]['text'] if same else ''
        if val.endswith(' Sqft'):
            val = val[:-5]
        out.append((lab['text'], val))
    return out


def _is_logo(im):
    return im['ytop'] < 62 or im.get('logo')


def parse(pages, ctx):
    notes, types = [], []
    for p in pages:
        m = TITLE_RE.match(p.title)
        if not m:
            continue  # summary / empty-state pages carry nothing to import
        t = {'id': len(types) + 1, 'name': m.group(1), 'isOpen': False}
        for f in FIELDS:
            t[f] = ''
        t['plan'] = None
        t['keyPlan'] = None
        pos = 0
        for label, val in _rows(p):
            k = next((i for i in range(pos, len(CANON)) if CANON[i][0] == label), None)
            if k is None:
                notes.append(f'{t["name"]}: unexpected row {label!r}')
                continue
            pos = k + 1
            if CANON[k][1]:
                t[CANON[k][1]] = val
        for im in p.images:
            if _is_logo(im):
                continue
            ref = 'image:' + os.path.basename(im['file']) if im.get('file') else None
            if im['x'] >= 400:
                t['plan'] = ref
            else:
                t['keyPlan'] = ref
            if not ref:
                notes.append(f'{t["name"]}: plan image could not be extracted')
        types.append(t)
    if types:
        notes.append('not printed in the DPR, left empty: internal/common wall thickness, permissible FAR, area grid')
    return {'summary': {'unitLevelDesignData': types} if types else {}, 'notes': notes}
