"""Table reading helpers for the list chapters (contracting / consultant / schedule / approvals / additional)."""
import re

FILL_RE = re.compile(r'^FILL re ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) fill=(#[0-9A-F]{6})')
VLINE_RE = re.compile(r'^STROKE ([\d.-]+) ([\d.-]+) m \| ([\d.-]+) ([\d.-]+) l .*lw=0\.5')
NAVY = '#1A3566'
ROW_FILLS = {'#FFFFFF', '#F0F4F8', '#DCE8F7'}


def fills(page):
    out = []
    for l in page.ops:
        m = FILL_RE.match(l)
        if m:
            out.append(dict(x=float(m[1]), y=float(m[2]), w=float(m[3]), h=float(m[4]), fill=m[5]))
    return out


def header_rects(page):
    """navy table headers below the page header"""
    return [f for f in fills(page) if f['fill'] == NAVY and f['y'] >= 70 and f['y'] < 560]


def header_columns(page, hdr):
    """column left edges of a table header (table x + separator lines inside the header)"""
    xs = [hdr['x']]
    for l in page.ops:
        m = VLINE_RE.match(l)
        if m and float(m[1]) == float(m[3]) and hdr['y'] < float(m[2]) < hdr['y'] + hdr['h'] and hdr['x'] < float(m[1]) < hdr['x'] + hdr['w']:
            xs.append(float(m[1]))
    xs = sorted(set(xs))
    labels = []
    for i, x in enumerate(xs):
        x2 = xs[i + 1] if i + 1 < len(xs) else hdr['x'] + hdr['w']
        ts = [t for t in page.texts if t['color'] == '#FFFFFF' and x <= t['x'] < x2 and hdr['y'] < t['y'] < hdr['y'] + hdr['h']]
        labels.append(join(ts))
    return xs, labels


def join(ts):
    """concatenate wrapped lines (pdfkit keeps the trailing space of a wrapped line)"""
    ts = sorted(ts, key=lambda t: (round(t['y'], 1), t['x']))
    return ''.join(t['text'] for t in ts)


def cell_texts(page, x1, x2, y1, y2):
    return sorted([t for t in page.texts if x1 <= t['x'] < x2 and y1 < t['y'] < y2 and t['color'] != '#FFFFFF'], key=lambda t: (t['y'], t['x']))


def rows_of(page, hdr, row_x=None):
    """zebra/styled row rectangles below a header (optionally only rows starting at row_x)"""
    bottom = hdr['y'] + hdr['h']
    rx = hdr['x'] if row_x is None else row_x
    return [f for f in fills(page) if f['fill'] in ROW_FILLS and abs(f['x'] - rx) < 0.05 and f['y'] >= bottom - 0.05]


def read_table(page, hdr=None):
    """simple table -> (labels, [ {cells:[str], fill, bold} ]) ; empty-dash cells become ''"""
    hdr = hdr or header_rects(page)[0]
    xs, labels = header_columns(page, hdr)
    right = hdr['x'] + hdr['w']
    out = []
    for r in rows_of(page, hdr):
        cells, bold = [], False
        for i, x in enumerate(xs):
            x2 = xs[i + 1] if i + 1 < len(xs) else right
            ts = cell_texts(page, x, x2, r['y'], r['y'] + r['h'])
            bold = bold or any(t['font'] == 'Bold' for t in ts)
            cells.append(undash(join(ts)))
        out.append(dict(cells=cells, fill=r['fill'], bold=bold, y=r['y'], h=r['h']))
    return labels, out


def undash(s):
    return '' if s.strip() == '-' else s
