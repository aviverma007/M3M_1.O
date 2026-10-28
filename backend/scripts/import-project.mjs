#!/usr/bin/env node
/*
 * Imports one project's data (design chapters, Structure / MEP inputs, images …) from an import folder
 * through the running API. Creates the project if it doesn't exist yet.
 *
 *   cd backend
 *   node scripts/import-project.mjs --data "C:\path\to\The_Edition_import" --email admin@m3m.com
 *   (asks for the password; or pass --password / set M3M_PASSWORD)
 *
 * Import folder: data.json + images/ (files referenced as "image:<file>" inside data.json).
 * data.json: { project: {name, location, projectType, category, locationCategory, …},
 *              summary: {<design-chapter data>}, structure?, mep?, departments?: {<dept path>: fields},
 *              keyRatio?: {...}, compareProjectNames?: [..] }
 * Options: --url http://127.0.0.1:5000/api/v1   --project <id> (import into this existing project instead)
 *          --overwrite true  (required when the project already exists)
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
const BASE = (args.url || `http://127.0.0.1:${envPort || 5000}/api/v1`).replace(/\/$/, '')
const email = args.email || 'admin@m3m.com'
/* accept the folder itself, the folder one level above it (zip extracted into a same-named folder), or the .zip path minus .zip */
const dataDir = (() => {
  if (!args.data) return null
  const base = path.resolve(String(args.data).replace(/\.zip$/i, ''))
  if (fs.existsSync(path.join(base, 'data.json'))) return base
  if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
    for (const d of fs.readdirSync(base)) if (fs.existsSync(path.join(base, d, 'data.json'))) return path.join(base, d)
  }
  return null
})()
if (!dataDir) {
  console.error(args.data ? `No data.json found in "${args.data}" (or one folder below it). Unzip the import file first and point --data at the folder that contains data.json and images.` : '')
  console.error('Usage: node scripts/import-project.mjs --data <folder with data.json> [--email admin@m3m.com] [--project <id>] [--overwrite true]')
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
  let res
  try {
    res = await fetch(BASE + p, { method, headers, body: payload })
  } catch (e) {
    throw new Error(`Cannot reach the app at ${BASE} (${e.cause?.code ?? e.message}). Is the backend running (npm start)? Use --url to point elsewhere.`)
  }
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

async function findProjectsByName(name) {
  const d = await api('GET', `/project?search=${encodeURIComponent(name)}&page=1&limit=100`)
  return (d?.rows ?? []).filter((p) => String(p.name).trim().toLowerCase() === String(name).trim().toLowerCase())
}

async function main() {
  const data = JSON.parse(fs.readFileSync(path.join(dataDir, 'data.json'), 'utf8'))
  const password = args.password || process.env.M3M_PASSWORD || (await ask(`Password for ${email}: `))
  token = (await api('POST', '/auth/login', { email, password }))?.accessToken
  if (!token) throw new Error('Login failed')

  /* ---------- project */
  let project
  if (args.project) project = await api('GET', `/project/${Number(args.project)}`)
  else {
    const same = (await findProjectsByName(data.project.name)).filter(
      (p) => !data.project.locationCategory || String(p.locationCategory ?? '') === String(data.project.locationCategory),
    )
    if (same.length > 1) throw new Error(`Several projects are called "${data.project.name}" — pass --project <id>.`)
    project = same[0] ?? null
  }
  if (project?.id) {
    if (args.overwrite !== 'true') throw new Error(`Project "${project.name}" (id ${project.id}) already exists. Re-run with --overwrite true to replace its module data.`)
    await api('PUT', `/project/${project.id}`, { ...project, ...data.project })
    step(`Updating existing project ${project.id}: ${project.name}`)
  } else {
    project = await api('POST', '/project', data.project)
    step(`Created project ${project.id}: ${project.name}`)
  }
  const projectId = project.id

  /* ---------- images */
  const uploaded = new Map()
  async function upload(file) {
    if (uploaded.has(file)) return uploaded.get(file)
    const buf = fs.readFileSync(path.join(dataDir, 'images', file))
    const type = /\.png$/i.test(file) ? 'image/png' : 'image/jpeg'
    const form = new FormData()
    form.append('file', new Blob([buf], { type }), file)
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

  /* ---------- design chapters */
  const summary = await resolveImages(data.summary ?? {})
  const missingCompare = []
  if (Array.isArray(data.compareProjectNames) && summary.projectLevelDesignData) {
    const ids = []
    for (const n of data.compareProjectNames) {
      const found = (await findProjectsByName(n)).filter((p) => p.id !== projectId)
      if (found[0]) ids.push(String(found[0].id))
      else missingCompare.push(n)
    }
    summary.projectLevelDesignData.compareProjectIds = ids
  }
  await api('POST', `/project/${projectId}/design-brief-summary`, summary)
  step(`Design chapters saved (${Object.keys(summary).length} sections, ${uploaded.size} images uploaded)`)

  /* ---------- department inputs */
  const depts = { ...(data.departments ?? {}) }
  if (data.structure) depts.structure = data.structure
  if (data.mep) depts.mep = data.mep
  for (const [dept, fields] of Object.entries(depts)) await api('POST', `/${dept}`, { projectId, ...(await resolveImages(fields)) })
  if (Object.keys(depts).length) step(`Department inputs saved (${Object.keys(depts).join(', ')})`)

  /* ---------- key ratio */
  if (data.keyRatio) {
    await api('POST', '/keyRatio', { ...data.keyRatio, project_id: projectId, module_id: 1, inputValues: [], calculatedSectionValues: [] })
    step('Key Ratio saved')
  }

  console.log(`\nDone: project ${projectId} "${project.name}".`)
  if (missingCompare.length)
    console.log(`Note: comparison projects not found (import them, then re-run with --overwrite true to link them): ${missingCompare.join(', ')}`)
}

main().catch((e) => {
  console.error('\nFailed:', e.message)
  process.exit(1)
})
