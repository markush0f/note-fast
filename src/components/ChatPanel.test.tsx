// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ChatPanel from './ChatPanel';

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
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
    <ChatPanel open={open} notebookName="Mi proyecto" onClose={() => setOpen(false)} />
  </>;
}
function openChat() {
  const toggle = container.querySelector<HTMLButtonElement>('[aria-label="Mostrar chat"]')!;
  act(() => { toggle.focus(); toggle.click(); });
  return toggle;
}

describe('chat lateral de diseño', () => {
  it('se abre, recibe foco y se cierra devolviendo el foco al botón', () => {
    act(() => root.render(<Harness />));
    expect(container.querySelector('.chat-slot')!.getAttribute('aria-hidden')).toBe('true');
    const panel = container.querySelector('aside');
    const toggle = openChat();
    expect(container.querySelector('aside')).toBe(panel);
    expect(container.querySelector('.chat-slot')!.hasAttribute('inert')).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(container.querySelector('textarea'));
    expect(container.textContent).toContain('Mi proyecto');
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Ocultar chat"]')!.click());
    expect(container.querySelector('aside')).toBe(panel);
    expect(container.querySelector('.chat-slot')!.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('.chat-slot')!.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('las sugerencias rellenan el borrador, que se conserva al ocultar el panel', () => {
    act(() => root.render(<Harness />));
    openChat();
    const suggestion = [...container.querySelectorAll('button')].find(button => button.textContent === '¿Qué tareas tengo pendientes?')!;
    act(() => suggestion.click());
    expect(container.querySelector('textarea')!.value).toBe('¿Qué tareas tengo pendientes?');
    act(() => container.querySelector('textarea')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(container.querySelector('.chat-slot')!.getAttribute('aria-hidden')).toBe('true');
    openChat();
    expect(container.querySelector('textarea')!.value).toBe('¿Qué tareas tengo pendientes?');
  });

  it('explica el modo de diseño y no permite enviar mensajes', () => {
    act(() => root.render(<Harness />));
    openChat();
    expect(container.textContent).toContain('No se envían mensajes ni se modifican tus páginas.');
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Enviar mensaje"]')!.disabled).toBe(true);
    expect(container.querySelector('form')).toBeNull();
  });
});
