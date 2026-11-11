import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomBytes } from 'node:crypto'

// El volumen conserva el secreto entre recreaciones de los contenedores.
export async function loadOrCreateSecret(path: string): Promise<string> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
  try {
    await writeFile(path, randomBytes(48).toString('hex'), { flag: 'wx', mode: 0o600 })
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) throw error
  }
  return readSecret(path)
}

export async function readSecret(path: string): Promise<string> {
  const secret = (await readFile(path, 'utf8')).trim()
  if (!/^[a-f0-9]{96}$/.test(secret)) {
    throw new Error('El secreto persistido no es válido. Restaura el volumen de secretos; no se sobrescribirá automáticamente.')
  }
  return secret
}
