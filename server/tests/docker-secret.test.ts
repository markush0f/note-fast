import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadOrCreateSecret, readSecret } from '../docker/secret'

describe('secreto persistente de Docker', () => {
  let directory: string
  let path: string
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'ntbk-secret-'))
    path = join(directory, 'private', 'auth-secret')
  })
  afterEach(async () => { await rm(directory, { recursive: true, force: true }) })

  it('genera un secreto y lo reutiliza sin cambiarlo al reiniciar', async () => {
    const first = await loadOrCreateSecret(path)
    expect(first).toMatch(/^[a-f0-9]{96}$/)
    expect(await loadOrCreateSecret(path)).toBe(first)
    expect(await readSecret(path)).toBe(first)
  })

  it('genera valores distintos para instalaciones independientes', async () => {
    expect(await loadOrCreateSecret(path)).not.toBe(await loadOrCreateSecret(join(directory, 'other', 'auth-secret')))
  })

  it('no reemplaza un secreto dañado silenciosamente', async () => {
    await loadOrCreateSecret(path)
    await writeFile(path, 'invalid')
    await expect(loadOrCreateSecret(path)).rejects.toThrow('secreto persistido no es válido')
    expect(await readFile(path, 'utf8')).toBe('invalid')
  })

  it('el backend no genera otro secreto si falta el volumen inicializado', async () => {
    await expect(readSecret(path)).rejects.toThrow()
  })
})
