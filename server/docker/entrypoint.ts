import { loadOrCreateSecret, readSecret } from './secret'

const mode = process.argv[2] ?? 'start'
if (!['start', 'migrate'].includes(mode)) throw new Error('Modo no válido: usar start o migrate')

if (!process.env.BETTER_AUTH_SECRET) {
  const path = '/var/lib/ntbk/auth-secret'
  process.env.BETTER_AUTH_SECRET = await (mode === 'migrate' ? loadOrCreateSecret(path) : readSecret(path))
}

// Importar después de cargar el secreto; un error de migración detiene Compose.
if (mode === 'migrate') {
  await import('../src/migrate')
} else {
  await import('../src/index')
}
