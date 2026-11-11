import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { clear, get, set } from "idb-keyval";
import { createNote } from "./notes";
import { hasImportedWorkspaceToCloud, loadWorkspace, markWorkspaceImportedToCloud, saveWorkspace, storageLabel } from "./storage";
import { createFolder, type Workspace } from "./workspace";

const empty = (): Workspace => ({ version: 2, notes: [], folders: [] });
beforeEach(async () => {
  await clear();
});

describe("IndexedDB persistence", () => {
  it("remembers that local notes were imported to an account without deleting them", async () => {
    const workspace = { ...empty(), notes: [createNote()] };
    await saveWorkspace(workspace);
    expect(await hasImportedWorkspaceToCloud()).toBe(false);
    await markWorkspaceImportedToCloud();
    expect(await hasImportedWorkspaceToCloud()).toBe(true);
    expect(await loadWorkspace()).toEqual(workspace);
  });
  it("distinguishes an unused workspace from an intentionally empty one", async () => {
    expect(storageLabel).toBe("IndexedDB");
    expect(await loadWorkspace()).toBeUndefined();
    await saveWorkspace(empty());
    expect(await loadWorkspace()).toEqual(empty());
  });
  it("roundtrips nested folders, notes, edits and deletion", async () => {
    const parent = { ...createFolder("Proyectos"), icon: "work" as const };
    const child = createFolder("ntbk", parent.id);
    const note = {
      ...createNote(child.id),
      title: "Mi nota",
      content: "<p>Hola</p>",
      icon: "book" as const,
    };
    const workspace: Workspace = {
      version: 2,
      notes: [note],
      folders: [parent, child],
    };
    await saveWorkspace(workspace);
    expect(await loadWorkspace()).toEqual(workspace);
    const changed = {
      ...workspace,
      notes: [{ ...note, title: "Actualizada", favorite: true }],
    };
    await saveWorkspace(changed);
    expect(await loadWorkspace()).toEqual(changed);
    await saveWorkspace(empty());
    expect(await loadWorkspace()).toEqual(empty());
  });
  it("persists toolbar position alongside notes without changing them", async () => {
    const note = createNote();
    const workspace: Workspace = {
      ...empty(),
      notes: [note],
      toolbarPosition: "bottom-right",
    };
    await saveWorkspace(workspace);
    expect(await loadWorkspace()).toEqual(workspace);
    await saveWorkspace({ ...workspace, toolbarPosition: "top-left" });
    expect((await loadWorkspace())?.toolbarPosition).toBe("top-left");
    expect((await loadWorkspace())?.notes).toEqual([note]);
  });
  it("roundtrips a freely positioned toolbar without losing appearance", async () => {
    const workspace: Workspace = {
      ...empty(),
      theme: "dark",
      toolbarPosition: { x: 0.31, y: 0.64 },
    };
    await saveWorkspace(workspace);
    expect(await loadWorkspace()).toEqual(workspace);
  });
  it("saves both themes without losing layout preferences", async () => {
    const workspace: Workspace = {
      ...empty(),
      theme: "dark",
      toolbarPosition: "bottom-left",
    };
    await saveWorkspace(workspace);
    expect(await loadWorkspace()).toEqual(workspace);
    await saveWorkspace({ ...workspace, theme: "light" });
    expect(await loadWorkspace()).toEqual({ ...workspace, theme: "light" });
  });
  it("serializes concurrent snapshots so the newest one wins", async () => {
    const note = createNote();
    await Promise.all([
      saveWorkspace({ ...empty(), notes: [note] }),
      saveWorkspace({ ...empty(), notes: [{ ...note, title: "Segunda" }] }),
      saveWorkspace({ ...empty(), notes: [{ ...note, title: "Última" }] }),
    ]);
    expect((await loadWorkspace())?.notes[0].title).toBe("Última");
  });
  it("migrates the original storage key without losing old notes", async () => {
    const legacy: Partial<ReturnType<typeof createNote>> = {
      ...createNote(),
      title: "Anterior",
    };
    delete legacy.folderId;
    await set("ntbk:workspace:v1", [legacy]);
    const workspace = await loadWorkspace();
    expect(workspace).toEqual({
      version: 2,
      folders: [],
      notes: [{ ...legacy, folderId: null }],
    });
    await saveWorkspace(workspace!);
    expect(await loadWorkspace()).toEqual(workspace);
  });
  it("does not overwrite unsupported stored data", async () => {
    const future = { version: 99, notes: [], folders: [] };
    await set("ntbk:workspace:v1", future);
    await expect(loadWorkspace()).rejects.toThrow();
    expect(await get("ntbk:workspace:v1")).toEqual(future);
  });
});
