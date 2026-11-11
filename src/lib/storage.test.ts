import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { clear, get, set } from "idb-keyval";
import { createNote } from "./notes";
import { loadWorkspace, saveWorkspace, storageLabel } from "./storage";
import { createFolder, type Workspace } from "./workspace";

const empty = (): Workspace => ({ version: 2, notes: [], folders: [] });
beforeEach(async () => {
  await clear();
});

describe("IndexedDB persistence", () => {
  it("distinguishes an unused workspace from an intentionally empty one", async () => {
    expect(storageLabel).toBe("IndexedDB");
    expect(await loadWorkspace()).toBeUndefined();
    await saveWorkspace(empty());
    expect(await loadWorkspace()).toEqual(empty());
  });
  it("roundtrips nested folders, notes, edits and deletion", async () => {
    const parent = createFolder("Proyectos");
    const child = createFolder("ntbk", parent.id);
    const note = {
      ...createNote(child.id),
      title: "Mi nota",
      content: "<p>Hola</p>",
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
