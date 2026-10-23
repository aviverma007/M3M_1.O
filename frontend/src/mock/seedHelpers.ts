import { registerSeed } from './db'
import { normalizeKey } from '@/lib/benchmark'

export type BenchmarkSeed = { label: string; benchmarkValue: string; validOptions?: string[]; section?: string }

/**
 * Register benchmark rows. Each page group seeds the benchmarks for its own fields
 * (seed/benchmarks-<group>.ts). `section` scopes a key like the original ("<section> <label>").
 */
export function registerBenchmarks(rows: BenchmarkSeed[]) {
  registerSeed((db) => {
    rows.forEach((r) => {
      const key = r.section ? `${normalizeKey(r.section)} ${normalizeKey(r.label)}` : normalizeKey(r.label)
      db.table('benchmarks').insert({ key, benchmarkValue: r.benchmarkValue, validOptions: r.validOptions ?? [] })
    })
  })
}
