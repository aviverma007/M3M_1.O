/**
 * Minimal text-only PDF writer used by the design-brief mock download endpoints
 * (the real backend renders these PDFs server side).
 */

const esc = (s: string) =>
  s
    .replace(/[^\x20-\x7e]/g, (c) => ({ '•': '-', '–': '-', '—': '-', '’': "'", '“': '"', '”': '"' })[c] ?? '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')

export type PdfLine = { text: string; size?: number; bold?: boolean; gap?: number }

function wrap(text: string, size: number) {
  const max = Math.floor(500 / (size * 0.52))
  const out: string[] = []
  for (const para of text.split('\n')) {
    let line = ''
    for (const word of para.split(' ')) {
      if ((line + ' ' + word).trim().length > max) {
        if (line) out.push(line)
        line = word
      } else line = (line + ' ' + word).trim()
    }
    out.push(line)
  }
  return out
}

export function buildPdf(lines: PdfLine[]): Blob {
  // lay out into pages
  const pages: string[] = []
  let ops: string[] = []
  let y = 800
  const flush = () => {
    pages.push(ops.join('\n'))
    ops = []
    y = 800
  }
  for (const l of lines) {
    const size = l.size ?? 10
    y -= l.gap ?? 0
    for (const part of wrap(l.text, size)) {
      if (y < 50) flush()
      ops.push(`BT /${l.bold ? 'F2' : 'F1'} ${size} Tf 48 ${y} Td (${esc(part)}) Tj ET`)
      y -= size + 5
    }
  }
  flush()

  const objs: string[] = []
  const add = (s: string) => objs.push(s) // object number = index + 1
  add('<< /Type /Catalog /Pages 2 0 R >>')
  add('') // pages placeholder
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')
  const kids: number[] = []
  for (const content of pages) {
    add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
    const contentNo = objs.length
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNo} 0 R >>`)
    kids.push(objs.length)
  }
  objs[1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`

  let out = '%PDF-1.4\n'
  const offsets: number[] = []
  objs.forEach((o, i) => {
    offsets.push(out.length)
    out += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  offsets.forEach((o) => (out += `${String(o).padStart(10, '0')} 00000 n \n`))
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([out], { type: 'application/pdf' })
}
