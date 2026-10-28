import sys, glob, build, pdfmodel
for f in sorted(glob.glob('../noida/*.pdf'))+['../full204/full.pdf']:
    ps=pdfmodel.load(f); seg=build.segment(ps)
    print(f.split('/')[-1], [(p.no, p.title[:45], len(p.body_texts())) for p in seg['projectLevel']])
