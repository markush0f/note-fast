// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { dbGet, dbPut } from '../../../../src/infrastructure/storage/offline-db';
import { OfflineNotebook } from '../../../../src/infrastructure/sync/offline-sync';
import { createNote } from '../../../../src/features/workspace/model/notes';
import { DEFAULT_NOTEBOOK_ID, DEFAULT_NOTEBOOK_NAME, type Workspace } from '../../../../src/features/workspace/model/workspace';

vi.mock('../../../../src/infrastructure/api/cloud', () => ({ currentUser: vi.fn(async () => ({ id: 'offline-test', name: 'Test', email: 'test@example.com' })) }));
vi.mock('../../../../src/infrastructure/storage/attachments', () => ({ uploadAttachments: vi.fn(async () => {}), cacheAttachments: vi.fn(async () => {}) }));
const user = { id: 'offline-test', name: 'Test', email: 'test@example.com' };
const note = createNote();
const original: Workspace = { version: 4, notes: [note], notebooks: [{ id: DEFAULT_NOTEBOOK_ID, name: DEFAULT_NOTEBOOK_NAME, description: '' }] };
let notebook: OfflineNotebook | undefined;
let remote: Workspace;
let revision: number;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  remote = structuredClone(original); revision = 1;
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: vi.fn((_name, _options, callback) => Promise.resolve(callback({}))) } });
  await dbPut('state', `workspace:${user.id}`, { workspace: original, base: original, revision });
  fetchMock = vi.fn(async (_url, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      if (Number((init.headers as Record<string, string>)['If-Match']) !== revision) return new Response('{}', { status: 409 });
      remote = JSON.parse(String(init.body)); revision++;
      return Response.json({ revision });
    }
    return Response.json({ workspace: remote, revision });
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { notebook?.stop(); notebook = undefined; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function open() {
  const changed = vi.fn(); const status = vi.fn();
  notebook = await OfflineNotebook.open(user, async () => original, changed, status);
  return { changed, status, notebook };
}

describe('offline persistence and sync', () => {
  it('opens and saves edits offline without calling the server', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { notebook } = await open();
    notebook.update({ ...original, notes: [{ ...note, content: 'offline edit' }] });
    await vi.waitFor(async () => {
      const stored = await dbGet<{ workspace: Workspace }>('state', `workspace:${user.id}`);
      expect(stored?.workspace.notes[0].content).toBe('offline edit');
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(notebook.pending).toBe(true);
  });
  it('merges offline and remote changes, then persists the confirmed base', async () => {
    const { notebook, status } = await open();
    notebook.update({ ...original, notes: [{ ...note, content: 'local edit' }] });
    remote = { ...original, notes: [{ ...note, content: 'remote edit' }] };
    await notebook.sync();
    expect(remote.notes.map(note => note.content).sort()).toEqual(['local edit', 'remote edit']);
    expect(notebook.pending).toBe(false);
    expect(status).toHaveBeenLastCalledWith('saved');
  });
  it('keeps edits typed while a request is in flight', async () => {
    const { notebook } = await open();
    let release!: () => void;
    const blocked = new Promise<void>(resolve => { release = resolve; });
    const originalFetch = fetchMock.getMockImplementation()!;
    let once = true;
    fetchMock.mockImplementation(async (...args) => { if (once) { once = false; await blocked; } return originalFetch(...args); });
    const syncing = notebook.sync();
    await new Promise(resolve => setTimeout(resolve, 0));
    notebook.update({ ...original, notes: [{ ...note, content: 'typed during fetch' }] });
    release(); await syncing;
    expect(notebook.workspace.notes.some(note => note.content === 'typed during fetch')).toBe(true);
    expect(remote.notes.some(note => note.content === 'typed during fetch')).toBe(true);
  });
  it('retains local work after a failed request and can retry', async () => {
    const { notebook, status } = await open();
    notebook.update({ ...original, notes: [{ ...note, content: 'unsent' }] });
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await notebook.sync();
    expect(notebook.workspace.notes[0].content).toBe('unsent');
    expect(status).toHaveBeenLastCalledWith('error', 'Failed to fetch');
    await notebook.sync();
    expect(remote.notes[0].content).toBe('unsent');
  });
  it('does not upload to a different authenticated account', async () => {
    const { currentUser } = await import('../../../../src/infrastructure/api/cloud');
    vi.mocked(currentUser).mockResolvedValueOnce({ ...user, id: 'other' });
    const { notebook, status } = await open();
    await notebook.sync();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(status).toHaveBeenLastCalledWith('error', expect.stringContaining('cuenta del servidor'));
  });
});
