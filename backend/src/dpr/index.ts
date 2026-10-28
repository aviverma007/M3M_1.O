/*
 * DPR PDF export: POST /project/:id/export-dpr-pdf { selectedModules: string[] }
 * One report = cover, index ("Project Brief – Key Highlights"), the selected modules' pages, thank-you page.
 */
import { brandFor, contentPage, coverPage, createDoc, emptyMessage, indexPage, thankYouPage, toBuffer, type Ctx, type ReportProject } from './doc.js'
import { MODULE_RENDERERS } from './modules/index.js'

export type DprInput = {
  project: ReportProject & Record<string, unknown>
  /** the per-project design-brief summary record (all design-chapter page data) */
  summary: Record<string, unknown> | null
  /** department records used by the Structure / MEP chapters */
  structure?: Record<string, unknown> | null
  mep?: Record<string, unknown> | null
  /** benchmark map from GET /benchmark (normalized label -> {benchmarkValue, validOptions}) */
  benchmarks?: Record<string, { benchmarkValue?: string; validOptions?: string[] }>
  /** other projects (id -> name/location + their summary) for comparison tables */
  compareProjects?: { id: string | number; name: string; location: string; summary: Record<string, unknown> | null }[]
  /** module chapter catalogue (Apartment Design = 2, Common Design = 3 …) keyed by module id, with sections and fields */
  moduleChapters?: Record<number, unknown[]>
  date?: Date
}

/** module names accepted from the module cards / export page (original API names) */
export const DPR_MODULES = [
  'Project Details + Layout Plans',
  'Unit Level Design',
  'Project Level Design',
  'Structure',
  'MEP',
  'ID Specifications',
  'Common Area',
  'Landscape & Amenities',
  'Service Design Consideration',
  'Contracting Strategy',
  'Consultant Strategy',
  'Phasing Plan',
  'Project Schedule',
  'Approvals',
  'Additional Project Details',
] as const

export type ImageLoader = (url: string) => Promise<Buffer | null>

export async function buildDprPdf(input: DprInput, selected: string[], loadImage: ImageLoader): Promise<Buffer> {
  const doc = createDoc()
  const p = input.project
  const ctx: Ctx = {
    doc,
    project: p,
    brand: brandFor(p.locationCategory),
    subtitle: [p.name, p.location, p.projectType, p.category].map((s) => String(s ?? '')).join('  |  '),
  }
  coverPage(ctx, input.date ?? new Date())
  indexPage(ctx)
  const wanted = DPR_MODULES.filter((m) => selected.includes(m))
  for (const m of wanted) {
    const render = MODULE_RENDERERS[m]
    if (render) await render(ctx, input, loadImage)
    else {
      contentPage(ctx, m)
      emptyMessage(ctx, `No ${m.toLowerCase()} data configured.`)
    }
  }
  thankYouPage(ctx)
  return toBuffer(doc)
}
