/* Cross-cutting helpers used by route modules: audit log, notifications, uploaded-file reading. */
import { db } from '../db/table.js'
import type { AuthUser } from './auth.js'

/** Record an audit-log entry (same shape as the original). Never throws. */
export async function audit(user: Pick<AuthUser, 'id' | 'name'> | null, taskType: string, description: string, projectId: number | null = null) {
  try {
    await db.table('auditLogs').insert({ userId: user?.id ?? null, projectId, taskType, description, creatorName: user?.name ?? 'System' })
  } catch (e) {
    console.error('[audit] failed', e)
  }
}

/** Create a notification for a user. Never throws. */
export async function notify(userId: number, type: string, message: string, metadata: Record<string, unknown> = {}) {
  try {
    await db.table('notifications').insert({ userId, type, message, isRead: false, metadata })
  } catch (e) {
    console.error('[notify] failed', e)
  }
}

/**
 * Uploaded file as seen by route handlers. Multipart files are exposed on `body[field]` with the same
 * surface the mock handlers used on browser File objects: name, type, size, text(), arrayBuffer().
 */
export class UploadedFile {
  readonly name: string
  readonly type: string
  readonly size: number
  readonly buffer: Buffer
  constructor(name: string, type: string, buffer: Buffer) {
    this.name = name
    this.type = type
    this.buffer = buffer
    this.size = buffer.length
  }
  async text() {
    return this.buffer.toString('utf8')
  }
  async arrayBuffer() {
    return this.buffer.buffer.slice(this.buffer.byteOffset, this.buffer.byteOffset + this.buffer.byteLength)
  }
}

/** Read a body value that may be an uploaded file or a plain string as text. */
export async function readText(v: unknown): Promise<string> {
  if (v instanceof UploadedFile) return v.text()
  if (typeof v === 'string') return v
  return ''
}
