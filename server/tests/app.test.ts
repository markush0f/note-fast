import { beforeEach, describe, expect, it, vi } from 'vitest'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { createApp } from '../src/app'
import { createAuth } from '../src/auth'
import { loadConfig } from '../src/config'

const config = loadConfig({
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  BETTER_AUTH_SECRET: 'test-only-entropy-81269819-4409-4b2f-81bd-c17fa77e48a1',
  BETTER_AUTH_URL: 'http://localhost:3000',
  APP_ORIGINS: 'http://localhost:1420',
})

function setup() {
  const auth = createAuth(config, memoryAdapter({ user: [], account: [], session: [], verification: [], rateLimit: [] }))
  const checkDatabase = vi.fn(async () => {})
  const workspaces = new Map<string, unknown>()
  const database = { query: vi.fn(async (sql: string, params: unknown[] = []) => {
    if (sql.startsWith('SELECT payload')) {
      const payload = workspaces.get(String(params[0]))
      return { rows: payload === undefined ? [] : [{ payload }] }
    }
    if (sql.includes('INSERT INTO user_workspace')) {
      const incoming = JSON.parse(String(params[1]))
      const existing = workspaces.get(String(params[0])) as { version: number } | undefined
      if (sql.includes('WHERE (user_workspace.payload') && existing && existing.version > incoming.version) return { rows: [] }
      workspaces.set(String(params[0]), incoming)
      return { rows: [{ user_id: params[0] }] }
    }
    return { rows: [] }
  }) }
  const app = createApp({ auth, checkDatabase, config, database: database as unknown as import('pg').Pool })
  const post = (path: string, body: unknown, cookie?: string, origin = config.origins[0]) => app.request(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  })
  return { app, post, checkDatabase, workspaces }
}

function cookies(response: Response) {
  return response.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ')
}

const account = { name: 'Ana', email: 'ana@example.com', password: 'a-secure-password-2026' }

// Pruebas de HTTP y sesiones reales de Better Auth; el adaptador en memoria
// evita depender de PostgreSQL. PostgreSQL tiene su propia suite opt-in.
describe('API multiusuario', () => {
  let api: ReturnType<typeof setup>
  beforeEach(() => { api = setup() })

  it('comprueba disponibilidad sin exponer detalles internos', async () => {
    expect((await api.app.request('/health')).status).toBe(200)
    expect((await api.app.request('/ready')).status).toBe(200)
    api.checkDatabase.mockRejectedValue(new Error('secret database credentials'))
    const response = await api.app.request('/ready')
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ status: 'unavailable' })
  })

  it('protege el perfil y no acepta un identificador proporcionado por el cliente', async () => {
    const response = await api.app.request('/api/me?userId=another-user', { headers: { 'x-user-id': 'another-user' } })
    expect(response.status).toBe(401)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('registra, inicia sesión y devuelve solo el usuario autenticado', async () => {
    const signup = await api.post('/api/auth/sign-up/email', account)
    expect(signup.status).toBe(200)
    const signupData = await signup.json()
    expect(signupData.user.email).toBe(account.email)
    const sessionCookie = cookies(signup)
    expect(sessionCookie).toContain('session_token=')
    expect(signup.headers.getSetCookie().join(';')).toContain('HttpOnly')

    const otherSignup = await api.post('/api/auth/sign-up/email', { ...account, name: 'Luis', email: 'luis@example.com' })
    expect(otherSignup.status).toBe(200)
    const otherData = await otherSignup.json()
    const me = await api.app.request(`/api/me?userId=${otherData.user.id}`, { headers: { Cookie: sessionCookie } })
    const profile = await me.json()
    expect(profile.user.id).toBe(signupData.user.id)
    expect(profile.user.id).not.toBe(otherData.user.id)
    expect(profile.user).not.toHaveProperty('password')
    expect(profile).not.toHaveProperty('session')

    const signin = await api.post('/api/auth/sign-in/email', { email: account.email, password: account.password })
    expect(signin.status).toBe(200)
    const logout = await api.post('/api/auth/sign-out', {}, cookies(signin))
    expect(logout.status).toBe(200)
    expect((await api.app.request('/api/me', { headers: { Cookie: cookies(signin) } })).status).toBe(401)
  })

  it('guarda y devuelve el cuaderno solo para su propietario', async () => {
    const signup = await api.post('/api/auth/sign-up/email', account)
    const cookie = cookies(signup)
    const workspace = { version: 2, notes: [], folders: [], theme: 'dark' }
    const save = await api.app.request('http://localhost:3000/api/workspace', {
      method: 'PUT', headers: { Origin: config.origins[0], Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(workspace),
    })
    expect(save.status).toBe(200)
    expect((await (await api.app.request('http://localhost:3000/api/workspace', { headers: { Cookie: cookie } })).json()).workspace).toEqual(workspace)
    expect((await api.app.request('http://localhost:3000/api/workspace')).status).toBe(401)
    const otherSignup = await api.post('/api/auth/sign-up/email', { ...account, name: 'Luis', email: 'luis@example.com' })
    const otherWorkspace = await api.app.request('http://localhost:3000/api/workspace', { headers: { Cookie: cookies(otherSignup) } })
    expect((await otherWorkspace.json()).workspace).toBeNull()
    expect((await api.app.request('http://localhost:3000/api/workspace', { method: 'PUT', headers: { Origin: config.origins[0], 'Content-Type': 'application/json' }, body: JSON.stringify(workspace) })).status).toBe(401)
    expect((await api.app.request('http://localhost:3000/api/workspace', { method: 'PUT', headers: { Origin: config.origins[0], Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ version: 99 }) })).status).toBe(400)
  })

  it('protege v3 de escrituras antiguas y conserva el registro ante errores', async () => {
    const signup = await api.post('/api/auth/sign-up/email', account)
    const cookie = cookies(signup)
    const put = (value: unknown) => api.app.request('http://localhost:3000/api/workspace', {
      method: 'PUT', headers: { Origin: config.origins[0], Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(value),
    })
    expect((await put({ version: 2, notes: [], folders: [] })).status).toBe(200)
    const workspace = { version: 3, notes: [], folders: [], theme: 'dark' }
    expect((await put(workspace)).status).toBe(200)
    const old = await put({ version: 2, notes: [], folders: [] })
    expect(old.status).toBe(409)
    expect(await old.json()).toEqual({ error: 'workspace_upgrade_required' })
    expect((await put({ version: 3, notes: [null], folders: [] })).status).toBe(400)
    expect((await put({ ...workspace, extra: 'x'.repeat(5 * 1024 * 1024) })).status).toBe(413)
    const current = await api.app.request('http://localhost:3000/api/workspace', { headers: { Cookie: cookie } })
    expect((await current.json()).workspace).toEqual(workspace)
  })

  it('rechaza contraseñas cortas y credenciales incorrectas', async () => {
    expect((await api.post('/api/auth/sign-up/email', { ...account, password: 'short' })).status).toBe(400)
    expect((await api.post('/api/auth/sign-up/email', account)).status).toBe(200)
    expect((await api.post('/api/auth/sign-in/email', { email: account.email, password: 'incorrect-password' })).status).toBe(401)
  })

  it('rechaza mutaciones desde orígenes no autorizados o sin origen', async () => {
    expect((await api.post('/api/auth/sign-up/email', account, undefined, 'https://evil.test')).status).toBe(403)
    const noOrigin = await api.app.request('http://localhost:3000/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    })
    expect(noOrigin.status).toBe(403)
  })

  it('rechaza cookies de sesión manipuladas', async () => {
    const response = await api.app.request('/api/me', { headers: { Cookie: 'better-auth.session_token=forged.invalid' } })
    expect(response.status).toBe(401)
  })

  it('permite CORS con credenciales solo para el frontend configurado', async () => {
    const allowed = await api.app.request('/api/me', { headers: { Origin: config.origins[0] } })
    expect(allowed.headers.get('access-control-allow-origin')).toBe(config.origins[0])
    expect(allowed.headers.get('access-control-allow-credentials')).toBe('true')
    const denied = await api.app.request('/api/me', { headers: { Origin: 'https://evil.test' } })
    expect(denied.headers.get('access-control-allow-origin')).toBeNull()
    const preflight = await api.app.request('/api/auth/sign-up/email', {
      method: 'OPTIONS',
      headers: { Origin: config.origins[0], 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
    })
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('access-control-allow-origin')).toBe(config.origins[0])
  })

  it('limita el tamaño del cuerpo y devuelve 404 JSON', async () => {
    expect((await api.post('/api/auth/sign-up/email', { name: 'x'.repeat(70_000) })).status).toBe(413)
    expect(await (await api.app.request('/missing')).json()).toEqual({ error: 'not_found' })
  })

  it('limita intentos sin confiar en cabeceras de IP del cliente', async () => {
    let response: Response | undefined
    for (let i = 0; i < 6; i++) {
      response = await api.app.request('http://localhost:3000/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: config.origins[0], 'x-ntbk-client-ip': `10.0.0.${i}`, 'x-forwarded-for': `10.0.0.${i}` },
        body: JSON.stringify({ email: account.email, password: account.password }),
      })
    }
    expect(response?.status).toBe(429)
  })
})
