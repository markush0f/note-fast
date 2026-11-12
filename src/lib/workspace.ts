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
  deletedAt?: string;
}

export const TRASH_DAYS = 30;
const TRASH_MS = TRASH_DAYS * 24 * 60 * 60 * 1000;
export interface Workspace {
  version: 3;
  notes: Note[];
  folders: Folder[];
  toolbarPosition?: ToolbarPlacement;
  theme?: Theme;
  title?: string;
  description?: string;
  coverIcon?: ItemIconId;
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
  const source = value as (Omit<Partial<Workspace>, 'version'> & { version?: number }) | null;
  if (
    !legacy &&
    (!source ||
      (source.version !== 2 && source.version !== 3) ||
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
        typeof note.updatedAt !== "string" ||
        (note.deletedAt !== undefined && typeof note.deletedAt !== "string"),
    ) ||
    folders.some(
      (folder) =>
        !folder ||
        typeof folder.id !== "string" ||
        typeof folder.name !== "string" ||
        (folder.parentId !== null && typeof folder.parentId !== "string") ||
        (folder.deletedAt !== undefined && typeof folder.deletedAt !== "string"),
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
    version: 3,
    notes: notes.map((note) => ({
      ...normalizeItemIcon(note),
      folderId:
        note.folderId && folderIds.has(note.folderId) ? note.folderId : null,
    })),
    folders: folders.map(normalizeItemIcon),
    ...(isTheme(source?.theme) ? { theme: source.theme } : {}),
    ...(typeof source?.title === 'string' ? { title: source.title.slice(0, 120) } : {}),
    ...(typeof source?.description === 'string' ? { description: source.description.slice(0, 500) } : {}),
    ...(isItemIconId(source?.coverIcon) ? { coverIcon: source.coverIcon } : {}),
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

function deletedSubtree(workspace: Workspace, id: string): Set<string> {
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
  return removed;
}

export function trashNote(
  workspace: Workspace,
  id: string,
  deletedAt = new Date().toISOString(),
): Workspace {
  const note = workspace.notes.find((item) => item.id === id);
  if (!note || note.deletedAt) return workspace;
  return {
    ...workspace,
    notes: workspace.notes.map((item) =>
      item.id === id ? { ...item, deletedAt } : item,
    ),
  };
}

export function trashFolder(
  workspace: Workspace,
  id: string,
  deletedAt = new Date().toISOString(),
): Workspace {
  const folder = workspace.folders.find((item) => item.id === id);
  if (!folder || folder.deletedAt) return workspace;
  const removed = deletedSubtree(workspace, id);
  return {
    ...workspace,
    folders: workspace.folders.map((item) =>
      removed.has(item.id) && !item.deletedAt ? { ...item, deletedAt } : item,
    ),
    notes: workspace.notes.map((item) =>
      item.folderId && removed.has(item.folderId) && !item.deletedAt
        ? { ...item, deletedAt }
        : item,
    ),
  };
}

export function deleteFolder(workspace: Workspace, id: string): Workspace {
  return trashFolder(workspace, id);
}

function withoutDeletedAt<T extends { deletedAt?: string }>(item: T): T {
  const next = { ...item };
  delete next.deletedAt;
  return next;
}

export function restoreNote(workspace: Workspace, id: string): Workspace {
  const note = workspace.notes.find((item) => item.id === id && item.deletedAt);
  if (!note) return workspace;
  const parentAlive =
    note.folderId !== null &&
    workspace.folders.some(
      (folder) => folder.id === note.folderId && !folder.deletedAt,
    );
  return {
    ...workspace,
    notes: workspace.notes.map((item) =>
      item.id === id
        ? {
            ...withoutDeletedAt(item),
            folderId: parentAlive ? item.folderId : null,
          }
        : item,
    ),
  };
}

export function restoreFolder(workspace: Workspace, id: string): Workspace {
  const folder = workspace.folders.find(
    (item) => item.id === id && item.deletedAt,
  );
  if (!folder?.deletedAt) return workspace;
  const deletedAt = folder.deletedAt;
  const restored = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const child of workspace.folders) {
      if (
        child.parentId &&
        restored.has(child.parentId) &&
        child.deletedAt === deletedAt &&
        !restored.has(child.id)
      ) {
        restored.add(child.id);
        changed = true;
      }
    }
  }
  const parentAlive =
    folder.parentId !== null &&
    workspace.folders.some(
      (item) => item.id === folder.parentId && !item.deletedAt,
    );
  return {
    ...workspace,
    folders: workspace.folders.map((item) => {
      if (!restored.has(item.id)) return item;
      const next = withoutDeletedAt(item);
      if (item.id === id && !parentAlive) next.parentId = null;
      return next;
    }),
    notes: workspace.notes.map((item) =>
      item.folderId &&
      restored.has(item.folderId) &&
      item.deletedAt === deletedAt
        ? withoutDeletedAt(item)
        : item,
    ),
  };
}

export function deleteForever(
  workspace: Workspace,
  target: { kind: "note" | "folder"; id: string },
): Workspace {
  if (target.kind === "note") {
    if (!workspace.notes.some((note) => note.id === target.id && note.deletedAt))
      return workspace;
    return {
      ...workspace,
      notes: workspace.notes.filter((note) => note.id !== target.id),
    };
  }
  const folder = workspace.folders.find(
    (item) => item.id === target.id && item.deletedAt,
  );
  if (!folder) return workspace;
  const removed = new Set([target.id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const child of workspace.folders) {
      if (
        child.parentId &&
        removed.has(child.parentId) &&
        child.deletedAt &&
        !removed.has(child.id)
      ) {
        removed.add(child.id);
        changed = true;
      }
    }
  }
  return {
    ...workspace,
    folders: workspace.folders.filter((item) => !removed.has(item.id)),
    notes: workspace.notes.filter(
      (note) => !(note.deletedAt && note.folderId && removed.has(note.folderId)),
    ),
  };
}

export function emptyTrash(workspace: Workspace): Workspace {
  const removed = new Set(
    workspace.folders.filter((folder) => folder.deletedAt).map((folder) => folder.id),
  );
  const notes = workspace.notes.filter((note) => !note.deletedAt);
  const folders = workspace.folders.filter((folder) => !folder.deletedAt);
  if (
    notes.length === workspace.notes.length &&
    folders.length === workspace.folders.length
  )
    return workspace;
  return {
    ...workspace,
    notes: notes.map((note) =>
      note.folderId && removed.has(note.folderId)
        ? { ...note, folderId: null }
        : note,
    ),
    folders,
  };
}

export function purgeTrash(
  workspace: Workspace,
  now = Date.now(),
): Workspace {
  const expired = (deletedAt?: string) => {
    if (!deletedAt) return false;
    const time = Date.parse(deletedAt);
    return Number.isFinite(time) && now - time >= TRASH_MS;
  };
  const removed = new Set(
    workspace.folders.filter((folder) => expired(folder.deletedAt)).map((folder) => folder.id),
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const folder of workspace.folders) {
      if (
        folder.parentId &&
        removed.has(folder.parentId) &&
        folder.deletedAt &&
        !removed.has(folder.id)
      ) {
        removed.add(folder.id);
        changed = true;
      }
    }
  }
  const notes = workspace.notes.filter(
    (note) =>
      !expired(note.deletedAt) &&
      !(note.deletedAt && note.folderId && removed.has(note.folderId)),
  );
  const folders = workspace.folders.filter((folder) => !removed.has(folder.id));
  if (
    notes.length === workspace.notes.length &&
    folders.length === workspace.folders.length
  )
    return workspace;
  return { ...workspace, notes, folders };
}
