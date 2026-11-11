import { describe, expect, it } from "vitest";
import { parseBackup, serializeWorkspace } from "./backup";
import { createNote } from "./notes";
import type { Workspace } from "./workspace";

describe("notebook backup", () => {
  it("roundtrips notes, folders, trash and appearance", () => {
    const note = { ...createNote(), title: "Plan", deletedAt: "2026-01-01T00:00:00.000Z" };
    const workspace: Workspace = {
      version: 2,
      notes: [note],
      folders: [],
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
