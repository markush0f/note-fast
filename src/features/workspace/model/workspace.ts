import type { Note } from './notes';
import { isTheme, type Theme } from '../../../shared/theme/theme';
import { isToolbarPlacement, type ToolbarPlacement } from '../../editor/toolbar/editor-layout';
import { isItemIconId, normalizeItemIcon, type ItemIconId, type ItemTarget } from '../icons/item-icons';

export interface Notebook {
  id: string;
  name: string;
  description: string;
  icon?: ItemIconId;
  deletedAt?: string;
}
export const DEFAULT_NOTEBOOK_ID = '00000000-0000-4000-8000-000000000001';
export const DEFAULT_NOTEBOOK_NAME = 'General';
export const TRASH_DAYS = 30;
const TRASH_MS = TRASH_DAYS * 24 * 60 * 60 * 1000;
export interface Workspace {
  version: 4;
  notes: Note[];
  notebooks: Notebook[];
  toolbarPosition?: ToolbarPlacement;
  theme?: Theme;
}

export function createNotebook(name: string, description = ''): Notebook {
  return { id: crypto.randomUUID(), name: name.trim(), description: description.trim() };
}

/** Migrate legacy folders to flat notebooks while preserving every page and its attachments. */
export function migrateWorkspace(value: unknown): Workspace | undefined {
  if (value === undefined) return undefined;
  const legacyArray = Array.isArray(value);
  const source = value as (Record<string, unknown> & { version?: number }) | null;
  if (!legacyArray && (!source || ![2, 3, 4].includes(source.version ?? 0) || !Array.isArray(source.notes))) {
    throw new Error('Formato de cuaderno no compatible');
  }
  const rawNotes = (legacyArray ? value : source!.notes) as Record<string, unknown>[];
  const notesValid = rawNotes.every(note => note && typeof note.id === 'string' && typeof note.title === 'string' && typeof note.content === 'string' && typeof note.favorite === 'boolean' && typeof note.createdAt === 'string' && typeof note.updatedAt === 'string' && (note.deletedAt === undefined || typeof note.deletedAt === 'string'));
  if (!notesValid) throw new Error('Datos del cuaderno no válidos');
  if (new Set(rawNotes.map(note => note.id)).size !== rawNotes.length) throw new Error('Identificadores duplicados');

  let notebooks: Notebook[];
  if (!legacyArray && source!.version === 4) {
    if (!Array.isArray(source!.notebooks)) throw new Error('Datos de cuadernos no válidos');
    notebooks = source!.notebooks as Notebook[];
    if (notebooks.some(book => !book || typeof book.id !== 'string' || typeof book.name !== 'string' || typeof book.description !== 'string' || (book.deletedAt !== undefined && typeof book.deletedAt !== 'string'))) throw new Error('Datos de cuadernos no válidos');
    if (new Set(notebooks.map(book => book.id)).size !== notebooks.length) throw new Error('Identificadores duplicados');
  } else {
    const oldFolders = legacyArray ? [] : Array.isArray(source!.folders) ? source!.folders as Record<string, unknown>[] : [];
    if (oldFolders.some(folder => !folder || typeof folder.id !== 'string' || typeof folder.name !== 'string' || (folder.parentId !== null && typeof folder.parentId !== 'string') || (folder.deletedAt !== undefined && typeof folder.deletedAt !== 'string'))) throw new Error('Datos de carpetas no válidos');
    if (new Set(oldFolders.map(folder => folder.id)).size !== oldFolders.length) throw new Error('Identificadores duplicados');
    notebooks = oldFolders.map(folder => ({
      id: String(folder.id), name: String(folder.name).slice(0, 120), description: '',
      ...normalizeItemIcon({ icon: folder.icon }) as { icon?: ItemIconId },
      ...(typeof folder.deletedAt === 'string' ? { deletedAt: folder.deletedAt } : {}),
    }));
    const hasRoot = rawNotes.some(note => note.folderId == null);
    if (hasRoot || notebooks.length === 0) notebooks.unshift({
      id: DEFAULT_NOTEBOOK_ID,
      name: DEFAULT_NOTEBOOK_NAME,
      description: '',
    });
  }
  if (notebooks.length === 0 && rawNotes.length > 0) notebooks.push({ id: DEFAULT_NOTEBOOK_ID, name: DEFAULT_NOTEBOOK_NAME, description: '' });
  const notebookIds = new Set(notebooks.map(book => book.id));
  const oldFolderIds = new Set((!legacyArray && Array.isArray(source!.folders) ? source!.folders as Record<string, unknown>[] : []).map(folder => folder.id));
  const notes: Note[] = rawNotes.map(raw => {
    const oldId = typeof raw.notebookId === 'string' ? raw.notebookId : typeof raw.folderId === 'string' ? raw.folderId : null;
    const notebookId = oldId && notebookIds.has(oldId) ? oldId : oldId && oldFolderIds.has(oldId) ? oldId : notebooks[0]!.id;
    const { folderId: _folderId, ...rest } = raw;
    return { ...normalizeItemIcon(rest as unknown as Note), notebookId, ...(typeof raw.deletedAt === 'string' ? { deletedAt: raw.deletedAt } : {}) };
  });
  return {
    version: 4, notes, notebooks: notebooks.map(book => normalizeItemIcon(book)),
    ...(isTheme(source?.theme) ? { theme: source.theme } : {}),
    ...(isToolbarPlacement(source?.toolbarPosition) ? { toolbarPosition: source.toolbarPosition } : {}),
  };
}

export function setItemIcon(workspace: Workspace, target: ItemTarget, icon: ItemIconId | null): Workspace {
  if (icon !== null && !isItemIconId(icon)) return workspace;
  if (target.kind === 'note') return { ...workspace, notes: workspace.notes.map(item => {
    if (item.id !== target.id) return item;
    const next = { ...item }; if (icon === null) delete next.icon; else next.icon = icon; return next;
  }) };
  return { ...workspace, notebooks: workspace.notebooks.map(item => {
    if (item.id !== target.id) return item;
    const next = { ...item }; if (icon === null) delete next.icon; else next.icon = icon; return next;
  }) };
}

export function moveNote(workspace: Workspace, noteId: string, notebookId: string): Workspace {
  if (!workspace.notebooks.some(book => book.id === notebookId && !book.deletedAt)) return workspace;
  const note = workspace.notes.find(item => item.id === noteId);
  if (!note || note.notebookId === notebookId) return workspace;
  return { ...workspace, notes: workspace.notes.map(item => item.id === noteId ? { ...item, notebookId, updatedAt: new Date().toISOString() } : item) };
}
export function trashNote(workspace: Workspace, id: string, deletedAt = new Date().toISOString()): Workspace {
  if (!workspace.notes.some(item => item.id === id && !item.deletedAt)) return workspace;
  return { ...workspace, notes: workspace.notes.map(item => item.id === id ? { ...item, deletedAt } : item) };
}
export function trashNotebook(workspace: Workspace, id: string, deletedAt = new Date().toISOString()): Workspace {
  if (!workspace.notebooks.some(item => item.id === id && !item.deletedAt)) return workspace;
  return {
    ...workspace,
    notebooks: workspace.notebooks.map(item => item.id === id ? { ...item, deletedAt } : item),
    notes: workspace.notes.map(item => item.notebookId === id && !item.deletedAt ? { ...item, deletedAt } : item),
  };
}
function withoutDeletedAt<T extends { deletedAt?: string }>(item: T): T { const next = { ...item }; delete next.deletedAt; return next; }
export function restoreNote(workspace: Workspace, id: string): Workspace {
  if (!workspace.notes.some(item => item.id === id && item.deletedAt)) return workspace;
  return { ...workspace, notes: workspace.notes.map(item => {
    if (item.id !== id) return item;
    const next = withoutDeletedAt(item);
    if (!workspace.notebooks.some(book => book.id === item.notebookId && !book.deletedAt)) next.notebookId = workspace.notebooks.find(book => !book.deletedAt)?.id ?? DEFAULT_NOTEBOOK_ID;
    return next;
  }) };
}
export function restoreNotebook(workspace: Workspace, id: string): Workspace {
  const book = workspace.notebooks.find(item => item.id === id && item.deletedAt);
  if (!book?.deletedAt) return workspace;
  const deletedAt = book.deletedAt;
  return {
    ...workspace,
    notebooks: workspace.notebooks.map(item => item.id === id ? withoutDeletedAt(item) : item),
    notes: workspace.notes.map(item => item.notebookId === id && item.deletedAt === deletedAt ? withoutDeletedAt(item) : item),
  };
}
export function deleteForever(workspace: Workspace, target: { kind: 'note' | 'notebook'; id: string }): Workspace {
  if (target.kind === 'note') {
    if (!workspace.notes.some(note => note.id === target.id && note.deletedAt)) return workspace;
    return { ...workspace, notes: workspace.notes.filter(note => note.id !== target.id) };
  }
  if (!workspace.notebooks.some(book => book.id === target.id && book.deletedAt)) return workspace;
  return { ...workspace, notebooks: workspace.notebooks.filter(book => book.id !== target.id), notes: workspace.notes.filter(note => !(note.notebookId === target.id && note.deletedAt)) };
}
export function emptyTrash(workspace: Workspace): Workspace {
  const removed = new Set(workspace.notebooks.filter(book => book.deletedAt).map(book => book.id));
  const notebooks = workspace.notebooks.filter(book => !book.deletedAt);
  const notes = workspace.notes.filter(note => !note.deletedAt).map(note => removed.has(note.notebookId) ? { ...note, notebookId: notebooks[0]?.id ?? DEFAULT_NOTEBOOK_ID } : note);
  if (notebooks.length === workspace.notebooks.length && notes.length === workspace.notes.length) return workspace;
  return { ...workspace, notebooks, notes };
}
export function purgeTrash(workspace: Workspace, now = Date.now()): Workspace {
  const expired = (date?: string) => { if (!date) return false; const time = Date.parse(date); return Number.isFinite(time) && now - time >= TRASH_MS; };
  const removed = new Set(workspace.notebooks.filter(book => expired(book.deletedAt)).map(book => book.id));
  const notebooks = workspace.notebooks.filter(book => !removed.has(book.id));
  const notes = workspace.notes.filter(note => !expired(note.deletedAt) && !(note.deletedAt && removed.has(note.notebookId)));
  if (notebooks.length === workspace.notebooks.length && notes.length === workspace.notes.length) return workspace;
  return { ...workspace, notebooks, notes };
}
