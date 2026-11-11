import { describe, expect, it } from "vitest";
import {
  DEFAULT_TOOLBAR_POSITION,
  TOOLBAR_POSITIONS,
  isToolbarPosition,
  getToolbarDropPosition,
  getToolbarDragOffset,
} from "./editor-layout";
import { createNote } from "./notes";
import {
  createFolder,
  migrateWorkspace,
  moveNote,
  type Workspace,
} from "./workspace";

describe("toolbar layout preferences", () => {
  it("snaps a pointer to the correct editor corner", () => {
    const bounds = { left: 200, top: 60, width: 800, height: 600 };
    expect(getToolbarDropPosition(220, 80, bounds)).toBe("top-left");
    expect(getToolbarDropPosition(980, 80, bounds)).toBe("top-right");
    expect(getToolbarDropPosition(220, 640, bounds)).toBe("bottom-left");
    expect(getToolbarDropPosition(980, 640, bounds)).toBe("bottom-right");
  });
  it("keeps the dragged toolbar inside the editor", () => {
    const bounds = { left: 200, top: 60, width: 800, height: 600 };
    const toolbar = { left: 600, top: 80, width: 250, height: 44 };
    expect(getToolbarDragOffset(toolbar, bounds, -2000, -2000)).toEqual({
      x: -388,
      y: -8,
    });
    expect(getToolbarDragOffset(toolbar, bounds, 2000, 2000)).toEqual({
      x: 138,
      y: 524,
    });
    expect(getToolbarDragOffset(toolbar, bounds, 20, 30)).toEqual({
      x: 20,
      y: 30,
    });
  });
  it("offers four corners and defaults to the top right", () => {
    expect(TOOLBAR_POSITIONS.map((position) => position.id)).toEqual([
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
    ]);
    expect(DEFAULT_TOOLBAR_POSITION).toBe("top-right");
    for (const position of TOOLBAR_POSITIONS)
      expect(isToolbarPosition(position.id)).toBe(true);
    for (const invalid of [undefined, null, "left", "bottom", {}, 1])
      expect(isToolbarPosition(invalid)).toBe(false);
  });
  it("retains each valid position when loading a saved workspace", () => {
    for (const { id } of TOOLBAR_POSITIONS) {
      const workspace: Workspace = {
        version: 2,
        notes: [createNote()],
        folders: [],
        toolbarPosition: id,
      };
      expect(migrateWorkspace(JSON.parse(JSON.stringify(workspace)))).toEqual(
        workspace,
      );
    }
  });
  it("keeps old workspaces compatible and ignores invalid position preferences", () => {
    const note = createNote();
    expect(migrateWorkspace([note])?.toolbarPosition).toBeUndefined();
    const workspace: Workspace = { version: 2, notes: [note], folders: [] };
    expect(migrateWorkspace(workspace)).toEqual(workspace);
    expect(
      migrateWorkspace({ ...workspace, toolbarPosition: "unsupported" }),
    ).toEqual(workspace);
  });
  it("keeps the preference when notes move between folders", () => {
    const folder = createFolder("Ideas");
    const note = createNote();
    const workspace: Workspace = {
      version: 2,
      notes: [note],
      folders: [folder],
      toolbarPosition: "bottom-left",
    };
    expect(moveNote(workspace, note.id, folder.id).toolbarPosition).toBe(
      "bottom-left",
    );
  });
});
