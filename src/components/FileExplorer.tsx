import { useEffect, useState, type ReactNode } from "react";
import {
  NavArrowDown,
  NavArrowRight,
  MoreHoriz,
  Page,
  Folder as FolderIcon,
  FolderPlus,
  EditPencil,
  Plus,
  Star,
  Trash,
} from "./icons";
import { Button, iconButtonClass, MenuItems } from "./ui";
import { filterNotes, plainText, type Note } from "../lib/notes";
import { folderPath, type Folder } from "../lib/workspace";

interface Props {
  notes: Note[];
  folders: Folder[];
  selectedId: string | null;
  activeFolderId: string | null;
  query: string;
  favorites: boolean;
  onSelect: (note: Note) => void;
  onSelectFolder: (id: string | null) => void;
  onNewNote: (parentId: string | null) => void;
  onNewFolder: (parentId: string | null) => void;
  onRenameFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
}

export default function FileExplorer(props: Props) {
  const { notes, folders, selectedId, activeFolderId, query, favorites } =
    props;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  useEffect(() => {
    setExpanded(
      (previous) =>
        new Set([
          ...previous,
          ...folderPath(folders, activeFolderId).map((folder) => folder.id),
        ]),
    );
  }, [activeFolderId, folders]);

  const renderNote = (note: Note, showPath = false) => (
    <li key={note.id}>
      <button
        className="mb-0.5 block w-full cursor-pointer rounded bg-transparent px-2.5 py-3 text-left hover:bg-hover aria-[current=true]:bg-selection focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-stone-500"
        aria-label={`Abrir ${note.title || "Sin título"}`}
        aria-current={selectedId === note.id ? "true" : undefined}
        onClick={() => props.onSelect(note)}
      >
        <span className="flex items-center gap-2 text-[13px] font-medium">
          <Page size={14} className="shrink-0 text-stone-500" />
          <span className="min-w-0 flex-1 truncate">
            {note.title || "Sin título"}
          </span>
          {note.favorite && (
            <Star
              size={12}
              className="shrink-0 text-stone-500"
              fill="currentColor"
            />
          )}
        </span>
        {showPath && (
          <span className="mt-1 block truncate text-[10px] text-muted">
            {[
              "Notas",
              ...folderPath(folders, note.folderId).map(
                (folder) => folder.name,
              ),
            ].join(" / ")}
          </span>
        )}
        <span className="mt-1 block truncate pl-5.5 text-xs text-muted">
          {plainText(note.content) || "Nota vacía"}
        </span>
      </button>
    </li>
  );

  const renderChildren = (parentId: string | null): ReactNode => {
    const children = folders
      .filter((folder) => folder.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    const files = filterNotes(
      notes.filter((note) => note.folderId === parentId),
      "",
      false,
    );
    return (
      <ul className="min-w-44 list-none">
        {children.map((folder) => (
          <li key={folder.id}>
            <div
              className={`group/folder mb-0.5 flex items-center rounded hover:bg-hover ${activeFolderId === folder.id ? "bg-selection" : ""}`}
            >
              <button
                className="flex h-8 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted focus-visible:outline-2 focus-visible:outline-stone-500"
                aria-label={`${expanded.has(folder.id) ? "Contraer" : "Expandir"} ${folder.name}`}
                aria-expanded={expanded.has(folder.id)}
                onClick={() =>
                  setExpanded((previous) => {
                    const next = new Set(previous);
                    if (next.has(folder.id)) next.delete(folder.id);
                    else next.add(folder.id);
                    return next;
                  })
                }
              >
                {expanded.has(folder.id) ? (
                  <NavArrowDown size={13} />
                ) : (
                  <NavArrowRight size={13} />
                )}
              </button>
              <button
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded py-2 text-left text-xs focus-visible:outline-2 focus-visible:outline-stone-500"
                title={folder.name}
                aria-label={`Seleccionar carpeta ${folder.name}`}
                aria-current={activeFolderId === folder.id ? "true" : undefined}
                onClick={() => {
                  props.onSelectFolder(folder.id);
                  setExpanded((previous) => new Set([...previous, folder.id]));
                }}
              >
                <FolderIcon size={15} className="shrink-0 text-muted" />
                <span className="truncate">{folder.name}</span>
              </button>
              <details
                className="relative shrink-0"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget))
                    event.currentTarget.open = false;
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.currentTarget.open = false;
                    event.currentTarget.querySelector("summary")?.focus();
                  }
                }}
              >
                <summary
                  className={`${iconButtonClass} list-none [&::-webkit-details-marker]:hidden`}
                  aria-label={`Opciones de ${folder.name}`}
                >
                  <MoreHoriz size={16} />
                </summary>
                <MenuItems
                  onClick={(event) => {
                    const details = event.currentTarget.closest("details");
                    if (details) details.open = false;
                  }}
                >
                  <Button
                    variant="menu"
                    onClick={() => props.onNewNote(folder.id)}
                  >
                    <Plus size={15} />
                    Nueva nota
                  </Button>
                  <Button
                    variant="menu"
                    onClick={() => props.onNewFolder(folder.id)}
                  >
                    <FolderPlus size={15} />
                    Nueva carpeta
                  </Button>
                  <Button
                    variant="menu"
                    onClick={() => props.onRenameFolder(folder)}
                  >
                    <EditPencil size={15} />
                    Renombrar
                  </Button>
                  <Button
                    variant="menuDanger"
                    onClick={() => props.onDeleteFolder(folder)}
                  >
                    <Trash size={15} />
                    Eliminar carpeta
                  </Button>
                </MenuItems>
              </details>
            </div>
            {expanded.has(folder.id) && (
              <div
                className="ml-2.5 border-l border-line pl-2"
                aria-label={`Contenido de ${folder.name}`}
              >
                {renderChildren(folder.id)}
              </div>
            )}
          </li>
        ))}
        {files.map((note) => renderNote(note))}
      </ul>
    );
  };

  if (query.trim() || favorites) {
    const results = filterNotes(notes, query, favorites);
    return (
      <div className="min-h-0 flex-1 overflow-auto px-2.5 pb-4 [scrollbar-width:thin]">
        <ul className="list-none">
          {results.map((note) => renderNote(note, true))}
        </ul>
        {!results.length && (
          <p className="px-3 py-9 text-center text-xs text-muted">
            {query ? "Sin resultados" : "No hay favoritas"}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="min-h-0 flex-1 overflow-auto px-2.5 pb-4 [scrollbar-width:thin]">
      <button
        className="mb-1 flex w-full cursor-pointer items-center gap-2 rounded px-2 py-2 text-xs text-muted hover:bg-hover aria-[current=true]:bg-selection focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-stone-500"
        aria-label="Notas (raíz)"
        aria-current={activeFolderId === null ? "true" : undefined}
        onClick={() => props.onSelectFolder(null)}
      >
        <FolderIcon size={14} />
        Notas
      </button>
      {renderChildren(null)}
      {!notes.length && !folders.length && (
        <div className="px-3 py-9 text-center text-xs text-muted">
          <Button variant="text" onClick={() => props.onNewNote(null)}>
            Crear nota
          </Button>
        </div>
      )}
    </div>
  );
}
