// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { storeAttachment, loadAttachment, uploadAttachments, setAttachmentAccount, FILE_LIMIT } from '../../../../src/infrastructure/storage/attachments';
import { exportNoteHTML } from '../../../../src/features/workspace/export/block-export';
import { importBackup } from '../../../../src/features/workspace/export/backup';

const records = vi.hoisted(() => new Map<string, unknown>());
vi.mock('../../../../src/infrastructure/storage/offline-db', () => ({ dbGet: vi.fn(async (_store, key) => records.get(key)), dbPut: vi.fn(async (_store, key, value) => { records.set(key, value); }) }));
beforeEach(() => { records.clear(); setAttachmentAccount('alice'); });
afterEach(() => { setAttachmentAccount(null); vi.unstubAllGlobals(); });
function markup(id: string) { return `<figure data-attachment-id="${id}" data-name="picture.png" data-type="image/png" data-size="8">picture.png</figure>`; }

describe('attachments', () => {
  it('stores files offline and isolates the local cache by account', async () => {
    const file = new File(['picture'], 'picture.png', { type: 'image/png' });
    const attachment = await storeAttachment(file);
    expect(await loadAttachment(attachment.id)).toBe(file);
    setAttachmentAccount('bob');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    await expect(loadAttachment(attachment.id)).rejects.toThrow('Adjunto no disponible');
  });
  it('rejects unsupported and oversized files', async () => {
    await expect(storeAttachment(new File(['<svg/>'], 'bad.svg', { type: 'image/svg+xml' }))).rejects.toThrow('Admite imágenes');
    const file = new File(['a'], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: FILE_LIMIT + 1 });
    await expect(storeAttachment(file)).rejects.toThrow('10 MiB');
  });
  it('uploads a queued file once and preserves it after errors', async () => {
    const attachment = await storeAttachment(new File(['%PDF-1.4'], 'file.pdf', { type: 'application/pdf' }));
    const fetch = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response('{}', { status: 500 })); vi.stubGlobal('fetch', fetch);
    await expect(uploadAttachments(markup(attachment.id), 'alice')).rejects.toThrow('Se conserva');
    fetch.mockResolvedValue(new Response('{}', { status: 200 }));
    await uploadAttachments(markup(attachment.id), 'alice');
    await uploadAttachments(markup(attachment.id), 'alice');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({ headers: { 'X-Notebook-User': 'alice' } });
  });
  it('embeds images in standalone HTML exports', async () => {
    const attachment = await storeAttachment(new File(['image'], 'picture.png', { type: 'image/png' }));
    const html = await exportNoteHTML(markup(attachment.id));
    expect(html).toContain('src="data:image/png;base64,');
    expect(html).not.toContain('data-attachment-id');
  });
  it('restores a portable backup with new file IDs and rejects missing files', async () => {
    const id = crypto.randomUUID();
    const workspace = { version: 3, folders: [], notes: [{ id: 'n', title: '', content: markup(id), favorite: false, folderId: null, createdAt: 'today', updatedAt: 'today' }] };
    const restored = await importBackup(JSON.stringify({ ...workspace, files: [{ id, name: 'picture.png', data: 'data:image/png;base64,aW1hZ2U=' }] }));
    expect(restored.notes[0].content).not.toContain(id);
    expect(records.size).toBe(1);
    await expect(importBackup(JSON.stringify(workspace))).rejects.toThrow('no incluye los archivos');
  });
});
