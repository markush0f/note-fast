import { describe, expect, it } from "vitest";
import {
  DEFAULT_TOOLBAR_POSITION,
  TOOLBAR_POSITIONS,
  isToolbarPosition,
  getToolbarPlacementCorner,
  getToolbarDragOffset,
  getToolbarCoordinates,
  getToolbarPoint,
  isToolbarPlacement,
} from "./editor-layout";
import { createNote } from "./notes";
import {
  createFolder,
  migrateWorkspace,
  moveNote,
  type Workspace,
} from "./workspace";

describe("toolbar layout preferences", () => {
  it("orients the position menu without snapping the toolbar", () => {
    expect(getToolbarPlacementCorner({ x: 0.2, y: 0.3 })).toBe("top-left");
    expect(getToolbarPlacementCorner({ x: 0.7, y: 0.3 })).toBe("top-right");
    expect(getToolbarPlacementCorner({ x: 0.2, y: 0.8 })).toBe("bottom-left");
    expect(getToolbarPlacementCorner({ x: 0.7, y: 0.8 })).toBe("bottom-right");
  });
  it("roundtrips arbitrary coordinates without snapping to corners", () => {
    const bounds = { width: 800, height: 600 };
    const toolbar = { width: 250, height: 44 };
    const point = { x: 0.37, y: 0.42 };
    const pixels = getToolbarCoordinates(point, bounds, toolbar);
    expect(pixels.x).toBeCloseTo(206.62);
    expect(pixels.y).toBeCloseTo(235.44);
    const restored = getToolbarPoint(pixels.x, pixels.y, bounds, toolbar);
    expect(restored.x).toBeCloseTo(point.x);
    expect(restored.y).toBeCloseTo(point.y);
    expect(getToolbarCoordinates("bottom-right", bounds, toolbar)).toEqual({
      x: 538,
      y: 544,
    });
  });
  it("keeps free positions accessible after resizing or expanding", () => {
    const toolbar = { width: 326, height: 76 };
    const pixels = getToolbarCoordinates(
      { x: 0.9, y: 0.8 },
      { width: 350, height: 400 },
      toolbar,
    );
    expect(pixels.x).toBe(12);
    expect(pixels.y).toBeCloseTo(252);
    expect(
      getToolbarPoint(-500, 5000, { width: 350, height: 400 }, toolbar),
    ).toEqual({ x: 0, y: 1 });
  });
  it("validates normalized positions and loads them alongside old corner preferences", () => {
    for (const invalid of [
      { x: NaN, y: 0 },
      { x: Infinity, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 2 },
      { x: "0.5", y: 0 },
    ])
      expect(isToolbarPlacement(invalid)).toBe(false);
    const workspace: Workspace = {
      version: 2,
      notes: [],
      folders: [],
      toolbarPosition: { x: 0.37, y: 0.42 },
    };
    expect(migrateWorkspace(JSON.parse(JSON.stringify(workspace)))).toEqual(
      workspace,
    );
    expect(isToolbarPlacement("top-left")).toBe(true);
    expect(isToolbarPlacement(workspace.toolbarPosition)).toBe(true);
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
