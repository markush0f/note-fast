import { currentUser } from './cloud';
import { dbGet, dbPut, dbDelete } from './offline-db';
import { cacheAttachments, uploadAttachments } from './attachments';
import { migrateWorkspace, type Workspace } from './workspace';
import { mergeWorkspaces, same } from './workspace-merge';

export interface OfflineUser { id: string; name: string; email: string; }
interface RecordState { workspace: Workspace; base: Workspace; revision: number; }
export type SyncStatus = 'saving' | 'saved' | 'offline' | 'syncing' | 'error';
const EMPTY: Workspace = { version: 3, notes: [], folders: [] };
export async function rememberUser(user: OfflineUser) { await dbPut('state', 'active-user', user); await dbDelete('state', 'pending-signout'); }
export async function forgetUser(offline = false) { if (offline) await dbPut('state', 'pending-signout', true); await dbDelete('state', 'active-user'); }
export async function hasPendingSignout() { return dbGet<boolean>('state', 'pending-signout'); }
export async function finishSignout() { await dbDelete('state', 'pending-signout'); }
export async function cachedUser() { return dbGet<OfflineUser>('state', 'active-user'); }

async function remoteState(owner: string): Promise<{ workspace: Workspace | undefined; revision: number }> {
  const response = await fetch('/api/sync', { credentials: 'include', cache: 'no-store', headers: { 'X-Notebook-User': owner } });
  if (!response.ok) throw new Error(response.status === 401 ? 'unauthorized' : 'No se pudo descargar el cuaderno.');
  const value = await response.json();
  if (!Number.isInteger(value.revision) || value.revision < 0) throw new Error('Revisión del servidor no válida.');
  return { workspace: value.workspace === null ? undefined : migrateWorkspace(value.workspace), revision: value.revision };
}

export class OfflineNotebook {
  private state: RecordState;
  private writes = Promise.resolve();
  private syncing = false;
  private stopped = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private release: (() => void) | undefined;
  private lastError = '';
  private generation = 0;
  private persisted = 0;
  private constructor(
    readonly user: OfflineUser,
    state: RecordState,
    private changed: (workspace: Workspace) => void,
    private status: (status: SyncStatus, message?: string) => void,
  ) { this.state = state; }

  static async open(user: OfflineUser, fallback: () => Promise<Workspace>, changed: (workspace: Workspace) => void, status: (status: SyncStatus, message?: string) => void): Promise<OfflineNotebook> {
    if (!navigator.locks) throw new Error('Este navegador no admite el bloqueo seguro del cuaderno. Usa una versión reciente de Chrome, Edge, Firefox o Safari.');
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    await new Promise<void>((resolve, reject) => {
      void navigator.locks.request(`ntbk-edit:${user.id}`, { ifAvailable: true }, async lock => {
        if (!lock) { reject(new Error('El cuaderno ya está abierto en otra pestaña. Ciérrala antes de editar aquí.')); return; }
        resolve(); await held;
      }).catch(reject);
    });
    try {
      let stored = await dbGet<RecordState>('state', `workspace:${user.id}`);
      if (stored) {
        const workspace = migrateWorkspace(stored.workspace);
        const base = migrateWorkspace(stored.base);
        if (!workspace || !base) throw new Error('La copia local no es válida. No se ha sobrescrito.');
        stored = { ...stored, workspace, base };
      } else {
        const remote = await remoteState(user.id);
        const workspace = remote.workspace ?? await fallback();
        stored = { workspace, base: remote.workspace ?? EMPTY, revision: remote.revision };
        await dbPut('state', `workspace:${user.id}`, stored);
      }
      const notebook = new OfflineNotebook(user, stored, changed, status);
      notebook.release = release;
      return notebook;
    } catch (error) { release(); throw error; }
  }

  get workspace() { return this.state.workspace; }
  get pending() { return this.generation !== this.persisted || !same(this.state.workspace, this.state.base); }
  private persist(): Promise<void> {
    const record = structuredClone(this.state);
    const generation = ++this.generation;
    this.writes = this.writes.catch(() => {}).then(() => dbPut('state', `workspace:${this.user.id}`, record)).then(() => { this.persisted = generation; });
    return this.writes;
  }
  update(action: Workspace | ((previous: Workspace) => Workspace)) {
    if (this.stopped) return;
    this.state.workspace = typeof action === 'function' ? action(this.state.workspace) : action;
    this.changed(this.state.workspace);
    this.status('saving');
    void this.persist().then(() => {
      if (this.stopped) return;
      this.status(navigator.onLine ? 'syncing' : 'offline');
      clearTimeout(this.timer);
      this.timer = setTimeout(() => { void this.sync(); }, 500);
    }).catch(() => this.status('error', 'No se pudo guardar en este dispositivo. No cierres la pestaña; libera espacio y reintenta.'));
  }

  async sync() {
    if (this.stopped || this.syncing) return;
    if (!navigator.onLine) { this.status(this.generation === this.persisted ? 'offline' : 'error', this.generation === this.persisted ? undefined : 'El guardado local aún no ha terminado. Reintenta antes de cerrar la pestaña.'); return; }
    this.syncing = true;
    this.status('syncing');
    try {
      await this.writes;
      // A cookie changed in another tab must never upload this account's notebook to another user.
      const user = await currentUser();
      if (user.id !== this.user.id) throw new Error('La cuenta del servidor ha cambiado. Cierra sesión antes de continuar.');
      for (let attempt = 0; attempt < 4; attempt++) {
        if (this.stopped) return;
        const snapshot = this.state.workspace;
        const base = this.state.base;
        const remote = await remoteState(this.user.id);
        const merged = mergeWorkspaces(base, snapshot, remote.workspace ?? EMPTY);
        const content = merged.notes.map(note => note.content).join('');
        await uploadAttachments(content, this.user.id);
        let revision = remote.revision;
        if (!same(merged, remote.workspace)) {
          const response = await fetch('/api/sync', {
            method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'If-Match': String(revision), 'X-Notebook-User': this.user.id }, body: JSON.stringify(merged),
          });
          if (response.status === 409) continue;
          if (!response.ok) throw new Error(response.status === 401 ? 'unauthorized' : response.status === 413 ? 'El cuaderno supera el límite de 5 MiB. Reduce su contenido.' : 'No se pudo sincronizar el cuaderno.');
          revision = (await response.json()).revision;
        }
        if (this.stopped) return;
        this.state = { workspace: mergeWorkspaces(snapshot, this.state.workspace, merged), base: merged, revision };
        await this.persist();
        this.changed(this.state.workspace);
        // Download all referenced files for subsequent offline sessions.
        await cacheAttachments(this.state.workspace.notes.map(note => note.content).join(''), this.user.id);
        if (this.pending) continue;
        this.lastError = '';
        this.status('saved');
        return;
      }
      throw new Error('Hay cambios simultáneos. Tus cambios están guardados localmente; reintenta la sincronización.');
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'No se pudo sincronizar.';
      if (this.lastError === 'unauthorized') this.lastError = 'La sesión ha caducado. Tus cambios siguen en este dispositivo. Inicia sesión de nuevo para sincronizarlos.';
      if (!this.stopped) this.status(navigator.onLine ? 'error' : 'offline', this.lastError);
    } finally { this.syncing = false; }
  }
  async flush() { await this.writes; }
  retry() {
    void this.persist().then(() => this.sync()).catch(() => this.status('error', 'No se pudo guardar localmente. Libera espacio y reintenta.'));
  }
  stop() { this.stopped = true; clearTimeout(this.timer); void this.writes.finally(() => this.release?.()).catch(() => {}); }
}
