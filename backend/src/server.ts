import { config } from './config.js'
import { connect } from './db/pool.js'
import { verifySchemaAccess } from './db/table.js'
import { createApp } from './app.js'
import { loadRoutes } from './routes/index.js'

async function main() {
  try {
    await connect()
    await verifySchemaAccess()
    console.log(`[db] connected to ${config.db.server}${config.db.instance ? `\\${config.db.instance}` : ''}/${config.db.database}`)
  } catch (e) {
    console.error('[db] startup failed — check DB_* settings in .env and that database/01-02 scripts ran', e)
    process.exit(1)
  }
  const failed = await loadRoutes()
  if (failed.length) console.warn(`[routes] running WITHOUT: ${failed.join(', ')}`)
  createApp().listen(config.port, '0.0.0.0', () => {
    console.log(`[http] M3M_1.O API listening on http://0.0.0.0:${config.port}${config.apiPrefix}`)
    if (config.serveFrontend) console.log(`[http] frontend served from ${config.frontendDist}`)
  })
}

main()
