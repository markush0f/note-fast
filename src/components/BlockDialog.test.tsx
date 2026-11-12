// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BlockDialog from './BlockDialog';
import { newChart, type BlockData } from '../lib/note-blocks';

let root: Root;
let host: HTMLDivElement;
beforeEach(() => { (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true; host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); });
const button = (name: string) => [...document.querySelectorAll('button')].find(el => el.textContent === name)!;
function change(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('borrador de gráfica', () => {
  it('cancelar no aplica e impide que los atajos alcancen la ventana', () => {
    const apply = vi.fn(() => null);
    const close = vi.fn();
    act(() => root.render(createElement(BlockDialog, { initial: newChart(), onApply: apply, onClose: close })));
    const handler = vi.fn(); window.addEventListener('keydown', handler);
    act(() => document.querySelector('input')!.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'n', ctrlKey: true, altKey: true })));
    expect(handler).not.toHaveBeenCalled(); window.removeEventListener('keydown', handler);
    act(() => button('Cancelar').click());
    expect(close).toHaveBeenCalledOnce(); expect(apply).not.toHaveBeenCalled();
  });
  it('confirma al descartar cambios y conserva el borrador si aplicar falla', () => {
    const apply = vi.fn((_data: BlockData) => 'El cuaderno supera 5 MiB.');
    const close = vi.fn(); const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    act(() => root.render(createElement(BlockDialog, { initial: newChart(), onApply: apply, onClose: close })));
    act(() => change(document.querySelector('input')!, 'Título cambiado'));
    act(() => button('Cancelar').click());
    expect(confirm).toHaveBeenCalledOnce(); expect(close).not.toHaveBeenCalled();
    act(() => button('Aplicar').click());
    expect(apply.mock.calls[0]![0].title).toBe('Título cambiado');
    expect(document.querySelector('[role=alert]')?.textContent).toContain('5 MiB');
    expect(close).not.toHaveBeenCalled();
  });
  it('solo aplica datos válidos y no borra series al cambiar a sectores', () => {
    const apply = vi.fn(() => null);
    act(() => root.render(createElement(BlockDialog, { initial: newChart(), onApply: apply, onClose: vi.fn() })));
    act(() => button('Añadir serie').click());
    const select = document.querySelector('select')!;
    act(() => { select.value = 'pie'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(document.querySelectorAll('input[type=color]')).toHaveLength(2);
    expect(button('Aplicar').disabled).toBe(true);
    act(() => button('Eliminar serie 2').click());
    expect(button('Aplicar').disabled).toBe(false);
    act(() => button('Aplicar').click());
    expect(apply).toHaveBeenCalledOnce();
  });
});
