import type { Pool } from 'pg'
import type { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

export function validFile(type: string, data: Uint8Array): boolean {
  const starts = (...bytes: number[]) => bytes.every((byte, index) => data[index] === byte)
  if (type === 'image/png') return starts(137, 80, 78, 71, 13, 10, 26, 10)
  if (type === 'image/jpeg') return starts(255, 216, 255)
  if (type === 'image/gif') return /^GIF8[79]a/.test(new TextDecoder().decode(data.slice(0, 6)))
  if (type === 'image/webp') return new TextDecoder().decode(data.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(data.slice(8, 12)) === 'WEBP'
  return type === 'application/pdf' && starts(37, 80, 68, 70, 45)
}

export function fileRoutes(
  app: Hono<{ Bindings: { clientIp?: string } }>,
  database: Pick<Pool, 'query' | 'connect'>,
  userFor: (request: Request) => Promise<{ id: string } | undefined>,
) {
  app.use('/api/files/*', bodyLimit({ maxSize: 10 * 1024 * 1024, onError: c => c.json({ error: 'file_too_large' }, 413) }))
  app.get('/api/files/:id', async c => {
    const user = await userFor(c.req.raw)
    if (!user) return c.json({ error: 'unauthorized' }, 401)
    const result = await database.query<{ content: Buffer; media_type: string }>('SELECT content, media_type FROM user_file WHERE user_id = $1 AND id = $2', [user.id, c.req.param('id')])
    const file = result.rows[0]
    if (!file) return c.json({ error: 'not_found' }, 404)
    c.header('Content-Type', file.media_type)
    c.header('Content-Disposition', 'attachment')
    c.header('X-Content-Type-Options', 'nosniff')
    return c.body(new Uint8Array(file.content))
  })
  app.put('/api/files/:id', async c => {
    const user = await userFor(c.req.raw)
    if (!user) return c.json({ error: 'unauthorized' }, 401)
    const id = c.req.param('id')
    if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id)) return c.json({ error: 'invalid_id' }, 400)
    const type = c.req.header('Content-Type') ?? ''
    const data = new Uint8Array(await c.req.arrayBuffer())
    if (!data.length || !validFile(type, data)) return c.json({ error: 'invalid_file' }, 400)
    const client = await database.connect()
    try {
      await client.query('BEGIN')
      // Serialize uploads for each account; quota is checked after acquiring the lock.
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [user.id])
      const existing = await client.query('SELECT id FROM user_file WHERE user_id = $1 AND id = $2', [user.id, id])
      if (existing.rows.length) { await client.query('COMMIT'); return c.json({ ok: true }) }
      const usage = await client.query<{ bytes: string }>('SELECT COALESCE(SUM(octet_length(content)), 0) AS bytes FROM user_file WHERE user_id = $1', [user.id])
      if (Number(usage.rows[0].bytes) + data.length > 100 * 1024 * 1024) {
        await client.query('ROLLBACK')
        return c.json({ error: 'quota_exceeded' }, 413)
      }
      await client.query('INSERT INTO user_file (user_id, id, media_type, content) VALUES ($1, $2, $3, $4)', [user.id, id, type, Buffer.from(data)])
      await client.query('COMMIT')
      return c.json({ ok: true })
    } catch (error) { await client.query('ROLLBACK'); throw error }
    finally { client.release() }
  })
}
