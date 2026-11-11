import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { bodyLimit } from 'hono/body-limit'
import type { Auth } from './auth'
import type { Config } from './config'
import type { Pool } from 'pg'

function isWorkspace(value: unknown): value is { version: 2; notes: unknown[]; folders: unknown[] } {
  if (!value || typeof value !== 'object') return false
  const workspace = value as Record<string, unknown>
  if (workspace.version !== 2 || !Array.isArray(workspace.notes) || !Array.isArray(workspace.folders)) return false
  if (workspace.notes.length > 20_000 || workspace.folders.length > 5_000) return false
  return workspace.notes.every((note) => note && typeof note === 'object'
    && typeof note.id === 'string' && typeof note.title === 'string' && typeof note.content === 'string'
    && typeof note.favorite === 'boolean' && typeof note.createdAt === 'string' && typeof note.updatedAt === 'string')
    && workspace.folders.every((folder) => folder && typeof folder === 'object'
      && typeof folder.id === 'string' && typeof folder.name === 'string'
      && (folder.parentId === null || typeof folder.parentId === 'string'))
}

interface Dependencies {
  auth: Pick<Auth, 'handler' | 'api'>
  checkDatabase: () => Promise<void>
  database: Pick<Pool, 'query'>
  config: Pick<Config, 'origins' | 'authUrl'>
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
    allowHeaders: ['Content-Type'],
    maxAge: 600,
  }))
  app.use('/api/auth/*', bodyLimit({
    maxSize: 64 * 1024,
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
    await database.query(
      `INSERT INTO user_workspace (user_id, payload, updated_at) VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
      [user.id, JSON.stringify(workspace)],
    )
    return c.json({ ok: true })
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
