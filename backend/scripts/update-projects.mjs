#!/usr/bin/env node
/*
 * Updates project record fields (classification, contact name, owner, date, …) for many projects at once.
 *
 *   cd backend
 *   node scripts/update-projects.mjs --file "C:\path\to\projects.json" --email admin@m3m.com
 *
 * projects.json: [{ "name": "The Cullinan", "projectClassification": "Ongoing (RERA Obtained)",
 *                   "userName": "Sandeep Sharma", "projectOwner": "Sandeep Sharma", "date": "2026-09-28", … }, …]
 * Projects are matched by name (case and extra spaces ignored); optional "locationCategory" narrows the match.
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
if (!args.file || !fs.existsSync(args.file)) {
  console.error('Usage: node scripts/update-projects.mjs --file <projects.json> [--email admin@m3m.com]')
  process.exit(1)
}
const FIELDS = ['projectClassification', 'userName', 'projectOwner', 'date', 'userEmail', 'userNumber', 'userDesignation', 'description',
  'designOwner', 'structureOwner', 'mepOwner', 'interiorDesignOwner', 'location', 'category', 'projectType', 'locationCategory',
  'site_area_acres', 'site_area', 'far_permissible']

const ask = (q) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(q, (a) => (rl.close(), resolve(a)))
  })
let token = ''
async function api(method, p, body) {
  let res
  try {
    res = await fetch(BASE + p, { method, headers: { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch (e) {
    throw new Error(`Cannot reach the app at ${BASE} (${e.cause?.code ?? e.message}). Is the backend running (npm start)?`)
  }
  const json = await res.json().catch(() => null)
  if (!res.ok || json?.success === false) throw new Error(`${method} ${p} -> ${res.status} ${json?.message ?? ''}`)
  return json?.data
}
const key = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase()

async function main() {
  const list = JSON.parse(fs.readFileSync(args.file, 'utf8'))
  const password = args.password || process.env.M3M_PASSWORD || (await ask(`Password for ${email}: `))
  token = (await api('POST', '/auth/login', { email, password }))?.accessToken
  if (!token) throw new Error('Login failed')
  const all = (await api('GET', '/project?page=1&limit=1000'))?.rows ?? []
  let ok = 0
  const problems = []
  for (const item of list) {
    const matches = all.filter((p) => key(p.name) === key(item.name) && (!item.locationCategory || key(p.locationCategory) === key(item.locationCategory)))
    if (matches.length !== 1) {
      problems.push(`${item.name}: ${matches.length ? `${matches.length} projects with this name` : 'not found'}`)
      continue
    }
    const current = await api('GET', `/project/${matches[0].id}`)
    const patch = Object.fromEntries(FIELDS.filter((f) => item[f] !== undefined).map((f) => [f, item[f]]))
    await api('PUT', `/project/${current.id}`, { ...current, ...patch })
    console.log(`- ${current.name} (id ${current.id}): ${Object.keys(patch).join(', ')}`)
    ok++
  }
  console.log(`\nUpdated ${ok} of ${list.length} project(s).`)
  if (problems.length) console.log('Not updated:\n  ' + problems.join('\n  '))
}
main().catch((e) => {
  console.error('\nFailed:', e.message)
  process.exit(1)
})
