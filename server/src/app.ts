import { Hono } from 'hono'
import { fileRoutes } from './files'
import { ollamaRoutes } from './ollama'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { bodyLimit } from 'hono/body-limit'
import type { Auth } from './auth'
import type { Config } from './config'
import type { Pool } from 'pg'

function isWorkspace(value: unknown): value is { version: 2 | 3 | 4; notes: unknown[]; folders?: unknown[]; notebooks?: unknown[] } {
  if (!value || typeof value !== 'object') return false
  const workspace = value as Record<string, unknown>
  if (![2, 3, 4].includes(Number(workspace.version)) || !Array.isArray(workspace.notes)) return false
  const containers = workspace.version === 4 ? workspace.notebooks : workspace.folders
  if (!Array.isArray(containers)) return false
  if (workspace.notes.length > 20_000 || containers.length > 5_000) return false
  return workspace.notes.every((note) => note && typeof note === 'object'
    && typeof note.id === 'string' && typeof note.title === 'string' && typeof note.content === 'string'
    && typeof note.favorite === 'boolean' && typeof note.createdAt === 'string' && typeof note.updatedAt === 'string')
    && (workspace.version === 4
      ? containers.every((book) => book && typeof book === 'object' && typeof book.id === 'string' && typeof book.name === 'string' && typeof book.description === 'string')
      : containers.every((folder) => folder && typeof folder === 'object' && typeof folder.id === 'string' && typeof folder.name === 'string' && (folder.parentId === null || typeof folder.parentId === 'string')))
}

interface Dependencies {
  auth: Pick<Auth, 'handler' | 'api'>
  checkDatabase: () => Promise<void>
  database: Pick<Pool, 'query' | 'connect'>
  config: Pick<Config, 'origins' | 'authUrl'> & Partial<Pick<Config, 'ollamaBaseUrl'>>
}

export function createApp({ auth, checkDatabase, config, database }: Dependencies) {
  const app = new Hono<{ Bindings: { clientIp?: string } }>()
  app.use('*', secureHeaders())
  app.use('/api/*', async (c, next) => {
    c.header('Cache-Control', 'no-store')
    await next()
  })
  app.use('/api/*', cors({
    origin: (origin) => config.origins.includes(origin) ? origin : undefined,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'If-Match', 'X-Notebook-User'],
    maxAge: 600,
  }))
  app.use('/api/auth/*', bodyLimit({
    maxSize: 64 * 1024,
    onError: (c) => c.json({ error: 'request_too_large' }, 413),
  }))
  app.use('/api/sync', bodyLimit({
    maxSize: 5 * 1024 * 1024,
    onError: (c) => c.json({ error: 'request_too_large' }, 413),
  }))
  app.use('/api/workspace', bodyLimit({
    maxSize: 5 * 1024 * 1024,
    onError: (c) => c.json({ error: 'request_too_large' }, 413),
  }))

  app.use('/api/*', async (c, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
      const origin = c.req.header('Origin')
      if (!origin || ![config.authUrl, ...config.origins].includes(origin)) {
        return c.json({ error: 'forbidden_origin' }, 403)
      }
    }
    await next()
  })

  app.get('/health', (c) => c.json({ status: 'ok' }))
  app.get('/ready', async (c) => {
    try {
      await checkDatabase()
      return c.json({ status: 'ok' })
    } catch {
      return c.json({ status: 'unavailable' }, 503)
    }
  })

  app.on(['GET', 'POST'], '/api/auth/*', (c) => {
    const headers = new Headers(c.req.raw.headers)
    // Nunca usar la IP que pueda proporcionar el cliente en sus cabeceras.
    headers.set('x-ntbk-client-ip', c.env?.clientIp ?? '127.0.0.1')
    return auth.handler(new Request(c.req.raw, { headers }))
  })

  const authenticatedUser = async (request: Request) => {
    const session = await auth.api.getSession({ headers: request.headers })
    return session?.user
  }

  app.use('/api/*', async (c, next) => {
    if (c.req.path === '/api/sync' || c.req.path.startsWith('/api/files/')) {
      const user = await authenticatedUser(c.req.raw)
      if (!user) return c.json({ error: 'unauthorized' }, 401)
      if (c.req.header('X-Notebook-User') !== user.id) return c.json({ error: 'account_changed' }, 409)
    }
    await next()
  })
  fileRoutes(app, database, authenticatedUser)
  ollamaRoutes(app, config.ollamaBaseUrl ?? 'http://127.0.0.1:11434', authenticatedUser)

  app.get('/api/workspace', async (c) => {
    const user = await authenticatedUser(c.req.raw)
    if (!user) return c.json({ error: 'unauthorized' }, 401)
    const result = await database.query<{ payload: unknown }>(
      'SELECT payload FROM user_workspace WHERE user_id = $1', [user.id],
    )
    return c.json({ workspace: result.rows[0]?.payload ?? null })
  })

  app.put('/api/workspace', async (c) => {
    const user = await authenticatedUser(c.req.raw)
    if (!user) return c.json({ error: 'unauthorized' }, 401)
    let value: unknown
    try { value = await c.req.json() } catch { return c.json({ error: 'invalid_workspace' }, 400) }
    if (!isWorkspace(value)) return c.json({ error: 'invalid_workspace' }, 400)
    const workspace = value
    const result = await database.query(
      `INSERT INTO user_workspace (user_id, payload, updated_at) VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
       WHERE (user_workspace.payload->>'version')::int <= (EXCLUDED.payload->>'version')::int AND user_workspace.revision = 0
       RETURNING user_id`,
      [user.id, JSON.stringify(workspace)],
    )
    if (!result.rows.length) return c.json({ error: 'workspace_upgrade_required' }, 409)
    return c.json({ ok: true })
  })

  // Revision-checked endpoint for offline clients. Legacy writes cannot overwrite it.
  app.get('/api/sync', async c => {
    const user = await authenticatedUser(c.req.raw)
    if (!user) return c.json({ error: 'unauthorized' }, 401)
    const result = await database.query('SELECT payload, revision FROM user_workspace WHERE user_id = $1', [user.id])
    return c.json({ workspace: result.rows[0]?.payload ?? null, revision: result.rows[0]?.revision ?? 0 })
  })
  app.put('/api/sync', async c => {
    const user = await authenticatedUser(c.req.raw)
    if (!user) return c.json({ error: 'unauthorized' }, 401)
    const expected = c.req.header('If-Match') ?? ''
    if (!/^\d{1,9}$/.test(expected)) return c.json({ error: 'revision_required' }, 428)
    let workspace: unknown
    try { workspace = await c.req.json() } catch { return c.json({ error: 'invalid_workspace' }, 400) }
    if (!isWorkspace(workspace)) return c.json({ error: 'invalid_workspace' }, 400)
    const result = await database.query(
      `INSERT INTO user_workspace (user_id, payload, revision, updated_at)
       SELECT $1, $2::jsonb, 1, NOW() WHERE $3::int = 0 OR EXISTS (SELECT 1 FROM user_workspace WHERE user_id = $1)
       ON CONFLICT (user_id) DO UPDATE SET payload = EXCLUDED.payload, revision = user_workspace.revision + 1, updated_at = NOW()
       WHERE user_workspace.revision = $3::int AND (user_workspace.payload->>'version')::int <= (EXCLUDED.payload->>'version')::int
       RETURNING revision`, [user.id, JSON.stringify(workspace), Number(expected)],
    )
    if (!result.rows.length) return c.json({ error: 'sync_conflict' }, 409)
    return c.json({ revision: result.rows[0].revision })
  })

  app.get('/api/me', async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) return c.json({ error: 'unauthorized' }, 401)
    // El identificador procede exclusivamente de la sesión validada, nunca
    // de parámetros del cliente. No devolver tokens ni datos de otras cuentas.
    const { id, name, email, emailVerified, image } = session.user
    return c.json({ user: { id, name, email, emailVerified, image } })
  })

  app.notFound((c) => c.json({ error: 'not_found' }, 404))
  app.onError((error, c) => {
    console.error('Error de API:', error.name)
    return c.json({ error: 'internal_error' }, 500)
  })
  return app
}
