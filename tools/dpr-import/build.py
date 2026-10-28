"""build.py <pdf> <outdir> [--project-json '{...}'] [--only MOD,MOD]
Segments a vendor DPR into modules, runs parsers/<mod>.py, writes outdir/data.json (+images/), then re-renders
with our generator and compares every page with the original (outdir/roundtrip.txt)."""
import sys, os, json, re, importlib, subprocess, shutil, argparse
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import pdfmodel

MODS = ['projectDetails','unitLevel','projectLevel','structure','mep','idSpecs','commonArea','landscape','serviceDesign','contracting','consultant','phasing','schedule','approvals','additional']
MODULE_NAMES = {'projectDetails':'Project Details + Layout Plans','unitLevel':'Unit Level Design','projectLevel':'Project Level Design','structure':'Structure','mep':'MEP',
  'idSpecs':'ID Specifications','commonArea':'Common Area','landscape':'Landscape & Amenities','serviceDesign':'Service Design Consideration','contracting':'Contracting Strategy',
  'consultant':'Consultant Strategy','phasing':'Phasing Plan','schedule':'Project Schedule','approvals':'Approvals','additional':'Additional Project Details'}

def classify(title):
    t = title.lower()
    if t.startswith('project brief – key highlights'): return 'index'
    if 'area ratios' in t: return 'projectLevel'
    if t.startswith('project brief') or t.startswith('project layout'): return 'projectDetails'
    if 'unit level' in t or 'calculations (far' in t: return 'unitLevel'
    if any(k in t for k in ('development area statement','project level','key ratio','additional elements','area statement')): return 'projectLevel'
    if 'structural' in t: return 'structure'
    if 'mep' in t: return 'mep'
    if 'id specification' in t or 'kitchen goods' in t: return 'idSpecs'
    if 'common area' in t: return 'commonArea'
    if 'landscape' in t: return 'landscape'
    if 'service design' in t: return 'serviceDesign'
    if 'contracting' in t: return 'contracting'
    if 'consultant' in t: return 'consultant'
    if 'phasing' in t: return 'phasing'
    if 'schedule' in t: return 'schedule'
    if 'approval' in t: return 'approvals'
    if 'additional project' in t: return 'additional'
    if t == 'thank you': return 'end'
    return None

def segment(pages):
    seg = {m: [] for m in MODS}; prev = None
    for p in pages[2:-1]:
        m = classify(p.title)
        if m is None:
            # blank / unknown title: blank after key ratio -> projectLevel; blank after service design -> contracting; unknown after additional -> additional
            if not p.title: m = 'contracting' if prev in ('serviceDesign','contracting', None) else prev
            else: m = 'additional' if prev == 'additional' else prev
        if m in seg: seg[m].append(p)
        prev = m
    return seg

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('pdf'); ap.add_argument('out'); ap.add_argument('--project-json', default='{}'); ap.add_argument('--only', default='')
    ap.add_argument('--no-render', action='store_true')
    a = ap.parse_args(); a.out = os.path.abspath(a.out)
    os.makedirs(a.out, exist_ok=True); img_dir = os.path.join(a.out, 'images')
    pages = pdfmodel.load(a.pdf, img_dir)
    # project meta from the content-page header line "name  |  location  |  type  |  category"
    sub = next((t['text'] for p in pages[1:] for t in p.texts if t['size'] == 7.5 and t['y'] < 45), '')
    parts = [s.strip() for s in sub.split('  |  ')]
    project = dict(name=parts[0] if parts else '', location=parts[1] if len(parts) > 1 else '', projectType=parts[2] if len(parts) > 2 else 'residential', category=parts[3] if len(parts) > 3 else '')
    project.update(json.loads(a.project_json))
    seg = segment(pages)
    ctx = dict(project=project, img_dir=img_dir, pdf=a.pdf)
    data = dict(project=project, summary={}, structure=None, mep=None, inferred={}, notes=[], segments={m: [p.no for p in v] for m, v in seg.items()})
    only = set(a.only.split(',')) - {''}
    for m in MODS:
        if only and m not in only: continue
        try:
            mod = importlib.import_module(f'parsers.{m}')
        except ModuleNotFoundError:
            data['notes'].append(f'{m}: no parser yet'); continue
        r = mod.parse(seg[m], ctx) or {}
        data['summary'].update(r.get('summary', {}))
        for k in ('structure', 'mep'):
            if r.get(k) is not None: data[k] = r[k]
        for k, v in (r.get('inferred') or {}).items():
            if isinstance(v, dict): data['inferred'].setdefault(k, {}).update(v)
            else: data['inferred'][k] = v
        data['notes'] += [f'{m}: {n}' for n in r.get('notes', [])]
    for k, v in (data['inferred'].get('projectFields') or {}).items():
        if v not in (None, '') and not data['project'].get(k): data['project'][k] = v
    json.dump(data, open(os.path.join(a.out, 'data.json'), 'w'), indent=1, ensure_ascii=False)
    if not a.no_render: roundtrip(a, pages, data, seg, only)

def roundtrip(a, pages, data, seg, only):
    inf = data['inferred']
    fx = dict(project=data['project'], summary=json.loads(json.dumps(data['summary'])), structure=data['structure'], mep=data['mep'],
              benchmarks=inf.get('benchmarks', {}), moduleChapters=inf.get('moduleChapters', {}), compareProjects=inf.get('compareProjects', []),
              date=inf.get('date', '2026-10-28T10:00:00'))
    # images: "image:<file>" -> absolute path for the preview renderer
    def fix(v):
        if isinstance(v, dict): return {k: fix(x) for k, x in v.items()}
        if isinstance(v, list): return [fix(x) for x in v]
        if isinstance(v, str) and v.startswith('image:'): return os.path.join(a.out, 'images', v[6:])
        return v
    fx = fix(fx)
    fxp = os.path.join(a.out, 'fixture.json'); json.dump(fx, open(fxp, 'w'))
    mods = [m for m in MODS if (not only or m in only)]
    out = os.path.join(a.out, 'mine.pdf')
    r = subprocess.run(['npx', 'tsx', 'scripts/dpr-preview.ts', fxp, out, ','.join(MODULE_NAMES[m] for m in mods)], cwd=os.path.join(HERE, '../../backend'), capture_output=True, text=True)
    if r.returncode: print('render failed', r.stderr[-2000:]); return
    mine = pdfmodel.load(out)
    mseg = segment(mine)
    lines = []
    import difflib
    tot = 0
    for m in mods:
        A, B = seg[m], mseg[m]
        if len(A) != len(B): lines.append(f'{m}: PAGE COUNT ref {len(A)} vs mine {len(B)}  ref titles {[p.title for p in A]} mine {[p.title for p in B]}')
        for pa, pb in zip(A, B):
            norm = lambda ops: [re.sub(r'^IMAGE /I\d+ ', 'IMAGE ', l) for l in ops if 'x=35.0 y=40.6' not in l]
            oa = norm(pa.ops); ob = norm(pb.ops)
            d = [x for x in difflib.unified_diff(oa, ob, lineterm='', n=0) if x[:1] in '+-' and x[:3] not in ('+++', '---')]
            tot += len(d)
            lines.append(f'{m}: ref p{pa.no} {pa.title!r} vs mine p{pb.no}: {len(d)} diff lines')
            lines += ['    ' + x for x in d[:int(os.environ.get('N', '12'))]]
    open(os.path.join(a.out, 'roundtrip.txt'), 'w').write('\n'.join(lines))
    print('\n'.join(l for l in lines if not l.startswith('    ')))
    print('TOTAL diff lines', tot)

if __name__ == '__main__': main()
