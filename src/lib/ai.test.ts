import { afterEach, describe, expect, it, vi } from 'vitest';
import { listModels, sendChat } from './ai';

afterEach(() => vi.unstubAllGlobals());
describe('cliente de Ollama mediante el backend', () => {
  it('consulta modelos con credenciales de sesión, cuenta y señal de cancelación', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ models: ['llama3.2:latest'] }));
    vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;
    expect(await listModels('ana', signal)).toEqual(['llama3.2:latest']);
    expect(fetchMock).toHaveBeenCalledWith('/api/ai/models', expect.objectContaining({ credentials: 'include', headers: { 'X-Notebook-User': 'ana' }, signal }));
  });

  it('envía exclusivamente modelo e historial y devuelve texto sin ejecutarlo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ message: { role: 'assistant', content: '<script>alert(1)</script>' } }));
    vi.stubGlobal('fetch', fetchMock);
    const messages = [{ role: 'user' as const, content: 'Hola' }];
    expect(await sendChat('ana', 'llama3.2', messages, new AbortController().signal)).toEqual({ role: 'assistant', content: '<script>alert(1)</script>' });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/ai/chat');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ model: 'llama3.2', messages });
  });

  it.each([
    ['ollama_unavailable', 'No se puede conectar con Ollama'],
    ['ollama_timeout', 'ha tardado demasiado'],
    ['ollama_model_missing', 'no está instalado'],
    ['account_changed', 'La cuenta ha cambiado'],
  ])('traduce el error %s', async (error, expected) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error }, { status: 503 })));
    await expect(listModels('ana', new AbortController().signal)).rejects.toThrow(expected);
  });

  it('rechaza respuestas sin texto y listas de modelos malformadas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ message: {} })).mockResolvedValueOnce(Response.json({ models: [42] })));
    await expect(sendChat('ana', 'llama3.2', [{ role: 'user', content: 'Hola' }], new AbortController().signal)).rejects.toThrow('respuesta válida');
    await expect(listModels('ana', new AbortController().signal)).rejects.toThrow('Lista de modelos no válida');
  });
});
