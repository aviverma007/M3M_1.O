import sys,os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import sys,json,pdfmodel,build
pdf=sys.argv[1]; mods=sys.argv[2].split(',')
ps=pdfmodel.load(pdf); seg=build.segment(ps)
for m in mods:
    for p in seg[m]:
        bt=p.body_texts()
        print(f'--- {m} p{p.no} {p.title!r} ntexts={len(bt)}')
        if len(sys.argv)>3:
            for t in bt: print(f"   {t['font'][:4]} {t['size']:4} x={t['x']:6.1f} y={t['y']:6.1f} {t['color']} {t['text']}")
        else:
            print('   ', ' | '.join(t['text'] for t in bt)[:600])
