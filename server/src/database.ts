import { Pool } from 'pg'

export function createDatabase(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 10_000,
  })
  pool.on('error', (error) => {
    console.error('Error de conexión PostgreSQL:', error.name)
  })
  return pool
}
