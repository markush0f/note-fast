export interface Config {
  port: number
  host: string
  databaseUrl: string
  authSecret: string
  authUrl: string
  origins: string[]
  production: boolean
  ollamaBaseUrl: string
}

function required(env: Record<string, string | undefined>, name: string): string {
  const value = env[name]?.trim()
  if (!value) throw new Error(`Falta la variable ${name}`)
  return value
}

function origin(value: string, name: string, production: boolean): string {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
    || url.search || url.hash || url.pathname !== '/') {
    throw new Error(`${name} debe ser un origen HTTP(S), sin ruta ni credenciales`)
  }
  if (production && url.protocol !== 'https:') throw new Error(`${name} requiere HTTPS en producción`)
  return url.origin
}

export function loadConfig(env: Record<string, string | undefined>): Config {
  const production = env.NODE_ENV === 'production'
  const port = Number(env.PORT ?? '3000')
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT no válido')
  const databaseUrl = required(env, 'DATABASE_URL')
  if (!['postgres:', 'postgresql:'].includes(new URL(databaseUrl).protocol)) {
    throw new Error('DATABASE_URL debe apuntar a PostgreSQL')
  }
  const authSecret = required(env, 'BETTER_AUTH_SECRET')
  if (authSecret.length < 32 || /change.?me|replace|cambiar|example/i.test(authSecret)) {
    throw new Error('BETTER_AUTH_SECRET debe ser aleatorio y tener al menos 32 caracteres')
  }
  const authUrl = origin(required(env, 'BETTER_AUTH_URL'), 'BETTER_AUTH_URL', production)
  const origins = required(env, 'APP_ORIGINS').split(',').map((value) => origin(value.trim(), 'APP_ORIGINS', production))
  const ollamaBaseUrl = origin(env.OLLAMA_BASE_URL?.trim() || 'http://127.0.0.1:11434', 'OLLAMA_BASE_URL', false)
  return { port, host: env.HOST?.trim() || '127.0.0.1', databaseUrl, authSecret, authUrl, origins: [...new Set(origins)], production, ollamaBaseUrl }
}
