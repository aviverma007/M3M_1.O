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
  /* spec|<moduleNumber>|<chapterNumber>|<section>|<field>|<categoryAns> rows: specification benchmark answers from the original app */
  const spec = new Map<string, { moduleNumber: number; chapterNumber: number; section: string; field: string; answers: Record<string, string[]> }>()
  for (const b of benchRows) {
    const key = String(b.key)
    if (key.startsWith('spec|')) {
      const [, mn, cn, section, field, ans] = key.split('|')
      const id = [mn, cn, section, field].join('|')
      const e = spec.get(id) ?? { moduleNumber: Number(mn), chapterNumber: Number(cn), section, field, answers: {} }
      e.answers[ans] = (b.validOptions as string[]) ?? []
      spec.set(id, e)
      continue
    }
    benchmarks[key] = { benchmarkValue: (b.benchmarkValue as string) ?? '', validOptions: (b.validOptions as string[]) ?? [] }
  }

  const moduleChapters: Record<number, unknown[]> = {}
  for (const m of modules) {
    const chapters = await moduleChaptersWithSections(m.id, projectId)
    // imported specification answers take precedence: put them first as their own chapters (the lookup uses the first chapter with that number)
    const byChapter = new Map<number, { title: string; sectionFields: unknown[] }[]>()
    let fid = 1
    for (const e of spec.values()) {
      if (e.moduleNumber !== m.moduleNumber) continue
      const secs = byChapter.get(e.chapterNumber) ?? []
      let sec = secs.find((x) => x.title === e.section)
      if (!sec) secs.push((sec = { title: e.section, sectionFields: [] }))
      sec.sectionFields.push({
        id: -fid++,
        fieldName: e.field,
        fieldType: 'select',
        midEndAns: e.answers.midEndAns ?? [],
        premiumAns: e.answers.premiumAns ?? [],
        affluentAns: e.answers.affluentAns ?? [],
        hiStreetAns: e.answers.hiStreetAns ?? [],
        enclosedMallAns: e.answers.enclosedMallAns ?? [],
        sectionFieldOptions: [],
      })
      byChapter.set(e.chapterNumber, secs)
    }
    const overlay = [...byChapter.entries()].map(([chapterNumber, secs], i) => ({
      id: -(i + 1),
      moduleId: m.id,
      chapterNumber,
      title: `Imported benchmarks ${chapterNumber}`,
      chapterSections: secs.map((x, j) => ({ id: -(1000 * (i + 1) + j), title: x.title, sectionFields: x.sectionFields })),
    }))
    // once answers from the original application are loaded they are the only source (our seeded catalogue answers are placeholders)
    moduleChapters[m.id] = overlay.length ? overlay : chapters
  }

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
