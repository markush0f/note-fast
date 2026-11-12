import { type Workspace, type Folder } from './workspace';
import type { Note } from './notes';

function canonical(value: unknown): string | undefined {
  return JSON.stringify(value, (_key, item: unknown) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
    : item);
}
export function same(a: unknown, b: unknown): boolean { return canonical(a) === canonical(b); }

function conflictId(note: Note): string {
  // Stable IDs make retrying a successful write with a lost response idempotent.
  const text = canonical(note)!;
  const hex = [2166136261, 3339675911, 2246822519, 3266489917].map(seed => {
    let hash = seed;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return (hash >>> 0).toString(16).padStart(8, '0');
  }).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

/** Three-way merge: independent notes combine; competing edits retain a visible copy. */
export function mergeWorkspaces(base: Workspace, local: Workspace, remote: Workspace): Workspace {
  const notes: Note[] = [];
  const baseNotes = new Map(base.notes.map(note => [note.id, note]));
  const localNotes = new Map(local.notes.map(note => [note.id, note]));
  const remoteNotes = new Map(remote.notes.map(note => [note.id, note]));
  const noteIds = new Set([...localNotes.keys(), ...remoteNotes.keys(), ...baseNotes.keys()]);
  for (const id of noteIds) {
    const before = baseNotes.get(id);
    const ours = localNotes.get(id);
    const theirs = remoteNotes.get(id);
    if (same(ours, theirs) || same(theirs, before)) { if (ours) notes.push(ours); }
    else if (same(ours, before)) { if (theirs) notes.push(theirs); }
    else {
      if (theirs) notes.push(theirs);
      if (ours) {
        // A conflicting edit is restored outside the trash so it remains discoverable.
        const { deletedAt: _deletedAt, ...copy } = ours;
        const copyId = conflictId(ours);
        if (!remoteNotes.has(copyId)) notes.push({ ...copy, id: copyId, title: `${ours.title || 'Sin título'} (conflicto)` });
      } else if (theirs) {
        // Permanent local deletion vs remote edit: retain the edited remote note.
      }
    }
  }
  const folders: Folder[] = [];
  for (const id of new Set([...local.folders, ...remote.folders].map(folder => folder.id))) {
    const before = base.folders.find(folder => folder.id === id);
    const ours = local.folders.find(folder => folder.id === id);
    const theirs = remote.folders.find(folder => folder.id === id);
    const folder = same(ours, before) ? theirs : ours ?? theirs;
    if (folder) folders.push({ ...folder });
  }
  const ids = new Set(folders.map(folder => folder.id));
  // Concurrent moves can form a cycle even when each individual tree is valid.
  for (const folder of folders) {
    const seen = new Set([folder.id]);
    let parent = folder.parentId;
    while (parent) {
      if (seen.has(parent) || !ids.has(parent)) { folder.parentId = null; break; }
      seen.add(parent); parent = folders.find(item => item.id === parent)?.parentId ?? null;
    }
  }
  const normalized = notes.map(note => note.folderId && (!ids.has(note.folderId) || folders.find(folder => folder.id === note.folderId)?.deletedAt) ? { ...note, folderId: null } : note);
  return {
    version: 3, notes: normalized, folders,
    theme: same(local.theme, base.theme) ? remote.theme : local.theme,
    toolbarPosition: same(local.toolbarPosition, base.toolbarPosition) ? remote.toolbarPosition : local.toolbarPosition,
    title: same(local.title, base.title) ? remote.title : local.title,
    description: same(local.description, base.description) ? remote.description : local.description,
    coverIcon: same(local.coverIcon, base.coverIcon) ? remote.coverIcon : local.coverIcon,
  };
}
