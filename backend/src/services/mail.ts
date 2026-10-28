import nodemailer from 'nodemailer'
import { config } from '../config.js'

const transport = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.password } : undefined,
    })
  : null

/** Send a plain-text email. Without SMTP settings the message is written to the server log instead. */
export async function sendMail(to: string, subject: string, text: string) {
  if (!transport) {
    console.log(`[mail] SMTP not configured — would send to ${to}: ${subject}\n${text}`)
    return
  }
  try {
    await transport.sendMail({ from: config.smtp.from, to, subject, text })
  } catch (e) {
    console.error('[mail] send failed', e)
  }
}
