#!/usr/bin/env node
/*
 * Fills a TEST project with sample data in every module, through the running API.
 * Use only on a test project — it overwrites that project's module data.
 *
 *   cd backend
 *   node scripts/fill-test-project.mjs --project 1 --email admin@m3m.com
 *   (asks for the password; or pass --password / set M3M_PASSWORD)
 *
 * Options: --url http://localhost:5000/api/v1 (default, from PORT in .env if set)
 *
 * Fills: Key Ratio, Apartment Design and Common Design (every field answered with the benchmark answer for the
 * project's category), Design Brief department inputs (Liaison, Business Development, Land, Structure, MEP),
 * and all design chapters (Project Details + Layout Plans … Additional Project Details) incl. sample plan images.
 * Sample data: scripts/test-project/data.json + images/ (fictional values and drawings).
 */
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]?.startsWith('--') ? 'true' : all[i + 1]]] : acc), []),
)
const envPort = (() => {
  try {
    return /^PORT=(\d+)/m.exec(fs.readFileSync(path.join(here, '../.env'), 'utf8'))?.[1]
  } catch {
    return undefined
  }
})()
const BASE = (args.url || `http://localhost:${envPort || 5000}/api/v1`).replace(/\/$/, '')
const projectId = Number(args.project)
const email = args.email || 'admin@m3m.com'
if (!Number.isInteger(projectId) || projectId <= 0) {
  console.error('Usage: node scripts/fill-test-project.mjs --project <id> [--email admin@m3m.com] [--password ...]')
  process.exit(1)
}

const ask = (q) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(q, (a) => (rl.close(), resolve(a)))
  })

let token = ''
async function api(method, p, body, { form } = {}) {
  const headers = { Authorization: token ? `Bearer ${token}` : '' }
  let payload
  if (form) payload = form
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(BASE + p, { method, headers, body: payload })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  if (!res.ok || json?.success === false) throw new Error(`${method} ${p} -> ${res.status} ${json?.message ?? text.slice(0, 200)}`)
  return json?.data
}

const step = (s) => console.log(`- ${s}`)

async function main() {
  const password = args.password || process.env.M3M_PASSWORD || (await ask(`Password for ${email}: `))
  token = (await api('POST', '/auth/login', { email, password }))?.accessToken
  if (!token) throw new Error('Login failed')

  const project = await api('GET', `/project/${projectId}`)
  if (!project?.id) throw new Error(`Project ${projectId} not found`)
  console.log(`Filling project ${project.id}: ${project.name} (${project.projectType}, ${project.category})`)
  if (!/test/i.test(String(project.name)) && args.force !== 'true') {
    throw new Error(`"${project.name}" doesn't look like a test project. Re-run with --force true if you are sure.`)
  }

  const data = JSON.parse(fs.readFileSync(path.join(here, 'test-project/data.json'), 'utf8'))

  /* ---------- images: upload once, replace "image:<file>" references with the stored URL */
  const uploaded = new Map()
  async function upload(file) {
    if (uploaded.has(file)) return uploaded.get(file)
    const buf = fs.readFileSync(path.join(here, 'test-project/images', file))
    const form = new FormData()
    form.append('file', new Blob([buf], { type: 'image/jpeg' }), file)
    const url = (await api('POST', '/upload', undefined, { form }))?.s3Url
    uploaded.set(file, url)
    return url
  }
  async function resolveImages(v) {
    if (Array.isArray(v)) return Promise.all(v.map(resolveImages))
    if (v && typeof v === 'object') {
      const out = {}
      for (const [k, x] of Object.entries(v)) out[k] = await resolveImages(x)
      return out
    }
    if (typeof v === 'string' && v.startsWith('image:')) return upload(v.slice(6))
    return v
  }

  /* ---------- design chapters (one summary record) */
  const summary = await resolveImages(data.summary)
  await api('POST', `/project/${projectId}/design-brief-summary`, summary)
  step(`Design chapters saved (${Object.keys(summary).length} sections, ${uploaded.size} images uploaded)`)

  /* ---------- design brief department inputs */
  for (const [dept, fields] of Object.entries({ ...data.departments, structure: data.structure, mep: data.mep })) {
    await api('POST', `/${dept}`, { projectId, ...fields })
  }
  step('Design Brief inputs saved (Liaison, Business Development, Land, Structure, MEP)')

  /* ---------- key ratio (residential) */
  if (String(project.projectType).toLowerCase() === 'residential') {
    await api('POST', '/keyRatio', { ...data.keyRatio, project_id: projectId, module_id: 1, inputValues: [], calculatedSectionValues: [] })
    step('Key Ratio saved')
  } else step('Key Ratio skipped (sample data is for residential projects)')

  /* ---------- Apartment Design / Common Design chapters: answer every field with the benchmark answer */
  const benchKey =
    { premium: 'premiumAns', affluent: 'affluentAns', hi_street: 'hiStreetAns', high_street: 'hiStreetAns', enclosed_mall: 'enclosedMallAns' }[
      String(project.category ?? '').toLowerCase()
    ] ?? 'midEndAns'
  const mods = await api('GET', `/project/${projectId}/module?projectType=${encodeURIComponent(project.projectType)}`)
  const modRows = Array.isArray(mods) ? mods : (mods?.rows ?? [])
  for (const m of modRows.filter((x) => [2, 3].includes(Number(x.moduleNumber ?? x.moduleNo)))) {
    const chapters = (await api('GET', `/project/${projectId}/module/${m.id}/chapter`))?.rows ?? []
    let answered = 0
    for (const ch of chapters) {
      const full = ((await api('GET', `/project/${projectId}/module/${m.id}/chapter?chapterId=${ch.id}`))?.rows ?? []).find((c) => c.id === ch.id)
      const items = []
      for (const sec of full?.chapterSections ?? []) {
        for (const f of sec.sectionFields ?? []) {
          const bench = f[benchKey] ?? []
          const options = (f.sectionFieldOptions ?? []).map((o) => o.fieldOption)
          const pick = bench.length ? bench : options.slice(0, 1)
          if (!pick.length) continue
          items.push({
            sectionId: sec.id,
            sectionFieldId: f.id,
            answer: f.fieldType === 'multiselect' ? pick : pick[0],
            remark: '',
            isFlaged: 0,
            anyOtherAnswer: '',
            benchmarkAnswer: bench,
          })
        }
      }
      await api('PUT', `/project/${projectId}/module/${m.id}/chapter/${ch.id}`, items)
      answered += items.length
    }
    step(`${m.name}: ${chapters.length} chapters, ${answered} fields answered`)
  }

  console.log('\nDone. Open the project in the app; every module now has sample data and the Download buttons produce full reports.')
}

main().catch((e) => {
  console.error('\nFailed:', e.message)
  process.exit(1)
})
