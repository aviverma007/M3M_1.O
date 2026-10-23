/**
 * Benchmark checking — same rules as the original app.
 *
 * GET /benchmark returns a map: normalizedFieldKey -> { benchmarkValue, validOptions[] }.
 * A value "deviates" when it is outside a numeric range, below a minimum,
 * contradicts a yes/no benchmark, or isn't one of the valid options.
 */
import { useEffect, useState } from 'react'
import { http, type ApiEnvelope } from '@/api/http'

export type Benchmark = { benchmarkValue?: string; validOptions?: string[] }
export type BenchmarkMap = Record<string, Benchmark>

/** normalise a field label to a benchmark key */
export function normalizeKey(label: unknown) {
  return String(label || '')
    .replace(/\s*[–—-]+\s*(Benchmark\s*)?(Req(uired)?\.?)$/i, '')
    .replace(/[()]/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9 %]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** true when `value` deviates from benchmark `b` */
export function isDeviation(value: unknown, b?: Benchmark | null) {
  if (!b) return false
  const v = String(value ?? '').trim()
  if (!v || v === '-' || /^not\s+(stated|found|provided|applicable)$/i.test(v)) return true
  const bv = String(b.benchmarkValue || '').trim()
  if (!bv || /^not\s+(stated|found|explicitly)/i.test(bv)) {
    if (b.validOptions?.length) {
      const lv = v.toLowerCase()
      if (!b.validOptions.some((o) => lv.includes(o.toLowerCase()) || o.toLowerCase().includes(lv))) return true
    }
    return false
  }
  if ((/^yes\b/i.test(bv) && /^no$/i.test(v)) || (/^no\b/i.test(bv) && /^yes$/i.test(v))) return true
  const range = bv.match(/([0-9]+(?:\.[0-9]+)?)\s*%?\s*(?:[-–—]|to)\s*([0-9]+(?:\.[0-9]+)?)/i)
  if (range) {
    const lo = parseFloat(range[1])
    const hi = parseFloat(range[2])
    const n = parseFloat(v.replace(/[^0-9.]/g, ''))
    return !isNaN(lo) && !isNaN(hi) && !isNaN(n) ? n < lo || n > hi : false
  }
  const min = bv.match(/^([0-9]+(?:\.[0-9]+)?)/)
  if (min) {
    const m = parseFloat(min[1])
    if (!isNaN(m) && m !== 0) {
      const n = parseFloat(v.replace(/[^0-9.]/g, ''))
      if (!isNaN(n)) return n < m
    }
    return false
  }
  if (b.validOptions?.length) {
    const norm = (s: string) => s.toLowerCase().replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim()
    const nv = norm(v)
    const nb = norm(bv)
    const matching = b.validOptions.filter((o) => nb.includes(norm(o)))
    if (matching.length === 1) {
      const m = norm(matching[0])
      if (!nv.includes(m) && !m.includes(nv)) return true
    } else if (!b.validOptions.some((o) => nv.includes(norm(o)) || norm(o).includes(nv))) return true
  }
  return false
}

/** find the benchmark for a field label (optionally scoped by section) using fuzzy key matching */
export function getBenchmark(label: unknown, map: BenchmarkMap | null | undefined, section?: string) {
  if (!map || !label) return null
  const key = normalizeKey(label)
  const best = (k: string) => {
    let hit: Benchmark | null = null
    let len = 0
    for (const [mk, b] of Object.entries(map)) {
      if (Math.min(k.length, mk.length) >= 10 && (k.includes(mk) || mk.includes(k)) && mk.length > len) {
        hit = b
        len = mk.length
      }
    }
    return hit
  }
  if (section) {
    const sk = `${normalizeKey(section)} ${key}`
    if (map[sk]) return map[sk]
    const s = best(sk)
    if (s) return s
  }
  return map[key] ?? best(key)
}

/** human text for the benchmark ("Min 3 m", "100 to 150", ...) or null */
export function formatBenchmark(b: Benchmark | null | undefined) {
  if (!b) return null
  const raw = String(b.benchmarkValue || '').trim()
  if (!raw || /^not\s+(stated|found|explicitly)/i.test(raw)) return null
  const t = raw.replace(/\s*\(.*?\)\s*/g, '').trim() || raw
  const isRange = /[0-9]+(?:\.[0-9]+)?\s*(?:[-–—]|to)\s*[0-9]+(?:\.[0-9]+)?/i.test(t)
  const isNumber = /^[0-9]+(?:\.[0-9]+)?(\s*[a-zA-Z%/]+)?$/.test(t)
  return !isRange && isNumber ? `Min ${t}` : t
}

export const reqLabel = () => 'Req:'

/** convenience: does `value` for field `label` deviate from the benchmark map? */
export function checkDeviation(label: unknown, value: unknown, map: BenchmarkMap | null | undefined, section?: string) {
  if (!map || !label || value === undefined || value === null || value === '') return false
  const b = getBenchmark(label, map, section)
  return b ? isDeviation(value, b) : false
}

let cache: BenchmarkMap | null = null
let inflight: Promise<BenchmarkMap> | null = null
function loadBenchmarks() {
  if (cache) return Promise.resolve(cache)
  if (!inflight)
    inflight = http
      .get<ApiEnvelope<BenchmarkMap>>('/benchmark')
      .then((r) => (cache = r.data || {}))
      .catch(() => (cache = {}))
      .finally(() => (inflight = null))
  return inflight
}

/** hook: benchmark map (fetched once, cached) */
export function useBenchmarks() {
  const [map, setMap] = useState<BenchmarkMap | null>(cache)
  useEffect(() => {
    if (cache) setMap(cache)
    else loadBenchmarks().then(setMap)
  }, [])
  return map
}
