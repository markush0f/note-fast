import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { bodyLimit } from 'hono/body-limit'
import type { Auth } from './auth'
import type { Config } from './config'

interface Dependencies {
  auth: Pick<Auth, 'handler' | 'api'>
  checkDatabase: () => Promise<void>
  config: Pick<Config, 'origins' | 'authUrl'>
}

export function createApp({ auth, checkDatabase, config }: Dependencies) {
  const app = new Hono<{ Bindings: { clientIp?: string } }>()
  app.use('*', secureHeaders())
  app.use('/api/*', async (c, next) => {
    c.header('Cache-Control', 'no-store')
    await next()
  })
  app.use('/api/*', cors({
    origin: (origin) => config.origins.includes(origin) ? origin : undefined,
    credentials: true,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 600,
  }))
  app.use('/api/*', bodyLimit({
    maxSize: 64 * 1024,
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
