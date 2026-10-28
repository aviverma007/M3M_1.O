"""Page model for parsing vendor DPR PDFs.
load(pdf) -> list[Page]; Page has: no (1-based), title, ops (condensed op strings, same format as cmp.py output),
texts (list of dict x,y(baseline),font('Regular'|'Semibold'|'Bold'),size,color,text), images (list of dict x,ytop,w,h,name,file)."""
import os, re, subprocess, json, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import decomp

TEXT_RE = re.compile(r'^TEXT (\w+)\s+([\d.]+) x=([\d.-]+) y=([\d.-]+) c=(\S+) "(.*)"$')
IMG_RE = re.compile(r'^IMAGE (\S+) x=([\d.-]+) ytop=([\d.-]+) w=([\d.-]+) h=([\d.-]+)$')

class Page:
    def __init__(self, no, ops):
        self.no = no; self.ops = ops; self.texts = []; self.images = []
        for l in ops:
            m = TEXT_RE.match(l)
            if m:
                self.texts.append(dict(font=m[1], size=float(m[2]), x=float(m[3]), y=float(m[4]), color=m[5], text=m[6]))
            m = IMG_RE.match(l)
            if m:
                self.images.append(dict(name=m[1], x=float(m[2]), ytop=float(m[3]), w=float(m[4]), h=float(m[5]), file=None))
        hdr = [t for t in self.texts if t['size'] == 15 and t['y'] < 40 and t['color'] == '#FFFFFF']
        self.title = hdr[0]['text'] if hdr else ''
    def body_texts(self):
        """texts below the header and above the footer"""
        return [t for t in self.texts if 62 < t['y'] < 570]
    def __repr__(self): return f'<Page {self.no} {self.title!r}>'

def _condense(raw):
    tmp = f'/tmp/_pm{os.getpid()}'
    open(tmp, 'w').write(raw)
    out = subprocess.run(['python3', os.path.join(HERE, 'condense.py'), tmp], capture_output=True, text=True).stdout
    return [l for l in out.split('\n') if l and not l.startswith('=====')]

def load(pdf, img_dir=None):
    """parse every page; when img_dir is given, extracts embedded images (logo excluded) and links them to page images in draw order"""
    import pypdf
    n = len(pypdf.PdfReader(pdf).pages)
    raw = decomp.run(os.path.abspath(pdf))
    chunks = re.split(r'^===== PAGE (\d+)$', raw, flags=re.M)
    pages = []
    for i in range(1, len(chunks), 2):
        pages.append(Page(int(chunks[i]), _condense(chunks[i + 1])))
    if img_dir:
        os.makedirs(img_dir, exist_ok=True)
        _extract_images(pdf, pages, img_dir)
    return pages

def _extract_images(pdf, pages, img_dir):
    """extract images per page via pypdf XObjects in draw order; skip the 351x75 logo"""
    import pypdf
    r = pypdf.PdfReader(pdf)
    for p in pages:
        pg = r.pages[p.no - 1]
        xo = pg['/Resources'].get('/XObject', {}) if '/Resources' in pg else {}
        for im in p.images:
            key = im['name']
            if key not in xo: continue
            obj = xo[key].get_object()
            if im['ytop'] < 62 or (p.no == 1 and abs(im['ytop'] - 104) < 1): im['logo'] = True; continue
            try:
                from pypdf.generic import IndirectObject
                img = pypdf.filters._xobj_to_image(obj)  # (ext, data) or ImageFile depending on version
            except Exception:
                img = None
            fn = None
            try:
                imgs = {i.name.split('.')[0]: i for i in pg.images}
                cand = imgs.get(key.lstrip('/'))
                if cand is not None:
                    ext = os.path.splitext(cand.name)[1] or '.png'
                    fn = os.path.join(img_dir, f'p{p.no:03d}_{key.lstrip("/")}{ext}')
                    if ext.lower() in ('.jpg', '.jpeg'): open(fn, 'wb').write(cand.data)
                    else: cand.image.save(fn if ext.lower() == '.png' else fn + '.png'); fn = fn if ext.lower()=='.png' else fn + '.png'
            except Exception as e:
                fn = None
            im['file'] = fn

if __name__ == '__main__':
    ps = load(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
    for p in ps: print(p.no, repr(p.title), len(p.texts), 'texts', [(i['w'], i['h'], i.get('file')) for i in p.images if not i.get('logo')])
