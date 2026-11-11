import { createApp } from './app'
import { createAuth } from './auth'
import { loadConfig } from './config'
import { createDatabase } from './database'

const config = loadConfig(process.env)
const database = createDatabase(config.databaseUrl)

try {
  await database.query('SELECT 1')
} catch {
  console.error('No se pudo conectar con PostgreSQL. Revisa DATABASE_URL y ejecuta las migraciones.')
  await database.end()
  process.exit(1)
}

const app = createApp({
  auth: createAuth(config, database),
  config,
  checkDatabase: async () => { await database.query('SELECT 1') },
})

const server = Bun.serve({
  hostname: config.host,
  port: config.port,
  fetch: (request, server) => app.fetch(request, {
    clientIp: server.requestIP(request)?.address,
  }),
})
console.info(`Backend ntbk en ${server.url.origin}`)

let stopping = false
async function shutdown() {
  if (stopping) return
  stopping = true
  await server.stop()
  await database.end()
}
process.on('SIGINT', () => { void shutdown() })
process.on('SIGTERM', () => { void shutdown() })
