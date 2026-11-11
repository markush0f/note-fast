import { getMigrations } from 'better-auth/db/migration'
import { createAuth } from './auth'
import { loadConfig } from './config'
import { createDatabase } from './database'

const config = loadConfig(process.env)
const database = createDatabase(config.databaseUrl)
try {
  const auth = createAuth(config, database)
  const migrations = await getMigrations(auth.options)
  console.info(`Tablas nuevas: ${migrations.toBeCreated.length}; tablas a actualizar: ${migrations.toBeAdded.length}`)
  await migrations.runMigrations()
  console.info('Esquema de autenticación actualizado.')
} finally {
  await database.end()
}
