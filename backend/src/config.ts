import 'dotenv/config'
import path from 'node:path'

const env = (k: string, fallback?: string) => {
  const v = process.env[k]
  if (v === undefined || v === '') {
    if (fallback === undefined) throw new Error(`Missing required environment variable ${k} (see backend/.env.example)`)
    return fallback
  }
  return v
}
const bool = (k: string, fallback: boolean) => {
  const v = process.env[k]
  return v === undefined || v === '' ? fallback : /^(1|true|yes)$/i.test(v)
}

export const config = {
  port: Number(env('PORT', '5000')),
  apiPrefix: env('API_PREFIX', '/api/v1'),
  serveFrontend: bool('SERVE_FRONTEND', true),
  frontendDist: path.resolve(process.cwd(), env('FRONTEND_DIST', '../frontend/dist')),
  db: {
    server: env('DB_SERVER', 'localhost'),
    instance: env('DB_INSTANCE', ''),
    port: Number(env('DB_PORT', '1433')),
    database: env('DB_NAME', 'M3M_One'),
    user: env('DB_USER'),
    password: env('DB_PASSWORD'),
    trustServerCertificate: bool('DB_TRUST_SERVER_CERTIFICATE', true),
    encrypt: bool('DB_ENCRYPT', true),
  },
  jwtSecret: env('JWT_SECRET'),
  jwtExpiresIn: env('JWT_EXPIRES_IN', '12h'),
  uploadDir: path.resolve(process.cwd(), env('UPLOAD_DIR', './uploads')),
  maxUploadMb: Number(env('MAX_UPLOAD_MB', '25')),
  appUrl: env('APP_URL', 'http://localhost:5000'),
  smtp: {
    host: env('SMTP_HOST', ''),
    port: Number(env('SMTP_PORT', '587')),
    secure: bool('SMTP_SECURE', false),
    user: env('SMTP_USER', ''),
    password: env('SMTP_PASSWORD', ''),
    from: env('MAIL_FROM', 'M3M_1.O <no-reply@example.com>'),
  },
}

if (config.jwtSecret.length < 32 || config.jwtSecret.startsWith('replace-')) {
  console.warn('[config] JWT_SECRET is weak or still the example value — set a long random secret in .env')
}
