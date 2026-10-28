import sys, pdfmodel
pdf=sys.argv[1]; pgs=[int(x) for x in sys.argv[2].split(',')]
ps=pdfmodel.load(pdf)
for p in ps:
    if p.no in pgs:
        print('=== PAGE', p.no, repr(p.title))
        for l in p.ops:
            if 'y=28.1' in l or 'y=40.6' in l or 'y=586.4' in l: continue
            print(l)
