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
  await database.query(`
    CREATE TABLE IF NOT EXISTS user_workspace (
      user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  console.info('Esquema de autenticación y cuadernos actualizado.')
} finally {
  await database.end()
}
