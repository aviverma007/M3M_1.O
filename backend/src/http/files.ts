/**
 * File storage: uploaded files are written to UPLOAD_DIR and recorded in dbo.uploads.
 * Files are served at GET /files/:key (key = <id>-<random>) so <img>/<a> tags work without an auth header;
 * the random part makes the URL unguessable.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { config } from '../config.js'
import { db, type Row } from '../db/table.js'
import type { UploadedFile } from './helpers.js'

const safe = (name: string) => name.replace(/[^\w.\- ]+/g, '_').slice(-120) || 'file'

export async function saveUpload(file: UploadedFile, uploadedBy: number | null) {
  const now = new Date()
  const rel = path.join(String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, '0'), `${crypto.randomBytes(12).toString('hex')}-${safe(file.name)}`)
  const abs = path.join(config.uploadDir, rel)
  await fs.mkdir(path.dirname(abs), { recursive: true })
  await fs.writeFile(abs, file.buffer)
  const row = await db.table<Row>('uploads').insert({ name: file.name, size: file.size, type: file.type, storagePath: rel, uploadedBy })
  const key = `${row.id}-${crypto.randomBytes(16).toString('hex')}`
  const s3Url = `${config.apiPrefix}/files/${key}`
  return (await db.table<Row>('uploads').update(row.id, { s3Url })) as Row
}

/** Find an upload from its public key, verifying the random part. */
export async function findUploadByKey(key: string) {
  const id = Number(key.split('-')[0])
  const row = Number.isFinite(id) ? await db.table<Row>('uploads').find(id) : undefined
  if (!row || !String(row.s3Url ?? '').endsWith(`/files/${key}`)) return null
  return { row, absPath: path.join(config.uploadDir, row.storagePath) }
}

export async function readUpload(row: Row) {
  return fs.readFile(path.join(config.uploadDir, row.storagePath))
}
