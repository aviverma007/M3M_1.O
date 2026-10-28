/* File upload & download (replaces the mock's in-browser upload store) */
import { db, type Row } from '../db/table.js'
import { fail, ok, route } from '../http/router.js'
import { UploadedFile } from '../http/helpers.js'
import { findUploadByKey, saveUpload } from '../http/files.js'

/** POST /upload (multipart field "file") -> upload row incl. s3Url */
route('POST', '/upload', async ({ body, user }) => {
  const f = body?.file
  if (!(f instanceof UploadedFile)) return fail(400, 'No file uploaded')
  return ok(await saveUpload(f, user?.id ?? null), 'File uploaded successfully')
})

route('GET', '/upload/:id', async ({ params }) => {
  const f = await db.table<Row>('uploads').find(params.id)
  return f ? ok(f) : fail(404, 'File not found')
})

/** GET /files/:key — public, unguessable file URL used by <a>/<img> */
route(
  'GET',
  '/files/:key',
  async ({ params, query, res }) => {
    const found = await findUploadByKey(params.key)
    if (!found) return fail(404, 'File not found')
    res.setHeader('Content-Type', found.row.type || 'application/octet-stream')
    const disp = query.download ? 'attachment' : 'inline'
    res.setHeader('Content-Disposition', `${disp}; filename="${String(found.row.name).replace(/"/g, '')}"`)
    await new Promise<void>((resolve, reject) => res.sendFile(found.absPath, (err) => (err ? reject(err) : resolve())))
  },
  { auth: false },
)
