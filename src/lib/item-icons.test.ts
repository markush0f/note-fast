import { describe, expect, it } from "vitest";
import { createNote } from "./notes";
import {
  ICON_CATEGORIES,
  ITEM_ICONS,
  ITEM_ICON_IDS,
  filterItemIcons,
  isItemIconId,
  type ItemIconId,
} from "./item-icons";
import {
  createFolder,
  migrateWorkspace,
  moveNote,
  setItemIcon,
  type Workspace,
} from "./workspace";

function fixture(): Workspace {
  const folder = createFolder("Proyectos");
  return {
    version: 3,
    notes: [createNote(folder.id), createNote()],
    folders: [folder],
  };
}

describe("custom item icons", () => {
  it("offers over 100 unique icons and populated categories", () => {
    expect(ITEM_ICONS.length).toBeGreaterThan(100);
    expect(new Set(ITEM_ICON_IDS).size).toBe(ITEM_ICONS.length);
    for (const category of Object.keys(ICON_CATEGORIES)) {
      expect(ITEM_ICONS.some((icon) => icon.category === category)).toBe(true);
    }
  });
  it("searches labels, synonyms and identifiers without accents or case", () => {
    expect(filterItemIcons("CÁMARA").some((icon) => icon.id === "camera")).toBe(
      true,
    );
    expect(filterItemIcons("programacion").map((icon) => icon.id)).toContain(
      "code",
    );
    expect(filterItemIcons("BASE DATOS").map((icon) => icon.id)).toContain(
      "database",
    );
    expect(filterItemIcons("sin-coincidencias")).toEqual([]);
    expect(filterItemIcons("   ")).toHaveLength(ITEM_ICONS.length);
  });
  it("combines categories and search terms", () => {
    const technology = filterItemIcons("", "technology");
    expect(technology.length).toBeGreaterThan(10);
    expect(technology.every((icon) => icon.category === "technology")).toBe(
      true,
    );
    expect(filterItemIcons("musica", "technology")).toEqual([]);
    expect(
      filterItemIcons("musica", "creativity").map((icon) => icon.id),
    ).toContain("music");
  });
  it("recognizes only supported Iconoir identifiers", () => {
    expect(isItemIconId("book")).toBe(true);
    for (const value of [undefined, null, "", "unknown", "<svg>", {}])
      expect(isItemIconId(value)).toBe(false);
  });
  it("updates only the chosen file without reordering or altering dates/content", () => {
    const workspace = fixture();
    const [note, other] = workspace.notes;
    const updated = setItemIcon(
      workspace,
      { kind: "note", id: note.id },
      "idea",
    );
    expect(updated.notes[0]).toEqual({ ...note, icon: "idea" });
    expect(updated.notes[1]).toBe(other);
    expect(updated.folders).toBe(workspace.folders);
    expect(workspace.notes[0].icon).toBeUndefined();
  });
  it("updates just the chosen folder and preserves it when a file moves", () => {
    const workspace = fixture();
    const folder = workspace.folders[0];
    const updated = setItemIcon(
      workspace,
      { kind: "folder", id: folder.id },
      "work",
    );
    expect(updated.folders[0]).toEqual({ ...folder, icon: "work" });
    expect(updated.notes).toBe(workspace.notes);
    const withFileIcon = setItemIcon(
      updated,
      { kind: "note", id: workspace.notes[0].id },
      "book",
    );
    expect(
      moveNote(withFileIcon, workspace.notes[0].id, null).notes[0].icon,
    ).toBe("book");
  });
  it("restores the default and ignores missing targets, same values and invalid identifiers", () => {
    const workspace = fixture();
    const target = { kind: "note" as const, id: workspace.notes[0].id };
    const custom = setItemIcon(workspace, target, "book");
    expect(setItemIcon(custom, target, "book")).toBe(custom);
    expect(setItemIcon(custom, target, null)).toEqual(workspace);
    expect(setItemIcon(workspace, target, null)).toBe(workspace);
    expect(
      setItemIcon(workspace, { kind: "folder", id: "missing" }, "book"),
    ).toBe(workspace);
    expect(setItemIcon(workspace, target, "invalid" as ItemIconId)).toBe(
      workspace,
    );
  });
  it("keeps old workspaces valid and safely falls back for unknown stored icons", () => {
    const workspace = fixture();
    expect(migrateWorkspace(workspace)).toEqual(workspace);
    const stored = {
      ...workspace,
      notes: [{ ...workspace.notes[0], icon: "unsupported" }],
      folders: [{ ...workspace.folders[0], icon: { svg: "invalid" } }],
    };
    const migrated = migrateWorkspace(stored)!;
    expect(migrated.notes[0].icon).toBeUndefined();
    expect(migrated.folders[0].icon).toBeUndefined();
    expect(stored.notes[0].icon).toBe("unsupported");
    const valid = setItemIcon(
      workspace,
      { kind: "folder", id: workspace.folders[0].id },
      "code",
    );
    expect(migrateWorkspace(JSON.parse(JSON.stringify(valid)))).toEqual(valid);
  });
});
