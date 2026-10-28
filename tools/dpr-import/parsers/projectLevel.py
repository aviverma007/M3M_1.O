"""Project Level Design parser: vendor DPR pages -> summary.projectLevelDesignData (+ inferred benchmarks / compare projects).

Pages handled: Development Area Statement, Project Level Parameters (+ Additional Elements band), Area Statement Breakdown,
Key Ratio, Additional Elements 2/2 (cluster tables) / the blank page, Area Ratios Comparison.
Values are reconstructed as the INPUTS our form stores (frontend types/chapters-a.ts); the green/red "Req:" lines become
inferred.benchmarks (normalized label -> {benchmarkValue, validOptions}).
"""
import re
from decimal import Decimal, ROUND_HALF_UP

RED, GREEN, TEXT = '#DC2626', '#16A34A', '#1A202C'

# label -> key, in the renderer's print order (backend/src/dpr/modules/project-level.ts KR_PARAMS)
KR = [
    ('Building Height', 'buildingHeight'), ('Carpet Area', 'carpetArea'), ('Saleable Area', 'saleableArea'), ('Balcony Area', 'balconyArea'),
    ('Built Up Area', 'builtUpArea'), ('FAR', 'far'), ('Total External Wall Area', 'totalExternalWallArea'), ('Service Shaft Area', 'serviceShaftArea'),
    ('Window to Area Ratio', 'windowToAreaRatio'), ('Construction Cost On B U A', 'constructionCostOnBUA'), ('Permissible F A R', 'permissibleFAR'),
    ('No. of EWS Unit', 'noOfEWSUnit'), ('EWS FAR', 'ewsFAR'), ('Floor to Floor Height Apt', 'floorToFloorHeightApt'),
    ('Average Wall Area (Interior + Exterior) Per Unit', 'avgWallArea'), ('No. Of Units', 'noOfUnits'), ('Total Basement Area', 'totalBasementArea'),
    ('Services Area (only MEP Services Area)', 'circulationArea'), ('Total Parking Area', 'totalParkingArea'), ('Total Number Of Cars', 'totalNumberOfCars'),
    ('Lobby Corridor Width', 'lobbyCorridorWidth'), ('Driveway Width Basement', 'drivewayWidthBasement'),
    ('Floor to Floor Height Ground Lobby', 'floorToFloorHeightGroundLobby'), ('Floor to Floor Height Basement B1 B2', 'floorToFloorHeightBasementB1B2'),
    ('Floor to Floor Height (B1 - GF) Tower Area', 'floorToFloorHeightB1GFTower'), ('Floor to Floor Height (B1 - GF) Non Tower Area', 'floorToFloorHeightB1GFNonTower'),
    ('Floor to Floor Height (B2 - B1)', 'floorToFloorHeightB2B1'), ('Floor to Floor Height (B3 - B2)', 'floorToFloorHeightB3B2'),
    ('Car Length', 'carLength'), ('Car Width', 'carWidth'), ('Car Height', 'carHeight'),
    ('Average Wall Area (Interior + Exterior) Per Basement', 'avgWallAreaBasement'), ('Number of Basements', 'noOfBasements'), ('Sales Price', 'salesPrice'),
]
OTHER = [
    ('Ground Floor Entrance Lobby Type', 'groundFloorEntranceLobby'), ('Typical Floor', 'typicalFloor'), ('Floor To Floor Height Stilt', 'stilt'),
    ('Floor To Floor Height Penthouse', 'pentHouse'), ('Penthouse Planning', 'pentHousePlanning'), ('Units on Ground Floor', 'unitsOnGroundFloor'),
    ('Surface Driveway Width', 'surfaceDrivewayWidth'), ('Ramps & Entry to Basement Width', 'rampsEntryToBasementWidth'),
    ('Basement Clear Height (Ramp Entrance)', 'basementClearHeightRamp'), ('Basement Clear Height (Below Services)', 'basementClearHeightB1'),
    ('Total Parking Bay size', 'totalParkingBaySize'), ('No. of parking slots', 'noOfParkingSlots'), ('Unit Parking Size', 'unitParkingSize'),
]
KR_LABEL = dict(KR)
OTHER_LABEL = dict(OTHER)
# key ratio page rows -> labels the renderer looks the benchmark up with (first one is used as the inferred key)
KR_BENCH = {'Parking bay size': 'Total Parking Bay size', 'No. of Basements': 'Number of Basements', 'FAR per EWS': 'FAR per EWS (sqft)',
            'Floor to Floor Height Basement B1/B2': 'Floor to Floor Height Basement B1 B2'}
PLP_BENCH = {'Permissible F A R': 'Permissible F A R', 'EWS FAR': 'EWS FAR'}

KEY_RATIO_DEFAULTS = ['balconyArea', 'builtUpArea', 'far', 'totalExternalWallArea', 'serviceShaftArea', 'windowToAreaRatio', 'salesPrice',
    'constructionCostOnBUA', 'permissibleFAR', 'noOfEWSUnit', 'ewsFAR', 'buildingHeight', 'carpetArea', 'saleableArea', 'floorToFloorHeightApt',
    'avgWallArea', 'noOfUnits', 'totalBasementArea', 'circulationArea', 'totalParkingArea', 'totalNumberOfCars', 'lobbyCorridorWidth',
    'drivewayWidthBasement', 'floorToFloorHeightGroundLobby', 'floorToFloorHeightB1GFTower', 'floorToFloorHeightB1GFNonTower', 'floorToFloorHeightB2B1',
    'floorToFloorHeightB3B2', 'carLength', 'carWidth', 'carHeight', 'noOfBasements']
AREA_KEYS = ['licensedAreaSqm', 'todLandSqm', 'nonTodLandSqm', 'commercialSqm', 'todBaseFar', 'todGriha', 'todTdr', 'nonTodBaseFar', 'nonTodGriha',
             'nonTodTdr', 'proposedFarSqm', 'permissibleGcPct', 'proposedGcSqm']
ROW_CATEGORIES = ['Total', 'Residential', 'Commercial', 'Club', 'Basement', 'Circulation Area', 'Parking Area', 'External Wall', 'Service Shaft Area']
OTHER_DEFAULTS = ['groundFloorEntranceLobby', 'openingsToGroundFloorLobby', 'floorToFloorHeight', 'typicalFloor', 'stilt', 'pentHouse', 'pentHousePlanning',
    'unitsOnGroundFloor', 'surfaceDrivewayWidth', 'rampsEntryToBasementWidth', 'basementClearHeightRamp', 'basementClearHeightB1', 'basementClearHeightB2',
    'totalFromTypologySum', 'noOfParkingSlots', 'parkingRequirement', 'fsi', 'valueInProject', 'jhkParkingSlot']

# ------------------------------------------------------------------ JS helpers
def js_fixed(x, d):
    if x != x or x in (float('inf'), float('-inf')): return 'NaN' if x != x else ('Infinity' if x > 0 else '-Infinity')
    q = Decimal(x).quantize(Decimal(1).scaleb(-d), rounding=ROUND_HALF_UP)
    s = format(q, 'f')
    return '0' + s[1:] if s.startswith('-0') and float(q) == 0 and False else s

def js_num_str(s):
    f = float(s)
    if f == int(f) and abs(f) < 1e21: return str(int(f))
    r = repr(f)
    return r

def parse_float(v):
    """JS parseFloat(String(v)) || 0"""
    m = re.match(r'\s*([+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?)', str(v if v is not None else ''))
    try: return float(m.group(1)) if m else 0.0
    except ValueError: return 0.0

def num(v): return parse_float(v) or 0.0

def ratio(a, b): return js_fixed(a / b, 2) if a and b else '-'

def clean(s): return js_num_str(s) if s and s != '-' and re.match(r'^-?\d+\.\d+$', s) else (s or '-')

def normalize_key(label):
    s = re.sub(r'\s*[–—-]+\s*(Benchmark\s*)?(Req(uired)?\.?)$', '', str(label or ''), flags=re.I)
    s = re.sub(r'[()]', ' ', s).lower()
    s = re.sub(r'[^a-z0-9 %]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()

def is_deviation(value, b):
    if not b: return False
    v = str(value if value is not None else '').strip()
    if not v or v == '-' or re.match(r'^not\s+(stated|found|provided|applicable)$', v, re.I): return True
    bv = str(b.get('benchmarkValue') or '').strip()
    vo = b.get('validOptions') or []
    if not bv or re.match(r'^not\s+(stated|found|explicitly)', bv, re.I):
        if vo:
            lv = v.lower()
            if not any(o.lower() in lv or lv in o.lower() for o in vo): return True
        return False
    if (re.match(r'^yes\b', bv, re.I) and re.match(r'^no$', v, re.I)) or (re.match(r'^no\b', bv, re.I) and re.match(r'^yes$', v, re.I)): return True
    rg = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*%?\s*(?:[-–—]|to)\s*([0-9]+(?:\.[0-9]+)?)', bv, re.I)
    if rg:
        lo, hi = float(rg.group(1)), float(rg.group(2))
        n = parse_float(re.sub(r'[^0-9.]', '', v)) if re.sub(r'[^0-9.]', '', v) else float('nan')
        return (n < lo or n > hi) if n == n else False
    mn = re.match(r'^([0-9]+(?:\.[0-9]+)?)', bv)
    if mn:
        m = float(mn.group(1))
        if m != 0:
            digits = re.sub(r'[^0-9.]', '', v)
            n = parse_float(digits) if digits else float('nan')
            if n == n and digits and re.match(r'^\d|^\.\d', digits): return n < m
        return False
    if vo:
        norm = lambda s: re.sub(r'\s+', ' ', re.sub(r'\s*/\s*', '/', s.lower())).strip()
        nv, nb = norm(v), norm(bv)
        matching = [o for o in vo if norm(o) in nb]
        if len(matching) == 1:
            m = norm(matching[0])
            if m not in nv and nv not in m: return True
        elif not any(norm(o) in nv or nv in norm(o) for o in vo): return True
    return False

def bench_from_req(req):
    """inverse of formatBenchmark: 'Min 12.5' -> '12.5'"""
    m = re.match(r'^Min (.+)$', req)
    return m.group(1) if m else req

def numstr(s):
    """'43,300.00' / '1,92,800.00' -> '43300'; '-' -> ''"""
    s = (s or '').strip()
    if not s or s in ('-', '—'): return ''
    s = s.replace(',', '').rstrip('%')
    try:
        f = float(s)
    except ValueError:
        return s
    return js_num_str(repr(f))

# ------------------------------------------------------------------ page helpers
def body(p):
    return [t for t in p.texts if 62 < t['y'] < 570]

def rows_by_y(texts, tol=0.6):
    out = []
    for t in sorted(texts, key=lambda t: (t['y'], t['x'])):
        if out and abs(out[-1][0] - t['y']) <= tol: out[-1][1].append(t)
        else: out.append((t['y'], [t]))
    return out

def bench_put(inferred, label, req, value, color, notes):
    b = {'benchmarkValue': bench_from_req(req)}
    observed_dev = color == RED
    if is_deviation(value, b) != observed_dev:
        if observed_dev:
            b['validOptions'] = [b['benchmarkValue']]
            if not is_deviation(value, b):
                notes.append(f'benchmark colour not reproducible for {label!r}={value!r} ({req})')
        else:
            notes.append(f'benchmark colour not reproducible for {label!r}={value!r} ({req})')
    key = normalize_key(label)
    old = inferred.get(key)
    if old and old != b and old.get('benchmarkValue') == b['benchmarkValue']:
        if 'validOptions' in old and 'validOptions' not in b: b = old
    inferred[key] = b

# ------------------------------------------------------------------ 1. Development Area Statement
AREA_LABELS = {
    'Licensed Area of Site': ('licensedAreaSqm', None), 'TOD Transition Land': ('todLandSqm', None), 'Non-TOD Land': ('nonTodLandSqm', None),
    'Area of Commercial Site as per Zoning': ('commercialSqm', None),
}

def parse_area(p, notes):
    a = {k: '' for k in AREA_KEYS}
    section = None
    for y, ts in rows_by_y(body(p)):
        lab = next((t for t in ts if abs(t['x'] - 43) < 0.6 and t['size'] == 7), None)
        sec = next((t for t in ts if abs(t['x'] - 45) < 0.6 and t['size'] == 7), None)
        if sec: section = sec['text']; continue
        if not lab: continue
        vals = sorted([t for t in ts if t is not lab and t['size'] == 7], key=lambda t: t['x'])
        mid = next((t['text'] for t in vals if 375 < t['x'] < 560), '-')
        sqm = next((t['text'] for t in vals if t['x'] >= 560), '-')
        L = lab['text']
        if L in AREA_LABELS: a[AREA_LABELS[L][0]] = numstr(sqm)
        elif section == 'TOD TRANSITION LAND' and L in ('Base FAR', 'GRIHA', 'TDR'):
            a[{'Base FAR': 'todBaseFar', 'GRIHA': 'todGriha', 'TDR': 'todTdr'}[L]] = (numstr(mid), numstr(sqm))
        elif section == 'NON-TOD LAND' and L in ('Base FAR', 'GRIHA', 'TDR'):
            a[{'Base FAR': 'nonTodBaseFar', 'GRIHA': 'nonTodGriha', 'TDR': 'nonTodTdr'}[L]] = (numstr(mid), numstr(sqm))
        elif L.startswith('TOD Transition Land – Total'): a['_todTotal'] = mid
        elif L.startswith('Non-TOD Land – Total'): a['_nonTodTotal'] = mid
        elif L == 'Proposed FAR for Residential': a['proposedFarSqm'] = numstr(sqm)
        elif L == 'Permissible Ground Coverage': a['permissibleGcPct'] = numstr(mid)
        elif L == 'Proposed Ground Coverage': a['proposedGcSqm'] = numstr(sqm)
    # factors: exact from FAR sqm / land when possible, else the printed 2-decimal factor adjusted to reproduce the printed total
    for land, keys, tot in (('todLandSqm', ('todBaseFar', 'todGriha', 'todTdr'), '_todTotal'), ('nonTodLandSqm', ('nonTodBaseFar', 'nonTodGriha', 'nonTodTdr'), '_nonTodTotal')):
        L = num(a[land])
        vals = []
        for k in keys:
            v = a[k]
            if isinstance(v, tuple):
                fac, sqm = v
                if L and sqm:
                    exact = float(sqm) / L
                    fac = js_num_str(js_fixed(exact, 6)) if js_fixed(exact, 2) == js_fixed(float(fac or 0), 2) else fac
                vals.append(fac)
            else: vals.append('')
        total = a.pop(tot, '-')
        if total not in ('-', '') and not L:
            cands = []
            for f in vals:
                if not f: cands.append([''])
                else:
                    x = float(f)
                    cands.append([c for c in [f] + [js_num_str(repr(round(x + d, 3))) for d in (-0.005, 0.005, -0.004, 0.004, -0.003, 0.003, -0.002, 0.002, -0.001, 0.001)]
                                  if float(c) >= 0 and js_fixed(float(c), 2) == js_fixed(x, 2)])
            import itertools
            for combo in itertools.product(*cands):
                if js_fixed(sum(num(c) for c in combo), 2) == total:
                    vals = list(combo); break
            else:
                notes.append(f'area statement factor total {total} not reproducible')
        for k, v in zip(keys, vals): a[k] = v
    return a

# ------------------------------------------------------------------ 2. Project Level Parameters
def parse_params(pages, inferred, notes):
    kr, other, reqs = {}, {}, []
    order = []  # unknown keys keep their order
    rows = []
    for p in pages:
        ts = [t for t in body(p) if t['y'] > 100]
        cur = None
        for t in sorted(ts, key=lambda t: (t['y'], t['x'])):
            if t['size'] == 10 and t['font'] == 'Bold' and t['text'] == 'Additional Elements':
                rows.append({'section': True}); cur = None; continue
            if abs(t['x'] - 43) < 0.6 and t['size'] == 9:
                if cur and abs(t['y'] - cur['ly']) < 12.5 and cur['label_lines'] and not cur['vals']:
                    cur['label'] += ' ' + t['text']; cur['ly'] = t['y']; continue
                cur = {'label': t['text'], 'ly': t['y'], 'label_lines': 1, 'vals': [], 'req': None, 'color': None}
                rows.append(cur); continue
            if cur is None: continue
            if abs(t['x'] - 343) < 0.6 and t['size'] == 9 and t['font'] == 'Semibold':
                cur['vals'].append(t['text']); cur['color'] = cur['color'] or t['color']
            elif t['size'] == 7 and t['text'].startswith('Req: '):
                cur['req'] = t['text'][5:]
    in_other = False
    req_labels = []
    after_reqs = False
    for r in rows:
        if r.get('section'): in_other = True; continue
        L, vals = r['label'], r['vals']
        val = vals[0] if vals else ''
        if L == 'Extra Parking Reqs':
            for i in range(0, len(vals), 2):
                lab = vals[i][7:] if vals[i].startswith('Label: ') else vals[i]
                v = vals[i + 1][7:] if i + 1 < len(vals) and vals[i + 1].startswith('Value: ') else ''
                reqs.append({'label': lab, 'value': v}); req_labels.append(lab)
            continue
        if L == 'Openings To Ground Floor Lobby':
            other['openingsToGroundFloorLobby'] = val; after_reqs = True
            if r['req']: bench_put(inferred, L, r['req'], val, r['color'], notes)
            continue
        if in_other and (after_reqs or not OTHER_LABEL.get(L)) and L in req_labels:
            continue
        if in_other and L in OTHER_LABEL:
            other[OTHER_LABEL[L]] = val
        elif not in_other and L in KR_LABEL:
            kr[KR_LABEL[L]] = val
        elif not in_other:
            words = L.split(' ')
            key = words[0].lower() + ''.join(w if len(w) == 1 else w[0].upper() + w[1:] for w in words[1:])
            kr[key] = val; order.append(key)
            notes.append(f'unlisted key ratio input {L!r} -> {key}')
        else:
            notes.append(f'unknown additional element {L!r}={val!r} skipped')
            continue
        if r['req']: bench_put(inferred, PLP_BENCH.get(L, L), r['req'], val, r['color'], notes)
    return kr, other, reqs

# ------------------------------------------------------------------ 3. Area Statement Breakdown
def parse_breakdown(pages):
    rows = []
    for p in pages:
        for y, ts in rows_by_y([t for t in body(p) if t['y'] > 112]):
            lab = next((t for t in ts if abs(t['x'] - 43) < 0.6), None)
            if not lab: continue
            cell = lambda x0: next((t['text'] for t in ts if abs(t['x'] - x0) < 0.6), '-')
            rows.append({'category': lab['text'], 'bua': numstr_keep(cell(293)), 'sa': numstr_keep(cell(453)), 'ca': numstr_keep(cell(613))})
    return rows

def numstr_keep(s): return '' if s in ('-', '') else s

# ------------------------------------------------------------------ 4. Key Ratio
def parse_key_ratio(pages):
    out = []
    for p in pages:
        for t in sorted(body(p), key=lambda t: (t['y'], t['x'])):
            if abs(t['x'] - 129) < 0.6 and t['size'] == 8 and t['font'] == 'Semibold':
                out.append({'label': t['text'], 'y': t['y'], 'value': None, 'req': None, 'vcolor': None, 'rcolor': None, 'p': p.no})
            elif out and out[-1]['p'] == p.no and t['x'] > 525:
                r = out[-1]
                if t['size'] == 9 and t['font'] == 'Semibold' and r['value'] is None: r['value'] = t['text']; r['vcolor'] = t['color']
                elif t['size'] == 5.5 and t['text'].startswith('Req: '): r['req'] = t['text'][5:]; r['rcolor'] = t['color']
    # wrapped parameter labels (second line at x=129) merge into the previous row
    merged = []
    for r in out:
        if merged and r['value'] is None and r['p'] == merged[-1]['p'] and abs(r['y'] - merged[-1]['y']) < 12:
            merged[-1]['label'] += ' ' + r['label']
        else: merged.append(r)
    return merged

def expected_kr(l, other):
    """the renderer's key-ratio values for the parsed inputs (label -> string, '-' = row omitted)"""
    v = lambda k: (str(l[k]) if l.get(k) not in (None, '') else '-')
    cars = num(l.get('totalNumberOfCars'))
    far = num(l.get('far'))
    def kf(i):
        bua, sa, fa = l.get('builtUpArea'), l.get('saleableArea'), l.get('far')
        if i == 4 and bua is not None and sa is not None: r = js_fixed(num(bua) / num(sa), 2) if num(sa) else ('NaN' if not num(bua) else 'Infinity')
        elif i == 5 and fa is not None and sa is not None: r = js_fixed(num(sa) / num(fa), 2) if num(fa) else ('NaN' if not num(sa) else 'Infinity')
        else: return ''
        return '' if r == 'NaN' else r
    fu = '-'
    if far:
        pf = num(l.get('permissibleFAR')) or far
        fu = js_num_str(js_fixed(far / pf * 100, 2)) + '%'
    st = lambda s: s if s not in ('', None) else '-'
    return {
        'Carpet Area/Saleable': clean(ratio(num(l.get('carpetArea')), num(l.get('saleableArea')))),
        'BUA/Saleable': clean(st(kf(4))), 'BUA/FAR': clean(ratio(num(l.get('builtUpArea')), far)), 'Saleable/FAR': clean(st(kf(5))),
        'FAR Utilization': fu, 'FAR per EWS': clean(ratio(num(l.get('ewsFAR')), num(l.get('noOfEWSUnit')))),
        'Floor to Floor Height Apt': v('floorToFloorHeightApt'), 'Average Wall Area (Interior + Exterior) Per Unit': v('avgWallArea'), 'No. Of Units': v('noOfUnits'),
        'Basement parking efficiency': js_fixed((num(l.get('totalBasementArea')) - num(l.get('circulationArea'))) / cars / 10.7639, 2) if cars > 0 else '-',
        'Lobby Corridor Width': v('lobbyCorridorWidth'), 'Driveway Width Basement': v('drivewayWidthBasement'),
        'Floor to Floor Height Ground Lobby': v('floorToFloorHeightGroundLobby'), 'Floor to Floor Height Basement B1/B2': v('floorToFloorHeightBasementB1B2'),
        'Parking bay size': str(other.get('totalParkingBaySize')) if other.get('totalParkingBaySize') not in (None, '') else '-',
        'Average Wall Area (Interior + Exterior) Per Basement': v('avgWallAreaBasement'), 'No. of Basements': v('noOfBasements'),
    }

# ------------------------------------------------------------------ 5. clusters
CLUSTER_ROWS = {'Window/Carpet': ('windowOpeningArea', 'floorCarpetArea'), 'Glazing area/Wall perimeter': ('externalGlazingArea', 'wallPerimeterArea'),
                'Shaft/Floor BUA': ('floorShaftArea', 'floorBUA'), 'Str. Footprint/BUA': ('structureFootprintArea', 'floorBUA'),
                'Core Area/Floor FAR': ('nonSaleableFAR', 'floorFAR'), 'Non FAR BUA/Floor BUA': ('nonFARBUA', 'floorBUA')}
CLUSTER_KEYS = ['floorFAR', 'floorBUA', 'nonFARBUA', 'floorCarpetArea', 'floorShaftArea', 'structureFootprintArea', 'nonSaleableFAR', 'windowOpeningArea',
                'externalGlazingArea', 'wallPerimeterArea']

def parse_clusters(pages, notes):
    clusters = []
    for p in pages:
        for t in sorted(body(p), key=lambda t: (t['y'], t['x'])):
            if t['font'] == 'Bold' and t['size'] == 9 and t['text'].startswith('CLUSTER LEVEL DESIGN — '):
                c = {'name': t['text'][len('CLUSTER LEVEL DESIGN — '):]}
                c.update({k: '' for k in CLUSTER_KEYS}); clusters.append(c); cur_label = None
            elif clusters and t['size'] == 8 and t['font'] == 'Semibold' and abs(t['x'] - 39) < 0.6:
                cur_label = t['text']
            elif clusters and t['size'] == 9 and t['font'] == 'Semibold' and t['x'] > 500 and cur_label in CLUSTER_ROWS:
                num_k, den_k = CLUSTER_ROWS[cur_label]
                if t['text'] != '-':
                    clusters[-1][den_k] = '100'
                    clusters[-1][num_k] = t['text'].rstrip('%')
                cur_label = None
    return clusters

# ------------------------------------------------------------------ 6. comparison
def parse_comparison(p, project, notes):
    ts = body(p)
    head = [t for t in ts if t['font'] == 'Bold' and t['size'] == 8.5 and t['color'] == '#1A3566' and t['y'] < 140]
    # value columns start at x=367; column bounds from the value cells of the first row
    vals = [t for t in ts if t['font'] == 'Semibold' and t['size'] == 8.5 and t['x'] > 360]
    rows = rows_by_y([t for t in ts if t['font'] == 'Semibold' and t['size'] == 8.5], tol=0.6)
    hcols = sorted([t for t in head if t['x'] > 360], key=lambda t: t['x'])
    # determine column count from the first value row (one value per column)
    first = None
    for y, r in rows:
        cells = [t for t in r if t['x'] > 360]
        if cells: first = cells; break
    k = len(first) if first else 1
    cw = (805 - 367) / k
    col_of = lambda x: min(k - 1, max(0, int((x - 367) // cw)))
    cols = [[] for _ in range(k)]
    for t in sorted(hcols, key=lambda t: t['y']): cols[col_of(t['x'])].append(t['text'])
    keys = ['carpet', 'buaSa', 'buaFar', 'saFar', 'farUtil', 'circ', 'parking']
    values = [[] for _ in range(k)]
    for y, r in rows:
        cells = sorted([t for t in r if t['x'] > 360], key=lambda t: t['x'])
        if not cells: continue
        if len(cells) != k: continue
        for i, c in enumerate(cells): values[i].append(c['text'])
    out = []
    for i in range(1, k):
        lines = cols[i]
        name = lines[0] if lines else ''
        loc = ' '.join(lines[1:]) if len(lines) > 1 else ''
        if len(lines) > 2: notes.append(f'comparison header for {name!r} wraps; location joined')
        v = dict(zip(keys, values[i]))
        out.append({'name': name, 'location': loc, 'values': v})
    current = dict(zip(keys, values[0])) if values else {}
    return current, out

def synth_summary(v, notes, name):
    """smallest projectLevelDesignData whose comparisonRatios reproduce the printed values (for the round trip only)"""
    g = lambda k: v.get(k, '—')
    l = {}
    def num_or_none(s): return None if s in ('—', '-', '') else float(s.rstrip('%'))
    carpet, busa, bufa, safa, park = (num_or_none(g(k)) for k in ('carpet', 'buaSa', 'buaFar', 'saFar', 'parking'))
    if carpet is not None or busa is not None or safa is not None:
        l['saleableArea'] = '100'
        if carpet is not None: l['carpetArea'] = js_num_str(repr(carpet))
        if busa is not None: l['builtUpArea'] = js_num_str(repr(busa * 100))
        if safa is not None or bufa is not None:
            # far so that 100/far -> safa and bua/far -> bufa (2 decimals)
            lo, hi = 1e-9, 1e12
            if safa is not None: lo, hi = max(lo, 100 / (safa + 0.005)), min(hi, 100 / (safa - 0.005) if safa > 0.005 else hi)
            if bufa is not None and busa is not None:
                b = busa * 100; lo, hi = max(lo, b / (bufa + 0.005)), min(hi, b / (bufa - 0.005) if bufa > 0.005 else hi)
            l['far'] = js_num_str(repr(round((lo + hi) / 2, 6)))
    if park is not None:
        l['totalBasementArea'] = js_num_str(repr(park)); l['totalNumberOfCars'] = '1'
    return {'projectLevelDesignData': {'keyRatioInputs': l}}

# ------------------------------------------------------------------ main
def parse(pages, ctx):
    notes, bench = [], {}
    if not pages: return {'notes': ['no project level pages']}
    groups = {'area': [], 'params': [], 'breakdown': [], 'kr': [], 'clusters': [], 'blank': [], 'compare': []}
    for p in pages:
        t = p.title.lower()
        if 'development area statement' in t: groups['area'].append(p)
        elif 'project level parameters' in t: groups['params'].append(p)
        elif 'area statement breakdown' in t: groups['breakdown'].append(p)
        elif 'key ratio' in t: groups['kr'].append(p)
        elif 'additional elements' in t: groups['clusters'].append(p)
        elif 'area ratios' in t: groups['compare'].append(p)
        elif not p.title: groups['blank'].append(p)
        else: notes.append(f'unrecognised page {p.no} {p.title!r}')
    area = parse_area(groups['area'][0], notes) if groups['area'] else {k: '' for k in AREA_KEYS}
    kr, other_vals, reqs = parse_params(groups['params'], bench, notes)
    l = {k: '' for k in KEY_RATIO_DEFAULTS}
    for _, k in KR:
        if k in kr: l[k] = kr[k]
    for k, v in kr.items():
        if k not in l: l[k] = v
    other = {k: '' for k in OTHER_DEFAULTS}
    other.update(other_vals)
    other['extraParkingReqs'] = reqs or [{'label': '2 BHK + STUDY', 'value': ''}, {'label': '1 BHK + STUDY', 'value': ''}]
    brk = parse_breakdown(groups['breakdown'])
    rows = [{'category': c, 'bua': '', 'sa': '', 'ca': ''} for c in ROW_CATEGORIES]
    for r in brk:
        hit = next((x for x in rows if x['category'] == r['category']), None)
        if hit: hit.update(r)
        else: rows.append(r)
    display = {}
    exp = expected_kr(l, other)
    for r in parse_key_ratio(groups['kr']):
        lab = r['label']
        if r['req']: bench_put(bench, KR_BENCH.get(lab, lab), r['req'], r['value'], RED if r['rcolor'] == RED else GREEN, notes)
        e = exp.get(lab)
        if e is None: notes.append(f'unknown key ratio row {lab!r}'); continue
        if r['value'] != e: display[lab] = r['value']
    for lab, e in exp.items():
        if e != '-' and not any(r['label'] == lab for r in parse_key_ratio(groups['kr'])):
            display[lab] = '-'  # the renderer would print a row the original didn't
    clusters = parse_clusters(groups['clusters'], notes)
    d = {'keyRatioInputs': l, 'areaStatementInputs': area, 'additionalElements2': {'rows': rows, 'other': other}, 'clusterConfigs': clusters, 'compareProjectIds': []}
    inferred = {'benchmarks': bench}
    if groups['compare']:
        current, others = parse_comparison(groups['compare'][0], ctx.get('project', {}), notes)
        circ = current.get('circ')
        if circ and circ != '—': display['Circulation Efficiency'] = circ
        cps = []
        for i, o in enumerate(others):
            cps.append({'id': f'cmp{i + 1}', 'name': o['name'], 'location': o['location'], 'summary': synth_summary(o['values'], notes, o['name'])})
        d['compareProjectIds'] = [c['id'] for c in cps]
        inferred['compareProjects'] = cps
        inferred['compareProjectNames'] = [c['name'] for c in cps]
    if display: d['dprDisplay'] = display
    return {'summary': {'projectLevelDesignData': d}, 'inferred': inferred, 'notes': notes}
