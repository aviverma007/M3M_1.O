"""Decompile PDFKit pages into readable ops: rects, fills, text (decoded) with font weight."""
import pypdf, glob, re, sys, io, os
from fontTools.ttLib import TTFont
GS={os.path.basename(f).split('-')[1].split('.')[0]:TTFont(f) for f in glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)),'../../backend/assets/dpr/GeneralSans-*.ttf'))}
def weight(data):
    t=TTFont(io.BytesIO(data)); adv=set(w for w,_ in t['hmtx'].metrics.values())
    return sorted((len(adv-set(w for w,_ in g['hmtx'].metrics.values())),n) for n,g in GS.items())[0][1]
def cmap(tu):
    m={}
    s=tu.get_data().decode('latin1')
    for blk in re.findall(r'beginbfrange(.*?)endbfrange',s,re.S):
        for a,b,rest in re.findall(r'<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(\[.*?\]|<[0-9a-fA-F]+>)',blk,re.S):
            a=int(a,16);b=int(b,16)
            if rest.startswith('['):
                vals=[x.replace(' ','') for x in re.findall(r'<([0-9a-fA-F ]+)>',rest)]
                for i,v in enumerate(vals): m[a+i]=bytes.fromhex(v).decode('utf-16-be')
            else:
                v=int(rest[1:-1],16)
                for i in range(b-a+1): m[a+i]=chr(v+i)
    for blk in re.findall(r'beginbfchar(.*?)endbfchar',s,re.S):
        for a,v in re.findall(r'<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>',blk): m[int(a,16)]=bytes.fromhex(v).decode('utf-16-be')
    return m
def run(path, pages=None):
    r=pypdf.PdfReader(path); out=[]
    for pi,p in enumerate(r.pages):
        if pages and pi+1 not in pages: continue
        fonts={}
        for k,v in p['/Resources'].get('/Font',{}).items():
            v=v.get_object(); d=v['/DescendantFonts'][0].get_object(); fd=d['/FontDescriptor'].get_object()
            fonts[k]=(weight(fd['/FontFile2'].get_object().get_data()), cmap(v['/ToUnicode'].get_object()))
        s=p.get_contents().get_data().decode('latin1')
        out.append(f'===== PAGE {pi+1}')
        font=None; size=None; color=None; tm=None
        for line in s.split('\n'):
            line=line.strip()
            m=re.match(r'^/(F\d+) ([\d.]+) Tf$',line)
            if m: font=fonts['/'+m.group(1)]; size=m.group(2); continue
            m=re.match(r'^1 0 0 1 ([\d.-]+) ([\d.-]+) Tm$',line)
            if m: tm=(float(m.group(1)),595.28-float(m.group(2))); continue
            if line.endswith('TJ'):
                txt=''.join(font[1].get(int(h[i:i+4],16),'?') for h in re.findall(r'<([0-9a-f]+)>',line) for i in range(0,len(h),4))
                out.append(f'TEXT {font[0]:8s} {size:>5} x={tm[0]:.1f} y={tm[1]:.1f} c={color} "{txt}"'); continue
            if line.endswith(' scn') and not line.startswith('/'):
                c=[float(x) for x in line.split()[:3]]; color='#%02X%02X%02X'%tuple(round(x*255) for x in c); out.append('fill '+color); continue
            if line.endswith(' SCN'):
                c=[float(x) for x in line.split()[:3]]; out.append('stroke #%02X%02X%02X'%tuple(round(x*255) for x in c)); continue
            if line in ('BT','ET','q','Q','/DeviceRGB cs','/DeviceRGB CS','1 0 0 -1 0 595.28 cm'): continue
            out.append(line)
    return '\n'.join(out)
if __name__=='__main__':
    pages=[int(x) for x in sys.argv[2].split(',')] if len(sys.argv)>2 else None
    print(run(sys.argv[1],pages))
