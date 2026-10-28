import sys,re
lines=open(sys.argv[1]).read().split('\n')
out=[];i=0;fill=None;stroke=None;lw=None;path=[]
while i<len(lines):
    l=lines[i]
    if l.startswith('fill '): fill=l[5:]; i+=1; continue
    if l.startswith('stroke '): stroke=l[7:]; i+=1; continue
    m=re.match(r'^([\d.]+) w$',l)
    if m: lw=m.group(1); i+=1; continue
    if l.endswith(' re'): path.append('re '+' '.join(str(round(float(x),2)) for x in l.split()[:4])); i+=1; continue
    if l.endswith(' m') or l.endswith(' l') or l.endswith(' c') or l=='h':
        path.append(l); i+=1; continue
    if l in ('f','S','B','f*','W n','n') or l.startswith('/Pattern') or l.startswith('/Sh'):
        if l.startswith('/'): i+=1; continue
        p=path; path=[]
        # circle detection
        cs=[x for x in p if x.endswith(' c')]
        if len(cs)==4 and p[0].endswith(' m'):
            xs=[float(v) for x in p if not x=='h' for v in x.split()[:-1][::2]]
            ys=[float(v) for x in p if not x=='h' for v in x.split()[:-1][1::2]]
            desc=f'circle c=({(max(xs)+min(xs))/2:.1f},{(max(ys)+min(ys))/2:.1f}) r={(max(xs)-min(xs))/2:.2f}'
        elif len(cs)>0: desc=f'roundpath {p[0]} ... ({len(p)} segs)'
        else: desc=' | '.join(p)
        out.append(f'{ {"f":"FILL","S":"STROKE","B":"FILLSTROKE"}.get(l,l)} {desc} fill={fill if l!="S" else ""} stroke={stroke if l!="f" else ""} lw={lw if l!="f" else ""}')
        i+=1; continue
    if l.endswith(' cm') and i+1<len(lines) and lines[i+1].endswith('Do'):
        a=[float(x) for x in l.split()[:6]]; out.append(f'IMAGE {lines[i+1].split()[0]} x={a[4]:.1f} ytop={a[5]+a[3]:.1f} w={a[0]:.1f} h={-a[3]:.1f}'); i+=2; continue
    out.append(l); i+=1
print('\n'.join(out))
