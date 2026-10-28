/* Unit Level Design calculations (shared by the Unit Level Design page and the DPR PDF export). */
import type { Typology } from '@/types/chapters-a'

const n = (v: unknown) => parseFloat(String(v ?? '')) || 0

/** "Calculations" table value */
export function calcValue(t: Typology, row: string) {
  const covered = n(t.coveredArea)
  const uf = n(t.unitFar)
  const bf = n(t.balconyAreaFar)
  const bnf = n(t.balconyAreaNonFar)
  const circ = n(t.circulationFar)
  const wall = n(t.wallArea)
  const ac = n(t.acArea)
  const farBal = uf + bf
  const bal = bf + bnf
  const v: Record<string, number | null> = {
    'Unit FAR (exc. Balcony)': uf || null,
    'Balcony Area (FAR)': bf || null,
    'Core Area (Non Saleable FAR)': circ || null,
    'Balcony FAR + Unit Far': uf || bf ? farBal : null,
    'Total Unit FAR (Unit + Balcony + Circulation)': uf || bf || circ ? farBal + circ : null,
    'Unit Covered Area': covered || null,
    'Balcony Area (FAR + Non-FAR)': bf || bnf ? bal : null,
    'Total Unit Area (Covered + Balcony)': covered || bf || bnf ? covered + bal : null,
    'Wall Area': wall || null,
    'AC Area': ac || null,
  }
  const x = v[row]
  return x != null ? String(x) : '--'
}

const ratio = (a: number, b: number, pct = false) => (!b || isNaN(a) || isNaN(b) ? '--' : pct ? ((a / b) * 100).toFixed(2) + '%' : (a / b).toFixed(2))
export function efficiencies(t: Typology): Record<string, string> {
  const s = n(t.saleableArea)
  const covered = n(t.coveredArea)
  const carpet = n(t.carpetArea)
  const bal = n(t.balconyAreaFar) + n(t.balconyAreaNonFar)
  const circ = n(t.circulationFar)
  const totalFar = n(t.unitFar) + n(t.balconyAreaFar) + circ
  return {
    'CA/SA': ratio(carpet, s, false),
    'Balcony/SA': ratio(bal, s, true),
    'Core Area Efficiency': ratio(circ, totalFar, true),
    'Unit Area (Covered + Balcony) to Saleable': ratio(covered + bal, s, true),
  }
}

