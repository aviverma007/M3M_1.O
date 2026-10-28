"""Shared parsing for the "Product Mix" spec tables (ID Specifications / Common Area) of vendor DPRs."""
import json, os, re

CFG = json.load(open(os.path.join(os.path.dirname(__file__), '_spec_config.json')))

RE_FILL = re.compile(r'^FILL re ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) fill=(#[0-9A-F]{6})')
RE_VLINE = re.compile(r'^STROKE ([\d.]+) ([\d.]+) m \| ([\d.]+) ([\d.]+) l ')
RE_TEXT = re.compile(r'^TEXT (\w+)\s+([\d.]+) x=([\d.-]+) y=([\d.-]+) c=(\S+) "(.*)"$')

RIGHT = 806.89


def norm(s):
    return re.sub(r'[^a-z0-9]', '', (s or '').lower())


def _text(ops_line):
    m = RE_TEXT.match(ops_line)
    return dict(font=m[1], size=float(m[2]), x=float(m[3]), y=float(m[4]), color=m[5], text=m[6]) if m else None


def join_lines(lines):
    """pdfkit keeps the trailing space of a wrapped line, so concatenating restores the original text"""
    return ''.join(lines).strip()


def parse_room_tables(pages):
    """-> list of sections {title, cols[name], rows[{label, fill, cells[{text,color,req,reqcolor}]}]}; '(cont.)' merged"""
    sections = []
    for p in pages:
        cur = None        # current section
        mode = None       # 'bar' | 'head' | 'row'
        xs = []           # column left edges for the current header
        row = None
        pending_bar = False
        head_texts = []
        for l in p.ops:
            m = RE_FILL.match(l)
            if m and abs(float(m[1]) - 35.0) < 0.1 and abs(float(m[3]) - 771.89) < 0.1:
                fill, h = m[5], float(m[4])
                if fill == '#1A3566' and abs(h - 22) < 0.1:
                    mode = 'bar'; pending_bar = True; continue
                if fill == '#DCE8F5':
                    mode = 'head'; xs = []; head_texts = []; continue
                if fill in ('#FFFFFF', '#F0F4F8') and cur is not None:
                    if mode == 'head': _finish_head(cur, xs, head_texts)
                    mode = 'row'
                    row = dict(label_lines=[], fill=fill, cells=[dict(lines=[], req=[], color=None, reqcolor=None) for _ in cur['cols']])
                    cur['rows'].append(row); continue
            mv = RE_VLINE.match(l)
            if mv and mode == 'head' and abs(float(mv[1]) - float(mv[3])) < 0.01:
                x = float(mv[1])
                if x not in xs: xs.append(x)
                continue
            t = _text(l)
            if not t: continue
            if mode == 'bar' and pending_bar and t['font'] == 'Bold' and t['size'] == 9:
                title = t['text']
                base = re.sub(r'\s*\(cont\.\)\s*$', '', title)
                if title != base and sections and sections[-1]['title'] == base:
                    cur = sections[-1]; cur['_cont'] = True
                else:
                    cur = dict(title=base, cols=[], rows=[]); sections.append(cur)
                pending_bar = False; continue
            if mode == 'head' and t['size'] == 7.5 and t['font'] == 'Bold':
                head_texts.append(t); continue
            if mode == 'row' and row is not None:
                col = _col_of(cur.get('_xs', []), t['x'])
                if col is None:
                    if t['font'] == 'Semibold' and t['size'] == 7.5: row['label_lines'].append(t['text'])
                    continue
                c = row['cells'][col]
                if t['size'] == 6:
                    c['req'].append(t['text']); c['reqcolor'] = t['color']
                else:
                    c['lines'].append(t['text']); c['color'] = c['color'] or t['color']
    out = []
    for s in sections:
        rows = []
        for r in s['rows']:
            cells = []
            for c in r['cells']:
                text = join_lines(c['lines'])
                cells.append(dict(text=text, color=c['color'], req=join_lines(c['req']) or None, reqcolor=c['reqcolor']))
            rows.append(dict(label=join_lines(r['label_lines']), fill=r['fill'], cells=cells))
        out.append(dict(title=s['title'], cols=s['cols'], rows=rows))
    return out


def _finish_head(sec, xs, texts):
    xs = sorted(xs)
    cols = [[] for _ in xs]
    for t in texts:
        ci = _col_of(xs, t['x'])
        if ci is not None: cols[ci].append(t)
    names = [join_lines([t['text'] for t in sorted(c, key=lambda t: t['y'])]) for c in cols]
    if sec.get('_cont') and sec['cols']:
        sec['_xs'] = xs  # continuation: same columns
        return
    sec['cols'] = names
    sec['_xs'] = xs


def _col_of(xs, x):
    if not xs or x < xs[0] - 0.5: return None
    for i in range(len(xs)):
        right = xs[i + 1] if i + 1 < len(xs) else RIGHT
        if xs[i] - 0.5 <= x < right: return i
    return None


def key_for_label(cfg, label):
    for k, lab in cfg['labels'].items():
        if lab == label: return k
    # fallback: lower camel of the label
    w = re.sub(r'[^A-Za-z0-9 ]', ' ', label).split()
    return (w[0].lower() + ''.join(x[:1].upper() + x[1:] for x in w[1:])) if w else norm(label)


def room_id_for(cfg, chapter, name):
    rooms = cfg['rooms'].get(chapter) or []
    for r in rooms:
        disp = re.sub(r'\s*\(parking area\)', '', r['name'], flags=re.I)
        if norm(disp) == norm(name) or norm(r['name']) == norm(name): return r['id'], True
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-'), False


def split_multi(cfg, key, text):
    """multiselect values were printed joined with ', ' — split back, keeping known options intact"""
    opts = cfg['options'].get(key, [])
    parts = [x for x in text.split(', ')]
    out, i = [], 0
    while i < len(parts):
        # greedily merge parts while the merged string is a known option containing ', '
        best = parts[i]; j = i
        for k in range(i + 1, len(parts)):
            cand = ', '.join(parts[i:k + 1])
            if cand in opts: best, j = cand, k
        out.append(best); i = j + 1
    return out


def chapter_for_section(cfg, title):
    for cid, t in cfg['sections'].items():
        if norm(t) == norm(title): return cid
    return None


def sections_to_data(cfg, sections, notes, on_cell=None):
    """sections -> SpecData dict. Rows keep their printed order; all-empty rows that the original counted for its
    zebra striping (but did not print) are re-inserted as empty keys so the stripes come out the same."""
    data = {}
    for s in sections:
        chapter = chapter_for_section(cfg, s['title'])
        if not chapter:
            notes.append(f'unknown section "{s["title"]}" skipped'); continue
        keys, used = [], set()
        for r in s['rows']:
            k = key_for_label(cfg, r['label'])
            if k not in cfg['labels']: notes.append(f'{s["title"]}: unknown row "{r["label"]}" stored as "{k}"')
            keys.append(k); used.add(k)
        # stripe reconstruction: white rows have even index, striped rows odd
        spare = [k for k in cfg['fieldKeys'] if k not in used]
        order, idx = [], -1
        for k, r in zip(keys, s['rows']):
            want = 1 if r['fill'] == '#F0F4F8' else 0
            idx += 1
            while idx % 2 != want:
                filler = spare.pop(0) if spare else f'_empty{idx}'
                order.append((filler, None)); idx += 1
            order.append((k, r))
        rooms = []
        for name in s['cols']:
            rid, ok = room_id_for(cfg, chapter, name)
            if not ok: notes.append(f'{s["title"]}: unknown room column "{name}" stored as "{rid}"')
            rooms.append(rid)
        for ci, rid in enumerate(rooms):
            entry = {}
            for k, r in order:
                if r is None:
                    entry[k] = [] if k in cfg['arrayKeys'] else ''; continue
                c = r['cells'][ci]
                v = '' if (c['text'] == '-' and c['color'] == '#64748B') else c['text']
                if k in cfg['arrayKeys']: v = split_multi(cfg, k, v) if v else []
                entry[k] = v
                if on_cell and v not in ('', []): on_cell(chapter, rid, k, c)
            data[f'{chapter}_{rid}'] = entry
    return data
