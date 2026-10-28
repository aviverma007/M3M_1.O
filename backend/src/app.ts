import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import { config } from './config.js'
import { buildRouter } from './http/router.js'
import { UploadedFile } from './http/helpers.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', true)
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }))
  app.use(compression())
  app.use(cors({ origin: true, credentials: true }))
  app.use(morgan(':method :url :status :response-time ms'))

  // JSON bodies + multipart (files become UploadedFile on req.body[field], text fields stay strings)
  app.use(express.json({ limit: '20mb' }))
  app.use(express.urlencoded({ extended: true, limit: '20mb' }))
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.maxUploadMb * 1024 * 1024 } })
  app.use((req, res, next) => {
    if (!req.is('multipart/form-data')) return next()
    upload.any()(req, res, (err?: unknown) => {
      if (err) return next(err)
      const files = (req.files as Express.Multer.File[] | undefined) ?? []
      for (const f of files) req.body[f.fieldname] = new UploadedFile(f.originalname, f.mimetype, f.buffer)
      next()
    })
  })

  app.get(`${config.apiPrefix}/health`, (_req, res) => res.json({ ok: true }))
  app.use(config.apiPrefix, buildRouter())
  app.use(config.apiPrefix, (_req, res) => res.status(404).json({ success: false, status: 'Failed', statusCode: 404, errorCode: 'NOT_FOUND', message: 'Endpoint not found', data: null }))

  // built frontend (single page app)
  if (config.serveFrontend && fs.existsSync(path.join(config.frontendDist, 'index.html'))) {
    app.use(express.static(config.frontendDist, { index: false, maxAge: '1h' }))
    app.get(/.*/, (_req, res) => res.sendFile(path.join(config.frontendDist, 'index.html')))
  }

  // errors -> original API envelope
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const e = err as { status?: number; code?: string; message?: string }
    if (e?.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, status: 'Failed', statusCode: 413, errorCode: 'FILE_TOO_LARGE', message: `File is larger than ${config.maxUploadMb} MB`, data: null })
    }
    console.error('[error]', err)
    res.status(e?.status ?? 500).json({ success: false, status: 'Failed', statusCode: 500, errorCode: 'SERVER_ERROR', message: 'Something went wrong on the server', data: null })
  })
  return app
}
