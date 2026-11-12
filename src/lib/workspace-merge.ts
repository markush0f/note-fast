import { type Workspace, type Notebook } from './workspace';
import type { Note } from './notes';

function canonical(value: unknown): string | undefined {
  return JSON.stringify(value, (_key, item: unknown) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
}
export function same(a: unknown, b: unknown): boolean { return canonical(a) === canonical(b); }
function conflictId(note: Note): string {
  const text = canonical(note)!;
  const hex = [2166136261, 3339675911, 2246822519, 3266489917].map(seed => {
    let hash = seed;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return (hash >>> 0).toString(16).padStart(8, '0');
  }).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}
export function mergeWorkspaces(base: Workspace, local: Workspace, remote: Workspace): Workspace {
  const notes: Note[] = [];
  const beforeNotes = new Map(base.notes.map(note => [note.id, note]));
  const localNotes = new Map(local.notes.map(note => [note.id, note]));
  const remoteNotes = new Map(remote.notes.map(note => [note.id, note]));
  for (const id of new Set([...localNotes.keys(), ...remoteNotes.keys(), ...beforeNotes.keys()])) {
    const before = beforeNotes.get(id), ours = localNotes.get(id), theirs = remoteNotes.get(id);
    if (same(ours, theirs) || same(theirs, before)) { if (ours) notes.push(ours); }
    else if (same(ours, before)) { if (theirs) notes.push(theirs); }
    else {
      if (theirs) notes.push(theirs);
      if (ours) {
        const { deletedAt: _deletedAt, ...copy } = ours;
        const id = conflictId(ours);
        if (!remoteNotes.has(id)) notes.push({ ...copy, id, title: `${ours.title || 'Sin título'} (conflicto)` });
      }
    }
  }
  const notebooks: Notebook[] = [];
  const beforeBooks = new Map(base.notebooks.map(book => [book.id, book]));
  const localBooks = new Map(local.notebooks.map(book => [book.id, book]));
  const remoteBooks = new Map(remote.notebooks.map(book => [book.id, book]));
  for (const id of new Set([...localBooks.keys(), ...remoteBooks.keys(), ...beforeBooks.keys()])) {
    const before = beforeBooks.get(id), ours = localBooks.get(id), theirs = remoteBooks.get(id);
    if (!ours && !theirs) continue;
    if (!ours) { if (same(theirs, before)) continue; notebooks.push(theirs!); continue; }
    if (!theirs || same(ours, theirs) || same(theirs, before)) { notebooks.push(ours); continue; }
    if (same(ours, before)) { notebooks.push(theirs); continue; }
    const merged = { ...theirs } as Notebook;
    for (const key of new Set([...Object.keys(before ?? {}), ...Object.keys(ours), ...Object.keys(theirs)])) {
      const oldValue = before?.[key as keyof Notebook];
      const ourValue = ours[key as keyof Notebook];
      const theirValue = theirs[key as keyof Notebook];
      const value = same(ourValue, theirValue) || same(theirValue, oldValue) ? ourValue : same(ourValue, oldValue) ? theirValue : ourValue;
      if (value === undefined) delete (merged as unknown as Record<string, unknown>)[key];
      else (merged as unknown as Record<string, unknown>)[key] = value;
    }
    notebooks.push(merged);
  }
  const validIds = new Set(notebooks.filter(book => !book.deletedAt).map(book => book.id));
  const defaultId = notebooks.find(book => !book.deletedAt)?.id;
  const normalized = notes.map(note => validIds.has(note.notebookId) || !defaultId ? note : { ...note, notebookId: defaultId });
  return {
    version: 4, notes: normalized, notebooks,
    theme: same(local.theme, base.theme) ? remote.theme : local.theme,
    toolbarPosition: same(local.toolbarPosition, base.toolbarPosition) ? remote.toolbarPosition : local.toolbarPosition,
  };
}
