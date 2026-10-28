"""Shared helpers for the landscape / serviceDesign / structure / mep parsers."""
import re

FILL_RE = re.compile(r'^FILL re ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) fill=(\S+)')
TEXT_RE = re.compile(r'^TEXT (\w+)\s+([\d.]+) x=([\d.-]+) y=([\d.-]+) c=(\S+) "(.*)"$')

GREEN, RED = '#16A34A', '#DC2626'
NAVY, BAND = '#1A3566', '#1E3A5F'


def text(l):
    m = TEXT_RE.match(l)
    return dict(font=m[1], size=float(m[2]), x=float(m[3]), y=float(m[4]), color=m[5], text=m[6]) if m else None


def empty_page(pages):
    """True when the module consists of a single 'No … configured/submitted' message page"""
    if len(pages) != 1:
        return False
    bt = pages[0].body_texts()
    return len(bt) == 1 and bt[0]['text'].startswith('No ')


def param_rows(pages):
    """Rows of the 'Parameter | Details' table (structure / MEP / service design).
    -> list of dict(section, label, value, unit, req, color)  (section None for rows printed without a band)"""
    rows = []
    section = None
    for p in pages:
        cur = None
        mode = None  # 'header' | 'band' | 'row'
        for l in p.ops:
            f = FILL_RE.match(l)
            if f and float(f[1]) == 35.0 and abs(float(f[3]) - 730.0) < 0.5:
                fill = f[5]
                if fill == NAVY:
                    mode = 'header'
                elif fill == BAND:
                    mode = 'band'
                    section = None
                else:
                    mode = 'row'
                    cur = dict(section=section, label=[], value=[], unit=None, req=[], color=None)
                    rows.append(cur)
                continue
            t = text(l)
            if not t or not (62 < t['y'] < 570):
                continue
            if mode == 'band':
                section = t['text'] if section is None else section + ' ' + t['text']
                continue
            if mode != 'row' or cur is None:
                continue
            if t['x'] < 335:
                cur['label'].append(t['text'])
            elif t['size'] == 7:
                cur['req'].append(t['text'])
            elif t['font'] == 'Regular' and cur['value']:
                cur['unit'] = t['text'].strip()
            else:
                cur['value'].append(t['text'])
                cur['color'] = t['color']
    out = []
    for r in rows:
        req = ''.join(r['req'])
        out.append(dict(section=r['section'], label=''.join(r['label']), value=''.join(r['value']), unit=r['unit'],
                        req=req[5:] if req.startswith('Req: ') else (req or None), color=r['color']))
    return out


def custom_key(label):
    """inverse of the report's label transform key.replace(/([A-Z])/g, ' $1') (labels starting with a space)"""
    if label.startswith(' '):
        return re.sub(r' (?=[A-Z])', '', label)
    return label
