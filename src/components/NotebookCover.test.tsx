// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import NotebookCover from './NotebookCover';
import { createNote } from '../lib/notes';
import type { Workspace } from '../lib/workspace';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
const note = { ...createNote(), title: 'Ideas para el viaje', favorite: true, updatedAt: '2026-04-10T00:00:00.000Z' };
const workspace: Workspace = { version: 3, notes: [note], folders: [{ id: 'folder', name: 'Proyectos', parentId: null }] };

it('shows an editable cover, favorites and recent pages with navigation actions', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const onChange = vi.fn(); const onOpenNote = vi.fn(); const onOpenFolder = vi.fn(); const onNewNote = vi.fn();
  try {
    await act(async () => root.render(createElement(NotebookCover, { workspace, notes: [note], folders: workspace.folders, onChange, onOpenNote, onOpenFolder, onNewNote })));
    expect(host.querySelector('[aria-label="Portada del cuaderno"]')).not.toBeNull();
    expect(host.querySelector('[aria-label="Nombre del cuaderno"]')?.getAttribute('placeholder')).toBe('Mi cuaderno');
    expect(host.textContent).toContain('Favoritas');
    expect(host.textContent).toContain('Abiertas recientemente');
    await act(async () => {
      const title = host.querySelector<HTMLInputElement>('[aria-label="Nombre del cuaderno"]')!;
      const description = host.querySelector<HTMLTextAreaElement>('[aria-label="Descripción del cuaderno"]')!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(title, 'Mi diario de viaje');
      title.dispatchEvent(new Event('input', { bubbles: true }));
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(description, 'Recuerdos y rutas');
      description.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith({ title: 'Mi diario de viaje' });
    expect(onChange).toHaveBeenCalledWith({ description: 'Recuerdos y rutas' });
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Cambiar icono del cuaderno"]')!.click());
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Cambiar icono');
    await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Cancelar')!.click());
    await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Ideas para el viaje'))!.click());
    expect(onOpenNote).toHaveBeenCalledWith(note);
    await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Proyectos'))!.click());
    expect(onOpenFolder).toHaveBeenCalledWith(workspace.folders[0]);
    await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Nueva página'))!.click());
    expect(onNewNote).toHaveBeenCalledOnce();
  } finally { await act(async () => root.unmount()); host.remove(); }
});

it('shows a clear first-page prompt when the notebook is empty', async () => {
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  try {
    await act(async () => root.render(createElement(NotebookCover, { workspace: { version: 3, notes: [], folders: [] }, notes: [], folders: [], onChange: vi.fn(), onOpenNote: vi.fn(), onOpenFolder: vi.fn(), onNewNote: vi.fn() })));
    expect(host.textContent).toContain('Tu cuaderno empieza aquí');
  } finally { await act(async () => root.unmount()); host.remove(); }
});
