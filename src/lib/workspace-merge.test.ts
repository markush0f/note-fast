import { describe, expect, it } from 'vitest';
import { mergeWorkspaces } from './workspace-merge';
import { createNote } from './notes';
import type { Workspace } from './workspace';
const note = createNote();
const base: Workspace = { version: 3, notes: [note], folders: [] };
const edit = (content: string): Workspace => ({ ...base, notes: [{ ...note, content }] });

describe('offline three-way merge', () => {
  it('retains independent additions and edits without mutating inputs', () => {
    const remote = { ...base, notes: [note, createNote()] };
    const local = edit('<p>Local</p>');
    const before = JSON.stringify([base, local, remote]);
    const result = mergeWorkspaces(base, local, remote);
    expect(result.notes).toHaveLength(2);
    expect(result.notes[0].content).toBe('<p>Local</p>');
    expect(JSON.stringify([base, local, remote])).toBe(before);
  });
  it('preserves both conflicting versions with an idempotent conflict copy', () => {
    const result = mergeWorkspaces(base, edit('local'), edit('remote'));
    expect(result.notes.map(note => note.content).sort()).toEqual(['local', 'remote']);
    expect(result.notes.find(note => note.content === 'local')?.title).toContain('(conflicto)');
    expect(mergeWorkspaces(base, edit('local'), result).notes).toHaveLength(2);
  });
  it('ignores JSONB property ordering when comparing records', () => {
    const remote = { ...base, notes: [Object.fromEntries(Object.entries(note).reverse()) as unknown as typeof note] };
    const result = mergeWorkspaces(base, edit('only local edit'), remote);
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].content).toBe('only local edit');
  });
  it('does not duplicate identical edits or undo permanent deletion', () => {
    expect(mergeWorkspaces(base, edit('same'), edit('same')).notes).toHaveLength(1);
    expect(mergeWorkspaces(base, { ...base, notes: [] }, base).notes).toHaveLength(0);
  });
  it('keeps an edited note when the other device permanently deletes it', () => {
    expect(mergeWorkspaces(base, edit('local'), { ...base, notes: [] }).notes[0].content).toBe('local');
    expect(mergeWorkspaces(base, { ...base, notes: [] }, edit('remote')).notes[0].content).toBe('remote');
  });
  it('restores conflicting edits visibly when the remote note is trashed', () => {
    const remote = { ...base, notes: [{ ...note, deletedAt: new Date().toISOString() }] };
    const result = mergeWorkspaces(base, edit('local'), remote);
    expect(result.notes).toHaveLength(2);
    expect(result.notes.find(note => note.content === 'local')?.deletedAt).toBeUndefined();
  });
  it('repairs cycles introduced by concurrent folder moves', () => {
    const original: Workspace = { ...base, folders: [{ id: 'a', name: 'A', parentId: null }, { id: 'b', name: 'B', parentId: null }] };
    const local = { ...original, folders: original.folders.map(f => f.id === 'a' ? { ...f, parentId: 'b' } : f) };
    const remote = { ...original, folders: original.folders.map(f => f.id === 'b' ? { ...f, parentId: 'a' } : f) };
    const result = mergeWorkspaces(original, local, remote);
    expect(result.folders.some(f => f.parentId === null)).toBe(true);
  });
});
