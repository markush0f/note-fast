import type { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

interface Message { role: 'user' | 'assistant'; content: string }
function validChat(value: unknown): value is { model: string; messages: Message[] } {
  if (!value || typeof value !== 'object') return false
  const { model, messages } = value as Record<string, unknown>
  if (typeof model !== 'string' || !/^[\w./:-]{1,200}$/.test(model) || !Array.isArray(messages)
    || !messages.length || messages.length > 20) return false
  let total = 0
  return messages.every((message, index) => {
    if (!message || typeof message !== 'object' || message.role !== (index % 2 === 0 ? 'user' : 'assistant')
      || typeof message.content !== 'string' || !message.content.trim() || message.content.length > 16000) return false
    total += message.content.length
    return total <= 64000
  }) && messages.at(-1)?.role === 'user'
}

// Bound even malformed/hostile upstream responses, not just incoming requests.
async function readJson(response: Response): Promise<unknown> {
  if (!response.ok || !response.body) { await response.body?.cancel(); throw new Error('ollama_response') }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.length
      if (size > 1024 * 1024) throw new Error('ollama_response_too_large')
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
    return JSON.parse(new TextDecoder().decode(bytes))
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
}

export function ollamaRoutes(
  app: Hono<{ Bindings: { clientIp?: string } }>,
  baseUrl: string,
  userFor: (request: Request) => Promise<{ id: string } | undefined>,
  fetchOllama: typeof fetch = fetch,
) {
  const active = new Set<string>()
  app.use('/api/ai/*', async (c, next) => {
    const user = await userFor(c.req.raw)
    if (!user) return c.json({ error: 'unauthorized' }, 401)
    if (c.req.header('X-Notebook-User') !== user.id) return c.json({ error: 'account_changed' }, 409)
    await next()
  })
  app.use('/api/ai/chat', bodyLimit({ maxSize: 256 * 1024, onError: c => c.json({ error: 'request_too_large' }, 413) }))

  app.get('/api/ai/models', async c => {
    const timeout = AbortSignal.timeout(10000)
    try {
      const data = await readJson(await fetchOllama(`${baseUrl}/api/tags`, {
        signal: AbortSignal.any([c.req.raw.signal, timeout]), redirect: 'error',
      })) as { models?: { name?: unknown }[] }
      if (!Array.isArray(data.models)) throw new Error('invalid_models')
      const models = data.models.map(model => model?.name).filter((name): name is string => typeof name === 'string' && /^[\w./:-]{1,200}$/.test(name))
      return c.json({ models: [...new Set(models)].sort() })
    } catch { return c.json({ error: 'ollama_unavailable' }, 503) }
  })

  app.post('/api/ai/chat', async c => {
    let value: unknown
    try { value = await c.req.json() } catch { return c.json({ error: 'invalid_chat' }, 400) }
    if (!validChat(value)) return c.json({ error: 'invalid_chat' }, 400)
    // The account id was checked against the authenticated session by middleware.
    const userId = c.req.header('X-Notebook-User')!
    if (active.has(userId) || active.size >= 4) return c.json({ error: 'ollama_busy' }, 429)
    active.add(userId)
    const timeout = AbortSignal.timeout(180000)
    try {
      const response = await fetchOllama(`${baseUrl}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, redirect: 'error',
        signal: AbortSignal.any([c.req.raw.signal, timeout]),
        body: JSON.stringify({
          model: value.model,
          messages: [
            { role: 'system', content: 'Eres el asistente de ntbk. Responde en español salvo que te pidan otro idioma. Solo tienes acceso a esta conversación: no puedes leer ni modificar cuadernos, páginas ni archivos. No finjas haber realizado acciones.' },
            ...value.messages.map(({ role, content }) => ({ role, content })),
          ],
          stream: false,
          options: { num_predict: 2048 },
        }),
      })
      if (response.status === 404) { await response.body?.cancel(); return c.json({ error: 'ollama_model_missing' }, 404) }
      const data = await readJson(response) as { message?: { content?: unknown } }
      const content = data.message?.content
      if (typeof content !== 'string' || !content.trim() || content.length > 16000) return c.json({ error: 'ollama_invalid_response' }, 502)
      return c.json({ message: { role: 'assistant' as const, content } })
    } catch {
      return c.json({ error: timeout.aborted ? 'ollama_timeout' : 'ollama_unavailable' }, timeout.aborted ? 504 : 503)
    } finally { active.delete(userId) }
  })
}
