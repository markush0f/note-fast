import { afterAll, describe, expect, it } from 'vitest'
import { getMigrations } from 'better-auth/db/migration'
import { createAuth } from '../src/auth'
import { createApp } from '../src/app'
import { createDatabase } from '../src/database'
import { loadConfig } from '../src/config'

// Usar exclusivamente una base desechable: esta suite crea el esquema de auth.
const databaseUrl = process.env.TEST_DATABASE_URL

describe.skipIf(!databaseUrl)('integración PostgreSQL (base de pruebas desechable)', () => {
  const config = loadConfig({
    DATABASE_URL: databaseUrl ?? 'postgresql://unused:unused@localhost/unused',
    BETTER_AUTH_SECRET: 'postgres-test-only-9f17d502-5043-4a85-b96e-8aae7a48591e',
    BETTER_AUTH_URL: 'http://localhost:3000',
    APP_ORIGINS: 'http://localhost:1420',
  })
  const database = createDatabase(config.databaseUrl)
  afterAll(async () => { await database.end() })

  it('aplica migraciones, persiste cuentas y sesiones y permite cerrar sesión', async () => {
    const auth = createAuth(config, database)
    await (await getMigrations(auth.options)).runMigrations()
    // Una segunda ejecución no debe tener cambios pendientes.
    const again = await getMigrations(auth.options)
    expect(again.toBeCreated).toHaveLength(0)
    expect(again.toBeAdded).toHaveLength(0)

    const app = createApp({ auth, config, database, checkDatabase: async () => { await database.query('SELECT 1') } })
    const email = `test-${crypto.randomUUID()}@example.com`
    const request = (path: string, body: unknown, cookie = '') => app.request(`http://localhost:3000${path}`, {
      method: 'POST',
      headers: { Origin: config.origins[0], 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body),
    })
    try {
      const signup = await request('/api/auth/sign-up/email', { name: 'Test', email, password: 'integration-test-password' })
      expect(signup.status).toBe(200)
      const rows = await database.query('SELECT id FROM "user" WHERE email = $1', [email])
      expect(rows.rowCount).toBe(1)

      // Otra instancia de auth debe recuperar la sesión desde PostgreSQL.
      const cookie = signup.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ')
      const secondAuth = createAuth(config, database)
      const session = await secondAuth.api.getSession({ headers: new Headers({ Cookie: cookie }) })
      expect(session?.user.email).toBe(email)
      await database.query(`CREATE TABLE IF NOT EXISTS user_workspace (
        user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
        payload JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`)
      const put = (version: number) => app.request('http://localhost:3000/api/workspace', {
        method: 'PUT', headers: { Origin: config.origins[0], 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ version, notes: [], folders: [] }),
      })
      expect((await put(2)).status).toBe(200)
      expect((await put(3)).status).toBe(200)
      // Real PostgreSQL exercises the conditional upsert, not the memory double.
      expect((await put(2)).status).toBe(409)
      const competing = await Promise.all([put(2), put(3), put(2)])
      expect(competing.map(response => response.status)).toEqual([409, 200, 409])
      const saved = await database.query('SELECT payload FROM user_workspace WHERE user_id=$1', [session!.user.id])
      expect(saved.rows[0].payload.version).toBe(3)
      expect((await request('/api/auth/sign-out', {}, cookie)).status).toBe(200)
      expect(await secondAuth.api.getSession({ headers: new Headers({ Cookie: cookie }) })).toBeNull()
    } finally {
      await database.query('DELETE FROM "user" WHERE email = $1', [email])
    }
  }, 30_000)
})
