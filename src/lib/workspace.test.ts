import { describe, expect, it } from "vitest";
import { createNote } from "./notes";
import {
  createFolder,
  deleteFolder,
  folderPath,
  migrateWorkspace,
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
