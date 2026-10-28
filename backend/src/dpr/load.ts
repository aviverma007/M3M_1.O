/* Collects everything the DPR renderers need for one project from SQL Server, and loads uploaded images. */
import fs from 'node:fs/promises'
import { db, type Row } from '../db/table.js'
import { query } from '../db/pool.js'
import { findUploadByKey } from '../http/files.js'
import { moduleChaptersWithSections } from '../routes/module-workspace.js'
import type { DprInput } from './index.js'

const summaries = () => db.table<Row>('designBriefSummaries', { spill: 'extra' })
const deptRecord = (department: string, projectId: number) =>
  db.table<Row>('designBriefInputs', { spill: 'fields', scope: { department } }).first({ projectId })

async function summaryOf(projectId: number) {
  const s = await summaries().first({ projectId })
  return s ? (Object.fromEntries(Object.entries(s).filter(([k, v]) => !(v === null && k.endsWith('Data')))) as Record<string, unknown>) : null
}

export async function loadDprInput(project: Row): Promise<DprInput> {
  const projectId = Number(project.id)
  const [summary, structure, mep, benchRows, modules] = await Promise.all([
    summaryOf(projectId),
    deptRecord('structure', projectId),
    deptRecord('mep', projectId),
    db.table<Row>('benchmarks').all(),
    query<{ id: number; moduleNumber: number }>(
      'SELECT id, moduleNumber FROM dbo.modules WHERE projectType = @t AND moduleNumber IN (2, 3)',
      { t: String(project.projectType ?? 'residential') },
    ),
  ])
  const benchmarks: DprInput['benchmarks'] = {}
  for (const b of benchRows) benchmarks[String(b.key)] = { benchmarkValue: (b.benchmarkValue as string) ?? '', validOptions: (b.validOptions as string[]) ?? [] }

  const moduleChapters: Record<number, unknown[]> = {}
  for (const m of modules) moduleChapters[m.id] = await moduleChaptersWithSections(m.id, projectId)

  // projects picked for the "Area Ratios Comparison" table on Project Level Design
  const pld = (summary?.projectLevelDesignData ?? {}) as { compareProjectIds?: unknown[] }
  const ids = [...new Set((pld.compareProjectIds ?? []).map(Number).filter((n) => Number.isInteger(n) && n > 0 && n !== projectId))]
  const compareProjects: NonNullable<DprInput['compareProjects']> = []
  for (const id of ids) {
    const p = await db.table<Row>('projects').find(id)
    if (p) compareProjects.push({ id, name: String(p.name ?? ''), location: String(p.location ?? ''), summary: await summaryOf(id) })
  }

  return {
    project: {
      ...(project as Record<string, unknown>),
      name: String(project.name ?? ''),
      location: String(project.location ?? ''),
      projectType: String(project.projectType ?? ''),
      category: String(project.category ?? ''),
      locationCategory: String(project.locationCategory ?? ''),
    },
    summary,
    structure: structure ?? null,
    mep: mep ?? null,
    benchmarks,
    compareProjects,
    moduleChapters,
    date: new Date(),
  }
}

/** PNG / JPEG only — the PDF library can't embed other formats */
const isEmbeddable = (b: Buffer) =>
  b.length > 8 && ((b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) || (b[0] === 0xff && b[1] === 0xd8))

/** resolve an uploaded-file URL (…/files/<key>) or a data: URL to image bytes; null when missing or not PNG/JPEG */
export async function loadUploadedImage(url: string): Promise<Buffer | null> {
  try {
    if (!url) return null
    if (url.startsWith('data:')) {
      const m = /^data:[^;,]*;base64,(.*)$/s.exec(url)
      const b = m ? Buffer.from(m[1], 'base64') : null
      return b && isEmbeddable(b) ? b : null
    }
    const key = /\/files\/([^/?#]+)/.exec(url)?.[1]
    if (!key) return null
    const found = await findUploadByKey(decodeURIComponent(key))
    if (!found) return null
    const b = await fs.readFile(found.absPath)
    return isEmbeddable(b) ? b : null
  } catch {
    return null
  }
}
