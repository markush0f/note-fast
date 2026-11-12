import { describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config'

const env = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  BETTER_AUTH_SECRET: 'a'.repeat(48),
  BETTER_AUTH_URL: 'http://127.0.0.1:3000',
  APP_ORIGINS: 'http://127.0.0.1:1420',
}

describe('configuración del backend', () => {
  it('carga valores y elimina orígenes duplicados', () => {
    const config = loadConfig({ ...env, APP_ORIGINS: `${env.APP_ORIGINS},${env.APP_ORIGINS}` })
    expect(config.port).toBe(3000)
    expect(config.host).toBe('127.0.0.1')
    expect(config.ollamaBaseUrl).toBe('http://127.0.0.1:11434')
    expect(config.origins).toEqual([env.APP_ORIGINS])
  })

  it.each(['DATABASE_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', 'APP_ORIGINS'])('requiere %s', (key) => {
    expect(() => loadConfig({ ...env, [key]: '' })).toThrow()
  })

  it.each([
    { PORT: '0' }, { PORT: '65536' }, { PORT: '3.5' },
    { OLLAMA_BASE_URL: 'file:///tmp/ollama' }, { OLLAMA_BASE_URL: 'http://localhost:11434/api' },
    { OLLAMA_BASE_URL: 'http://user:secret@localhost:11434' },
    { DATABASE_URL: 'sqlite:test.db' }, { BETTER_AUTH_SECRET: 'short' },
    { APP_ORIGINS: '*' }, { APP_ORIGINS: 'https://app.test/path' },
    { BETTER_AUTH_URL: 'https://user:password@app.test' },
    { NODE_ENV: 'production' },
    { NODE_ENV: 'production', BETTER_AUTH_URL: 'https://api.test' },
  ])('rechaza configuración insegura: %j', (change) => {
    expect(() => loadConfig({ ...env, ...change })).toThrow()
  })

  it('permite configurar el origen de Ollama desde el servidor', () => {
    expect(loadConfig({ ...env, OLLAMA_BASE_URL: 'http://host.docker.internal:11434/' }).ollamaBaseUrl).toBe('http://host.docker.internal:11434')
  })

  it('acepta producción solo con HTTPS', () => {
    expect(loadConfig({ ...env, NODE_ENV: 'production', BETTER_AUTH_URL: 'https://api.test', APP_ORIGINS: 'https://app.test' }).production).toBe(true)
  })
})
