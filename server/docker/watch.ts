import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const watchedDirectories = ['server/src', 'server/docker']
const files = new Map<string, number>()
let child: ReturnType<typeof Bun.spawn> | undefined
let refreshing = false
let shuttingDown = false

async function snapshot() {
  const current = new Map<string, number>()
  for (const directory of watchedDirectories) {
    for await (const relative of new Bun.Glob('**/*.ts').scan({ cwd: directory, onlyFiles: true })) {
      const path = resolve(directory, relative)
      const info = await stat(path)
      current.set(path, info.mtimeMs * 1_000_000 + info.size)
    }
  }
  return current
}

function start() {
  child = Bun.spawn(['bun', 'server/docker/entrypoint.ts', 'start'], {
    stdin: 'inherit', stdout: 'inherit', stderr: 'inherit', env: process.env,
  })
}

async function stop() {
  if (!child) return
  const current = child
  child = undefined
  current.kill('SIGTERM')
  await current.exited
}

async function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  clearInterval(timer)
  await stop()
}
process.on('SIGINT', () => { void shutdown() })
process.on('SIGTERM', () => { void shutdown() })

files.clear()
for (const [path, value] of await snapshot()) files.set(path, value)
start()
const timer = setInterval(() => {
  if (refreshing || shuttingDown) return
  refreshing = true
  void snapshot().then(async (current) => {
    const changed = current.size !== files.size
      || [...current].some(([path, value]) => files.get(path) !== value)
    if (changed) {
      files.clear()
      for (const [path, value] of current) files.set(path, value)
      await stop()
      if (!shuttingDown) start()
    }
  }).catch((error) => console.error('No se pudo revisar los cambios del backend:', error))
    .finally(() => { refreshing = false })
}, 500)
