import { describe, expect, it } from "vitest";
import { parseBackup, serializeWorkspace } from "./backup";
import { createNote } from "./notes";
import { DEFAULT_NOTEBOOK_ID, DEFAULT_NOTEBOOK_NAME, type Workspace } from "./workspace";

describe("notebook backup", () => {
  it("roundtrips pages, notebooks, trash and appearance", () => {
    const note = { ...createNote(), title: "Plan", deletedAt: "2026-01-01T00:00:00.000Z" };
    const workspace: Workspace = {
      version: 4,
      notes: [note],
      notebooks: [{ id: DEFAULT_NOTEBOOK_ID, name: DEFAULT_NOTEBOOK_NAME, description: '' }],
      theme: "dark",
      toolbarPosition: "bottom-left",
    };
    expect(parseBackup(serializeWorkspace(workspace))).toEqual(workspace);
  });

  it("rejects files that are not a notebook", () => {
    expect(() => parseBackup("{")).toThrow(/JSON/);
    expect(() => parseBackup("[]")).not.toThrow();
    expect(() => parseBackup('{"version":1}')).toThrow(/copia de ntbk/);
  });
});
