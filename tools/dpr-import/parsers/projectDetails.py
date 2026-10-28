"""Project Details + Layout Plans: Project Brief page(s) + "Project Layout — <name>" pages -> projectDetailsLayoutData.
Shapes follow frontend/src/types/chapters-a.ts (ProjectDetailsLayoutData) as saved by ProjectDetailsLayoutForm."""
import os, re

DEFAULT_LAYOUTS = ['Master Plan', 'Site Plan Layout', 'Typical Stilt Floor', 'Typical First Floor', 'Typical Cluster Plan', 'Basement Plan', 'Floorwise Club Layout']
LABELS = {'Project Name': 'name', 'Project Type': 'projectType', 'Category': 'category', 'Location': 'location',
          'Site Area (Acres)': 'totalArea', 'No. Of Towers': 'noOfTowers', 'Building Height': 'towerHeight'}
RECT_RE = re.compile(r'^FILL re ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) fill=(#\w+)')
CIRCLE_RE = re.compile(r'^FILL circle c=\(([\d.]+),([\d.]+)\)')


def clean(v):
    v = v or ''
    return '' if v.strip() == '-' else v


def numstr(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def fmt_num(x):
    if x is None: return ''
    return int(x) if float(x).is_integer() else round(x, 6)


def content_images(page):
    return [i for i in page.images if i['ytop'] >= 62 and not i.get('logo')]


def img_ref(im):
    return f"image:{os.path.basename(im['file'])}" if im and im.get('file') else ''


def parse_brief(pages, notes):
    """card + custom fields + unit table over one or more 'Project Brief' pages"""
    card, customs, groups, side = {}, [], [], None
    for pi, page in enumerate(pages):
        T = page.body_texts()
        if pi == 0:
            ims = [i for i in content_images(page) if abs(i['x'] - 561.9) < 1]
            side = ims[0] if ims else None
            # card: label (S 8 #6B7280) with value (B 10 #111827) 12pt below at the same x
            for t in T:
                if t['font'] == 'Semibold' and t['size'] == 8 and t['color'] == '#6B7280' and t['text'] in LABELS:
                    v = next((u for u in T if u['font'] == 'Bold' and u['size'] == 10 and abs(u['x'] - t['x']) < 0.5 and abs(u['y'] - t['y'] - 12) < 0.6), None)
                    card[LABELS[t['text']]] = clean(v['text'] if v else '')
            # custom fields table ("Additional Project Details"): S 8.5 label at x 39, R 8.5 value on the same baseline
            if any(t['text'] == 'Additional Project Details' and t['font'] == 'Bold' for t in T):
                labs = [t for t in T if t['font'] == 'Semibold' and t['size'] == 8.5 and abs(t['x'] - 39) < 0.5]
                for l in labs:
                    v = next((u for u in T if u['font'] == 'Regular' and u['size'] == 8.5 and abs(u['y'] - l['y']) < 0.3), None)
                    customs.append({'label': clean(l['text']), 'value': clean(v['text'] if v else '')})
        # unit table
        heads = [t for t in T if t['text'] == 'Unit Typology & Area Details']
        cont = pi > 0
        if not heads and not cont:
            continue
        top = heads[0]['y'] if heads else 62
        # column x positions from the header row texts / table width
        full = any(abs(t['x'] - 334.0) < 0.6 and t['font'] == 'Semibold' and t['size'] == 9 for t in T) or \
            any('Avg. Saleable Area in Sqft' == t['text'] for t in T)
        cols = [35, 177, 331, 575, 691, 806.89] if full else [35, 130, 233, 397, 475, 551.89]
        # group bands: white / #F0F4F8 fills starting at x 35 below the table header (the header fill is #DBE8F8)
        bands = []
        for l in page.ops:
            m = RECT_RE.match(l)
            if m and abs(float(m[1]) - 35) < 0.01 and m[5] in ('#FFFFFF', '#F0F4F8') and float(m[2]) > top:
                bands.append((float(m[2]), float(m[2]) + float(m[4])))
        rowtexts = [t for t in T if t['size'] == 9 and t['y'] > top + 20 and t['font'] in ('Bold', 'Semibold')]
        for (y0, y1) in bands:
            inb = [t for t in rowtexts if y0 < t['y'] - 6.6 < y1 - 0.5]
            gtype = [t for t in inb if t['font'] == 'Bold' and abs(t['x'] - 38) < 0.5]
            typo = [t for t in inb if t['font'] == 'Semibold' and abs(t['x'] - (cols[1] + 3)) < 0.5]
            utexts = [t for t in inb if t['font'] == 'Semibold' and abs(t['x'] - (cols[2] + 3)) < 0.5]
            units = []
            for u in sorted(utexts, key=lambda t: t['y']):
                cnt = next((t for t in inb if t['font'] == 'Semibold' and cols[3] <= t['x'] < cols[4] and abs(t['y'] - u['y']) < 0.3), None)
                siz = next((t for t in inb if t['font'] == 'Semibold' and cols[4] <= t['x'] < cols[5] and abs(t['y'] - u['y']) < 0.3), None)
                c, sz = clean(cnt['text'] if cnt else ''), clean(siz['text'] if siz else '')
                cn, sn = numstr(c), numstr(sz)
                area = fmt_num(cn * sn) if cn is not None and sn is not None else ''
                units.append({'type': clean(u['text']), 'count': c, 'size': sz, 'area': area, 'total': ''})
            if gtype:
                tot = sum(float(u['area']) for u in units if u['area'] != '')
                groups.append({'type': clean(gtype[0]['text']), 'typology': clean(''.join(t['text'] for t in typo)),
                               'units': units, 'total': fmt_num(tot) if tot else ''})
            elif groups:  # group continued from the previous page
                groups[-1]['units'] += units
                tot = sum(float(u['area']) for u in groups[-1]['units'] if u['area'] != '')
                groups[-1]['total'] = fmt_num(tot) if tot else ''
    return card, customs, groups, side


def parse_info_box(page):
    """info box over a layout image: B 7.5 navy first line + S 7.5 lines inside a navy-bordered white box"""
    lines = [t for t in page.body_texts() if t['size'] == 7.5 and t['font'] in ('Bold', 'Semibold') and t['x'] > 263]
    return '\n'.join(t['text'] for t in lines) if lines else ''


def parse_sidebar(page):
    """amenities sidebar: heads (B, #009FE3, bar at x 43 / 147.5) and bulleted items (R) in two columns"""
    T = page.body_texts()
    heads_t = [t for t in T if t['font'] == 'Bold' and t['color'] == '#009FE3']
    items_t = [t for t in T if t['font'] == 'Regular' and t['x'] < 255 and t['color'] == '#1A202C']
    if not heads_t and not items_t:
        return None
    size = (heads_t or items_t)[0]['size']
    lh = size * 1.35
    bars = []
    for l in page.ops:
        m = RECT_RE.match(l)
        if m and m[5] == '#009FE3' and abs(float(m[3]) - 3) < 0.01:
            bars.append((float(m[1]), float(m[2]), float(m[2]) + float(m[4])))
    entries = []  # (col, top, kind, text)
    for (bx, y0, y1) in bars:
        col = 0 if bx < 100 else 1
        hl = [t for t in heads_t if (t['x'] < 100) == (col == 0) and y0 - 1 < t['y'] - size * 1.01 < y1]
        entries.append((col, y0, 'head', ''.join(t['text'] for t in hl).strip()))
    for col in (0, 1):
        ts = sorted([t for t in items_t if (t['x'] < 100) == (col == 0)], key=lambda t: t['y'])
        cur = None
        for t in ts:
            if cur and t['y'] - cur[-1]['y'] < lh + 0.6:
                cur.append(t)
            else:
                if cur: entries.append((col, cur[0]['y'] - size * 1.01, 'item', ''.join(x['text'] for x in cur).strip()))
                cur = [t]
        if cur: entries.append((col, cur[0]['y'] - size * 1.01, 'item', ''.join(x['text'] for x in cur).strip()))
    entries.sort(key=lambda e: (e[0], e[1]))
    groups = []
    for _, _, kind, text in entries:
        if kind == 'head': groups.append({'head': text, 'items': []})
        elif groups: groups[-1]['items'].append(text)
    return groups


def parse(pages, ctx):
    notes = []
    brief = [p for p in pages if p.title == 'Project Brief']
    layouts_p = [p for p in pages if p.title.startswith('Project Layout — ')]
    if not brief:
        return {'notes': ['no Project Brief page']}
    card, customs, groups, side = parse_brief(brief, notes)
    d = {}
    d['noOfTowers'] = card.get('noOfTowers', '')
    d['towerHeight'] = re.sub(r'\s*m$', '', card.get('towerHeight', ''))
    d['totalArea'] = card.get('totalArea', '')
    # layouts in report order; consecutive pages of the same name are one layout with several files
    layouts = []
    for p in layouts_p:
        name = p.title[len('Project Layout — '):]
        ims = content_images(p)
        files = [{'id': i + 1, 'name': os.path.basename(im['file']) if im.get('file') else '', 'url': img_ref(im), 'size': '', 'date': ''} for i, im in enumerate(ims) if im.get('file')]
        info = parse_info_box(p)
        if layouts and layouts[-1]['name'] == name:
            for f in files:
                f['id'] = len(layouts[-1]['files']) + 1
                layouts[-1]['files'].append(f)
        else:
            lay = {'id': len(layouts), 'name': name, 'files': files}
            if info: lay['infoText'] = info
            layouts.append(lay)
        if not files: notes.append(f'layout "{name}": image could not be extracted')
    for n in DEFAULT_LAYOUTS:  # empty default layouts (not printed in the report) keep the form's list complete
        if not any(l['name'] == n for l in layouts):
            layouts.append({'id': len(layouts), 'name': n, 'files': []})
    for l in layouts:
        if l['name'] == 'Master Plan': l['fixed'] = True
    d['layouts'] = layouts
    if groups:
        d['tableRows'] = groups
        g = sum(float(r['total']) for r in groups if r['total'] != '')
        if g: d['grandTotalSaleable'] = fmt_num(g)
    d['customFields'] = customs
    if side and side.get('file'):
        d['customFieldsImage'] = img_ref(side)
    elif side:
        notes.append('section image could not be extracted')
    summary = {'projectDetailsLayoutData': d}
    # Site Plan Layout amenities sidebar -> selected amenities (the Landscape module's own pages override this when parsed)
    site = next((p for p in layouts_p if re.search(r'site\s*plan', p.title, re.I)), None)
    sb = parse_sidebar(site) if site else None
    if sb:
        summary['landscapeAmenitiesData'] = {'amenitiesList': sb, 'selectedAmenities': [i for g in sb for i in g['items']]}
    inferred = {}
    if d['totalArea']:
        inferred['projectFields'] = {'site_area_acres': d['totalArea']}
    if not d['noOfTowers']: notes.append('No. of towers not set')
    return {'summary': summary, 'inferred': inferred, 'notes': notes}
