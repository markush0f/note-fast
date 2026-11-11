import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { clear } from "idb-keyval";
import { createNote } from "./notes";
import { loadNotes, saveNotes, storageLabel } from "./storage";

beforeEach(async () => {
  await clear();
});

describe("IndexedDB persistence", () => {
  it("distinguishes an unused workspace from an intentionally empty one", async () => {
    expect(storageLabel).toBe("IndexedDB");
    expect(await loadNotes()).toBeUndefined();
    await saveNotes([]);
    expect(await loadNotes()).toEqual([]);
  });
  it("roundtrips notes and edits", async () => {
    const note = { ...createNote(), title: "Mi nota", content: "<p>Hola</p>" };
    await saveNotes([note]);
    expect(await loadNotes()).toEqual([note]);
    const changed = { ...note, title: "Actualizada", favorite: true };
    await saveNotes([changed]);
    expect(await loadNotes()).toEqual([changed]);
    await saveNotes([]);
    expect(await loadNotes()).toEqual([]);
  });
  it("serializes concurrent snapshots so the newest one wins", async () => {
    const note = createNote();
    await Promise.all([
      saveNotes([note]),
      saveNotes([{ ...note, title: "Segunda" }]),
      saveNotes([{ ...note, title: "Última" }]),
    ]);
    expect((await loadNotes())?.[0].title).toBe("Última");
  });
});
