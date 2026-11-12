// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import NoteEditor from './NoteEditor';
import { createNote } from '../lib/notes';

vi.mock('../lib/attachments', () => ({
  FILE_ACCEPT: '.png,.pdf',
  attachmentAccount: () => 'user',
  loadAttachment: async () => new Blob(['image']),
  storeAttachment: async () => ({ id: 'new-file', name: 'new.pdf', type: 'application/pdf', size: 10 }),
}));

it('inserts an attachment without replacing the currently selected image and renders synced content', async () => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0));
  const originalCreate = URL.createObjectURL; const originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = vi.fn(() => 'blob:test'); URL.revokeObjectURL = vi.fn();
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const onChange = vi.fn();
  const note = { ...createNote(), content: '<figure data-attachment-id="existing-image" data-name="original.png" data-type="image/png" data-size="12">original.png</figure><p>Keep text</p>' };
  const props = { note, onChange, onTitleChange: vi.fn(), toolbarPosition: 'top-left' as const, onToolbarPositionChange: vi.fn(), notes: [note], onOpenNote: vi.fn(), checkBlockContent: () => null };
  try {
    await act(async () => root.render(createElement(NoteEditor, props)));
    const input = host.querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(input, 'files', { value: [new File(['%PDF-1.4'], 'new.pdf', { type: 'application/pdf' })] });
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(resolve => setTimeout(resolve, 20)); });
    const html = onChange.mock.calls.at(-1)?.[0];
    expect(html).toContain('existing-image');
    expect(html).toContain('new-file');
    expect(html).toContain('Keep text');
    await act(async () => root.render(createElement(NoteEditor, { ...props, note: { ...note, content: '<p>Remote content</p>' } })));
    expect(host.querySelector('.tiptap')?.textContent).toBe('Remote content');
  } finally {
    await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke;
  }
});
