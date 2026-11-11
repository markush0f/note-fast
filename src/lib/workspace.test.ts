import { describe, expect, it } from "vitest";
import { createNote } from "./notes";
import {
  createFolder,
  deleteFolder,
  folderPath,
  migrateWorkspace,
  moveNote,
  type Workspace,
} from "./workspace";

describe("folder workspace", () => {
  it("creates folders and notes in a parent", () => {
    const parent = createFolder("  Proyectos  ");
    const child = createFolder("ntbk", parent.id);
    expect(parent.name).toBe("Proyectos");
    expect(parent.parentId).toBeNull();
    expect(child.parentId).toBe(parent.id);
    expect(createNote(child.id).folderId).toBe(child.id);
    expect(folderPath([child, parent], child.id)).toEqual([parent, child]);
  });
  it("moves notes into nested folders without changing their content or identity", () => {
    const parent = createFolder("Proyectos");
    const child = createFolder("ntbk", parent.id);
    const note = {
      ...createNote(),
      title: "Plan",
      content: "<p>Idea</p>",
      favorite: true,
      updatedAt: "2025-01-01T00:00:00.000Z",
    };
    const other = createNote(parent.id);
    const workspace: Workspace = {
      version: 2,
      folders: [parent, child],
      notes: [note, other],
    };
    const moved = moveNote(workspace, note.id, child.id);
    expect(moved.notes[0]).toEqual({
      ...note,
      folderId: child.id,
      updatedAt: expect.any(String),
    });
    expect(Date.parse(moved.notes[0].updatedAt)).toBeGreaterThan(
      Date.parse(note.updatedAt),
    );
    expect(moved.notes[1]).toBe(other);
    expect(moved.folders).toBe(workspace.folders);
    expect(workspace.notes[0]).toBe(note);
    expect(note.folderId).toBeNull();
  });
  it("moves notes between folders and back to the root", () => {
    const a = createFolder("A");
    const b = createFolder("B");
    const note = createNote(a.id);
    const workspace: Workspace = { version: 2, folders: [a, b], notes: [note] };
    const moved = moveNote(workspace, note.id, b.id);
    expect(moved.notes[0].folderId).toBe(b.id);
    expect(moveNote(moved, note.id, null).notes[0].folderId).toBeNull();
  });
  it("ignores missing notes, missing targets and drops in the current folder", () => {
    const folder = createFolder("A");
    const note = createNote(folder.id);
    const workspace: Workspace = {
      version: 2,
      folders: [folder],
      notes: [note],
    };
    expect(moveNote(workspace, "missing", null)).toBe(workspace);
    expect(moveNote(workspace, note.id, "missing")).toBe(workspace);
    expect(moveNote(workspace, note.id, folder.id)).toBe(workspace);
  });
  it("deletes a subtree and its files without touching siblings or root files", () => {
    const root = createFolder("Proyectos");
    const child = createFolder("ntbk", root.id);
    const grandchild = createFolder("Diseño", child.id);
    const sibling = createFolder("Personal");
    const rootNote = createNote();
    const siblingNote = createNote(sibling.id);
    const workspace: Workspace = {
      version: 2,
      folders: [grandchild, child, root, sibling],
      notes: [
        createNote(root.id),
        createNote(child.id),
        createNote(grandchild.id),
        rootNote,
        siblingNote,
      ],
    };
    expect(deleteFolder(workspace, root.id)).toEqual({
      version: 2,
      folders: [sibling],
      notes: [rootNote, siblingNote],
    });
    expect(workspace.folders).toHaveLength(4);
    expect(workspace.notes).toHaveLength(5);
  });
  it("keeps legacy and intentionally empty workspaces", () => {
    expect(migrateWorkspace(undefined)).toBeUndefined();
    expect(migrateWorkspace([])).toEqual({
      version: 2,
      notes: [],
      folders: [],
    });
    const note = createNote();
    expect(migrateWorkspace([note])?.notes).toEqual([note]);
  });
  it("recovers orphaned notes at the root", () => {
    const note = createNote("missing");
    expect(
      migrateWorkspace({ version: 2, notes: [note], folders: [] })?.notes[0]
        .folderId,
    ).toBeNull();
  });
  it("rejects cyclic, orphaned or duplicated folders", () => {
    const a = { id: "a", name: "A", parentId: "b" };
    const b = { id: "b", name: "B", parentId: "a" };
    expect(() =>
      migrateWorkspace({ version: 2, notes: [], folders: [a, b] }),
    ).toThrow();
    expect(() =>
      migrateWorkspace({ version: 2, notes: [], folders: [a] }),
    ).toThrow();
    const root = createFolder("Raíz");
    expect(() =>
      migrateWorkspace({ version: 2, notes: [], folders: [root, root] }),
    ).toThrow();
  });
  it("rejects malformed payloads instead of replacing them", () => {
    expect(() =>
      migrateWorkspace({ version: 3, notes: [], folders: [] }),
    ).toThrow();
    expect(() => migrateWorkspace([null])).toThrow();
    expect(() =>
      migrateWorkspace({ version: 2, notes: [], folders: [null] }),
    ).toThrow();
  });
});
