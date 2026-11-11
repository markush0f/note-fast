import { useEffect, useState, type DragEvent, type ReactNode } from "react";
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

const NOTE_DRAG_TYPE = "application/x-ntbk-note";

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
  onMoveNote: (noteId: string, folderId: string | null) => void;
}

export default function FileExplorer(props: Props) {
  const { notes, folders, selectedId, activeFolderId, query, favorites } =
    props;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null | undefined>();
  const [announcement, setAnnouncement] = useState("");
  const filtering = Boolean(query.trim() || favorites);

  useEffect(() => {
    setExpanded(
      (previous) =>
        new Set([
          ...previous,
          ...folderPath(folders, activeFolderId).map((folder) => folder.id),
        ]),
    );
  }, [activeFolderId, folders]);

  const resetDrag = () => {
    setDraggedId(null);
    setDropTarget(undefined);
  };
  const canDrop = (event: DragEvent<HTMLElement>, folderId: string | null) => {
    const note = notes.find((item) => item.id === draggedId);
    return Boolean(
      note &&
      note.folderId !== folderId &&
      event.dataTransfer.types.includes(NOTE_DRAG_TYPE),
    );
  };
  const dropHandlers = (folderId: string | null) => ({
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (!canDrop(event, folderId)) {
        event.dataTransfer.dropEffect = "none";
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      setDropTarget(folderId);
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (
        !(event.relatedTarget instanceof Node) ||
        !event.currentTarget.contains(event.relatedTarget)
      ) {
        setDropTarget((previous) =>
          previous === folderId ? undefined : previous,
        );
      }
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      if (!canDrop(event, folderId)) return;
      event.preventDefault();
      event.stopPropagation();
      const id = event.dataTransfer.getData(NOTE_DRAG_TYPE);
      if (id !== draggedId) {
        resetDrag();
        return;
      }
      props.onMoveNote(id, folderId);
      setExpanded(
        (previous) =>
          new Set([
            ...previous,
            ...folderPath(folders, folderId).map((folder) => folder.id),
          ]),
      );
      setAnnouncement(
        `Nota movida a ${folders.find((folder) => folder.id === folderId)?.name ?? "Notas (raíz)"}.`,
      );
      resetDrag();
    },
  });

  const renderNote = (note: Note, showPath = false) => (
    <li key={note.id}>
      <button
        draggable
        className={`mb-0.5 block w-full cursor-grab rounded bg-transparent px-2.5 py-1.5 text-left hover:bg-hover active:cursor-grabbing aria-[current=true]:bg-selection focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-stone-500 ${draggedId === note.id ? "opacity-40" : ""}`}
        aria-label={`Abrir ${note.title || "Sin título"}`}
        aria-current={selectedId === note.id ? "true" : undefined}
        title={`${note.title || "Sin título"}\n${plainText(note.content) || "Nota vacía"}`}
        onClick={() => props.onSelect(note)}
        onDragStart={(event) => {
          event.dataTransfer.setData(NOTE_DRAG_TYPE, note.id);
          event.dataTransfer.effectAllowed = "move";
          setDraggedId(note.id);
          setAnnouncement(
            "Suelta la nota sobre una carpeta o sobre Notas para moverla a la raíz.",
          );
        }}
        onDragEnd={resetDrag}
      >
        <span className="flex items-center gap-2 text-xs leading-5">
          <Page size={13} className="shrink-0 text-stone-500" />
          <span className="min-w-0 flex-1 truncate">
            {note.title || "Sin título"}
          </span>
          {note.favorite && (
            <Star
              size={11}
              className="shrink-0 text-stone-500"
              fill="currentColor"
            />
          )}
        </span>
        {showPath && (
          <span className="block truncate pl-5 text-[10px] leading-4 text-muted">
            {[
              "Notas",
              ...folderPath(folders, note.folderId).map(
                (folder) => folder.name,
              ),
            ].join(" / ")}
          </span>
        )}
      </button>
    </li>
  );

  const renderChildren = (
    parentId: string | null,
    includeNotes = true,
  ): ReactNode => {
    const children = folders
      .filter((folder) => folder.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    const files = includeNotes
      ? filterNotes(
          notes.filter((note) => note.folderId === parentId),
          "",
          false,
        )
      : [];
    return (
      <ul className="min-w-44 list-none">
        {children.map((folder) => {
          const isExpanded =
            expanded.has(folder.id) || (!includeNotes && draggedId !== null);
          return (
            <li key={folder.id}>
              <div
                {...dropHandlers(folder.id)}
                data-drop-target={dropTarget === folder.id ? "true" : undefined}
                className={`mb-0.5 flex items-center rounded ${dropTarget === folder.id ? "bg-stone-200 ring-1 ring-inset ring-stone-400" : activeFolderId === folder.id ? "bg-selection hover:bg-hover" : "hover:bg-hover"}`}
              >
                <button
                  className="flex h-8 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted focus-visible:outline-2 focus-visible:outline-stone-500"
                  aria-label={`${isExpanded ? "Contraer" : "Expandir"} ${folder.name}`}
                  aria-expanded={isExpanded}
                  onClick={() =>
                    setExpanded((previous) => {
                      const next = new Set(previous);
                      if (next.has(folder.id)) next.delete(folder.id);
                      else next.add(folder.id);
                      return next;
                    })
                  }
                >
                  {isExpanded ? (
                    <NavArrowDown size={13} />
                  ) : (
                    <NavArrowRight size={13} />
                  )}
                </button>
                <button
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded py-2 text-left text-xs focus-visible:outline-2 focus-visible:outline-stone-500"
                  title={folder.name}
                  aria-label={`Seleccionar carpeta ${folder.name}`}
                  aria-current={
                    activeFolderId === folder.id ? "true" : undefined
                  }
                  onClick={() => {
                    props.onSelectFolder(folder.id);
                    setExpanded(
                      (previous) => new Set([...previous, folder.id]),
                    );
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
              {isExpanded && (
                <div
                  className="ml-2.5 border-l border-line pl-2"
                  aria-label={`Contenido de ${folder.name}`}
                >
                  {renderChildren(folder.id, includeNotes)}
                </div>
              )}
            </li>
          );
        })}
        {files.map((note) => renderNote(note))}
      </ul>
    );
  };
  const results = filtering ? filterNotes(notes, query, favorites) : [];
  return (
    <div className="min-h-0 flex-1 overflow-auto px-2.5 pb-4 [scrollbar-width:thin]">
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <button
        {...dropHandlers(null)}
        data-drop-target={dropTarget === null ? "true" : undefined}
        className={`mb-1 flex w-full cursor-pointer items-center gap-2 rounded px-2 py-2 text-xs text-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-stone-500 ${dropTarget === null ? "bg-stone-200 ring-1 ring-inset ring-stone-400" : "hover:bg-hover aria-[current=true]:bg-selection"}`}
        aria-label="Notas (raíz)"
        aria-current={activeFolderId === null ? "true" : undefined}
        onClick={() => props.onSelectFolder(null)}
      >
        <FolderIcon size={14} />
        Notas
      </button>
      {filtering ? (
        <div key="results">
          <ul className="list-none">
            {results.map((note) => renderNote(note, true))}
          </ul>
          {!results.length && (
            <p className="px-3 py-9 text-center text-xs text-muted">
              {query ? "Sin resultados" : "No hay favoritas"}
            </p>
          )}
        </div>
      ) : (
        <div key="tree">{renderChildren(null)}</div>
      )}
      {filtering && draggedId !== null && folders.length > 0 && (
        <div key="destinations" aria-label="Carpetas de destino">
          <p className="px-2 pt-3 pb-1 text-[10px] text-muted">Mover a</p>
          {renderChildren(null, false)}
        </div>
      )}
      {!filtering && !notes.length && !folders.length && (
        <div className="px-3 py-9 text-center text-xs text-muted">
          <Button variant="text" onClick={() => props.onNewNote(null)}>
            Crear nota
          </Button>
        </div>
      )}
    </div>
  );
}
