// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ChatPanel from './ChatPanel';
import { listModels, sendChat } from '../lib/ai';

vi.mock('../lib/ai', () => ({ listModels: vi.fn(), sendChat: vi.fn() }));
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listModels).mockResolvedValue(['llama3.2:latest']);
  vi.mocked(sendChat).mockResolvedValue({ role: 'assistant', content: 'Hola, ¿en qué te ayudo?' });
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function Harness() {
  const [open, setOpen] = useState(false);
  return <>
    <button aria-label="Mostrar chat" aria-expanded={open} onClick={() => setOpen(value => !value)}>Asistente</button>
    <ChatPanel open={open} userId="ana" onClose={() => setOpen(false)} />
  </>;
}
async function openChat() {
  const toggle = container.querySelector<HTMLButtonElement>('[aria-label="Mostrar chat"]')!;
  await act(async () => { toggle.focus(); toggle.click(); });
  return toggle;
}
function button(label: string) { return container.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!; }
function suggest() {
  act(() => [...container.querySelectorAll('button')].find(item => item.textContent === 'Ayúdame a ordenar mis ideas')!.click());
}
async function submit() { await act(async () => button('Enviar mensaje').click()); }

describe('chat lateral con Ollama', () => {
  it('se abre sin remontar el panel y se cierra devolviendo el foco', async () => {
    act(() => root.render(<Harness />));
    expect(listModels).not.toHaveBeenCalled();
    expect(container.querySelector('.chat-slot')!.getAttribute('aria-hidden')).toBe('true');
    const panel = container.querySelector('aside');
    const toggle = await openChat();
    expect(container.querySelector('aside')).toBe(panel);
    expect(container.querySelector('.chat-slot')!.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(container.querySelector('textarea'));
    act(() => button('Ocultar chat').click());
    expect(container.querySelector('aside')).toBe(panel);
    expect(container.querySelector('.chat-slot')!.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe(toggle);
  });

  it('conserva el borrador al ocultar el panel con Escape', async () => {
    act(() => root.render(<Harness />));
    await openChat();
    suggest();
    act(() => container.querySelector('textarea')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await openChat();
    expect(container.querySelector('textarea')!.value).toBe('Ayúdame a ordenar mis ideas');
  });

  it('envía mensajes con modelo y cuenta, conserva el historial y permite limpiarlo', async () => {
    act(() => root.render(<Harness />));
    await openChat();
    expect(button('Enviar mensaje').disabled).toBe(true);
    suggest();
    await submit();
    expect(sendChat).toHaveBeenCalledWith('ana', 'llama3.2:latest', [{ role: 'user', content: 'Ayúdame a ordenar mis ideas' }], expect.any(AbortSignal));
    expect(container.querySelector('[role="log"]')!.textContent).toContain('Hola, ¿en qué te ayudo?');
    act(() => button('Ocultar chat').click());
    await openChat();
    act(() => {
      const input = container.querySelector('textarea')!;
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, 'Continúa');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await submit();
    expect(vi.mocked(sendChat).mock.calls[1][2]).toHaveLength(3);
    act(() => button('Nueva conversación').click());
    expect(container.querySelector('[role="log"]')).toBeNull();
    expect(container.textContent).toContain('Sin acceso a tus páginas');
  });

  it('muestra errores y restaura el mensaje para reintentarlo sin duplicarlo', async () => {
    vi.mocked(sendChat).mockRejectedValueOnce(new Error('Ollama no está disponible'));
    act(() => root.render(<Harness />));
    await openChat();
    suggest();
    await submit();
    expect(container.querySelector('[role="alert"]')!.textContent).toContain('Ollama no está disponible');
    expect(container.querySelector('textarea')!.value).toBe('Ayúdame a ordenar mis ideas');
    await submit();
    expect(vi.mocked(sendChat).mock.calls[1][2]).toHaveLength(1);
  });

  it('gestiona la lista vacía, el error de conexión y la actualización', async () => {
    vi.mocked(listModels).mockRejectedValueOnce(new Error('No se puede conectar con Ollama'));
    act(() => root.render(<Harness />));
    await openChat();
    expect(container.querySelector('[role="alert"]')!.textContent).toContain('No se puede conectar');
    vi.mocked(listModels).mockResolvedValueOnce([]);
    await act(async () => button('Actualizar modelos').click());
    expect(container.textContent).toContain('ollama pull llama3.2');
    suggest();
    expect(button('Enviar mensaje').disabled).toBe(true);
    await act(async () => button('Actualizar modelos').click());
    expect(button('Enviar mensaje').disabled).toBe(false);
  });

  it('detiene la petición y restaura el borrador', async () => {
    vi.mocked(sendChat).mockImplementation((_user, _model, _messages, signal) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    act(() => root.render(<Harness />));
    await openChat();
    suggest();
    await submit();
    expect(container.querySelector('[role="status"]')!.textContent).toContain('Generando');
    await act(async () => [...container.querySelectorAll('button')].find(item => item.textContent === 'Detener')!.click());
    expect(vi.mocked(sendChat).mock.calls[0][3].aborted).toBe(true);
    expect(container.querySelector('textarea')!.value).toBe('Ayúdame a ordenar mis ideas');
    expect(container.textContent).toContain('Respuesta detenida');
  });
});
