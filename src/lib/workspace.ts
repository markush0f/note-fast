import type { Note } from "./notes";
import { isTheme, type Theme } from "./theme";
import { isToolbarPlacement, type ToolbarPlacement } from "./editor-layout";
import {
  isItemIconId,
  normalizeItemIcon,
  type ItemIconId,
  type ItemTarget,
} from "./item-icons";

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  icon?: ItemIconId;
}
export interface Workspace {
  version: 2;
  notes: Note[];
  folders: Folder[];
  toolbarPosition?: ToolbarPlacement;
  theme?: Theme;
}

export function createFolder(
  name: string,
  parentId: string | null = null,
): Folder {
  return { id: crypto.randomUUID(), name: name.trim(), parentId };
}

// The original workspace was just an array of notes. Keep its storage key and
// migrate its payload in memory before the next atomic save.
export function migrateWorkspace(value: unknown): Workspace | undefined {
  if (value === undefined) return undefined;
  const legacy = Array.isArray(value);
  const source = value as Partial<Workspace> | null;
  if (
    !legacy &&
    (!source ||
      source.version !== 2 ||
      !Array.isArray(source.notes) ||
      !Array.isArray(source.folders))
  ) {
    throw new Error("Formato de cuaderno no compatible");
  }
  const notes = (legacy ? value : source!.notes) as Note[];
  const folders = legacy ? [] : source!.folders!;
  if (
    notes.some(
      (note) =>
        !note ||
        typeof note.id !== "string" ||
        typeof note.title !== "string" ||
        typeof note.content !== "string" ||
        typeof note.favorite !== "boolean" ||
        typeof note.createdAt !== "string" ||
        typeof note.updatedAt !== "string",
    ) ||
    folders.some(
      (folder) =>
        !folder ||
        typeof folder.id !== "string" ||
        typeof folder.name !== "string" ||
        (folder.parentId !== null && typeof folder.parentId !== "string"),
    )
  ) {
    throw new Error("Datos del cuaderno no válidos");
  }
  const folderIds = new Set(folders.map((folder) => folder.id));
  if (
    folderIds.size !== folders.length ||
    new Set(notes.map((note) => note.id)).size !== notes.length
  )
    throw new Error("Identificadores duplicados");
  for (const folder of folders) {
    const visited = new Set([folder.id]);
    let parentId = folder.parentId;
    while (parentId !== null) {
      if (visited.has(parentId) || !folderIds.has(parentId))
        throw new Error("Jerarquía de carpetas no válida");
      visited.add(parentId);
      parentId = folders.find((item) => item.id === parentId)!.parentId;
    }
  }
  return {
    version: 2,
    notes: notes.map((note) => ({
      ...normalizeItemIcon(note),
      folderId:
        note.folderId && folderIds.has(note.folderId) ? note.folderId : null,
    })),
    folders: folders.map(normalizeItemIcon),
    ...(isTheme(source?.theme) ? { theme: source.theme } : {}),
    ...(isToolbarPlacement(source?.toolbarPosition)
      ? { toolbarPosition: source.toolbarPosition }
      : {}),
  };
}

export function setItemIcon(
  workspace: Workspace,
  target: ItemTarget,
  icon: ItemIconId | null,
): Workspace {
  if (icon !== null && !isItemIconId(icon)) return workspace;
  const items = target.kind === "note" ? workspace.notes : workspace.folders;
  const item = items.find((entry) => entry.id === target.id);
  if (!item || item.icon === (icon ?? undefined)) return workspace;
  const update = <T extends { id: string; icon?: ItemIconId }>(entry: T): T => {
    if (entry.id !== target.id) return entry;
    const updated = { ...entry };
    if (icon === null) delete updated.icon;
    else updated.icon = icon;
    return updated;
  };
  return target.kind === "note"
    ? { ...workspace, notes: workspace.notes.map(update) }
    : { ...workspace, folders: workspace.folders.map(update) };
}

export function folderPath(folders: Folder[], id: string | null): Folder[] {
  const path: Folder[] = [];
  const visited = new Set<string>();
  let current = id;
  while (current && !visited.has(current)) {
    visited.add(current);
    const folder = folders.find((item) => item.id === current);
    if (!folder) break;
    path.unshift(folder);
    current = folder.parentId;
  }
  return path;
}

export function moveNote(
  workspace: Workspace,
  noteId: string,
  folderId: string | null,
): Workspace {
  if (
    folderId !== null &&
    !workspace.folders.some((folder) => folder.id === folderId)
  )
    return workspace;
  const note = workspace.notes.find((item) => item.id === noteId);
  if (!note || note.folderId === folderId) return workspace;
  return {
    ...workspace,
    notes: workspace.notes.map((item) =>
      item.id === noteId
        ? { ...item, folderId, updatedAt: new Date().toISOString() }
        : item,
    ),
  };
}

export function deleteFolder(workspace: Workspace, id: string): Workspace {
  const removed = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const folder of workspace.folders) {
      if (
        folder.parentId &&
        removed.has(folder.parentId) &&
        !removed.has(folder.id)
      ) {
        removed.add(folder.id);
        changed = true;
      }
    }
  }
  return {
    ...workspace,
    folders: workspace.folders.filter((folder) => !removed.has(folder.id)),
    notes: workspace.notes.filter(
      (note) => !note.folderId || !removed.has(note.folderId),
    ),
  };
}
