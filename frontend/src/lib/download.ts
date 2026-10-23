/** Trigger a browser download of `data` (same helper as original). */
export function downloadBlob(data: BlobPart, fileName: string, type = 'application/pdf') {
  const url = window.URL.createObjectURL(new Blob([data], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    a.remove()
    window.URL.revokeObjectURL(url)
  }, 200)
}

/** Build and download a CSV from rows (used by "Download Inputs" / exports in mock mode). */
export function downloadCsv(fileName: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: unknown) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  downloadBlob(rows.map((r) => r.map(esc).join(',')).join('\n'), fileName, 'text/csv')
}
