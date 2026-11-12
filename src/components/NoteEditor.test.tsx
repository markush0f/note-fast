// @vitest-environment jsdom
import { act, createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import NoteEditor from './NoteEditor';
import { createNote } from '../lib/notes';

it('monta en StrictMode e inserta un bloque sin perder el documento', async () => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const onChange = vi.fn();
  const note = { ...createNote(), content: '<p>Texto conservado</p>' };
  try {
    await act(async () => root.render(createElement(StrictMode, {}, createElement(NoteEditor, {
      note, onChange, onTitleChange: vi.fn(), toolbarPosition: 'top-left', onToolbarPositionChange: vi.fn(), notes: [note], onOpenNote: vi.fn(), checkBlockContent: () => null,
    }))));
    expect(host.querySelector('.tiptap')?.textContent).toContain('Texto conservado');
    act(() => host.querySelector<HTMLButtonElement>('[aria-label="Insertar"]')!.click());
    const button = (label: string) => [...document.querySelectorAll('button')].find(el => el.textContent === label)!;
    act(() => button('Gráfica').click());
    expect(onChange).not.toHaveBeenCalled();
    act(() => button('Aplicar').click());
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.at(-1)![0]).toContain('data-ntbk-block="chart"');
    expect(onChange.mock.calls.at(-1)![0]).toContain('Texto conservado');
  } finally {
    await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals();
  }
});
