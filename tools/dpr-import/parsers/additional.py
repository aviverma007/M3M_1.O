"""Additional Project Details -> summary.additionalProjectDetailsData [{id, subject, description, files}]"""
import os, re
from .cs_common import header_rects, header_columns, rows_of, cell_texts, join, undash

LINK = '#1A56DB'
IMG = re.compile(r'\.(png|jpe?g)$', re.I)


def parse(pages, ctx):
    details = []
    attach = []  # (subject, image file) from the attachment pages, in order
    for p in pages:
        hs = header_rects(p)
        if hs and p.title.startswith('Additional Project Development'):
            hdr = hs[0]
            xs, _ = header_columns(p, hdr)
            right = hdr['x'] + hdr['w']
            for r in rows_of(p, hdr):
                y1, y2 = r['y'], r['y'] + r['h']
                subj = undash(join(cell_texts(p, xs[0], xs[1], y1, y2)))
                desc = undash(join(cell_texts(p, xs[1], xs[2], y1, y2)))
                files = []
                for t in cell_texts(p, xs[2], right, y1, y2):
                    if t['text'].strip() == '-' and not files:
                        continue
                    files.append({'name': t['text'], 'url': ''} if t['color'] == LINK else t['text'])
                details.append(dict(id=len(details) + 1, subject=subj, description=desc, files=files))
        elif p.title and not hs:
            if p.title == 'Additional Project Details':
                continue  # empty state
            for im in p.images:
                if im.get('file') and not im.get('logo') and im['ytop'] > 62:
                    attach.append((p.title, im['file']))
    if not details:
        return {'summary': {}, 'notes': ['no additional project details configured (form shows its two default rows)']}
    notes = []
    for subj, f in attach:
        d = next((d for d in details if d['subject'] == subj), None)
        if not d:
            notes.append(f'attachment page "{subj}" has no matching detail row'); continue
        slot = next((x for x in d['files'] if isinstance(x, dict) and not x['url'] and IMG.search(x['name'])), None)
        if slot is None:
            notes.append(f'attachment image on "{subj}" has no matching image file name'); continue
        slot['url'] = 'image:' + os.path.basename(f)
    lost = [x['name'] for d in details for x in d['files'] if isinstance(x, dict) and not x['url']]
    if lost:
        notes.append('uploaded files not embedded in the DPR (names kept, files must be re-uploaded): ' + ', '.join(lost))
    return {'summary': {'additionalProjectDetailsData': details}, 'notes': notes}
