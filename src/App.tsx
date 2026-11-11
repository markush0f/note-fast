import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Check,
  WarningCircle,
  Download,
  MoreHoriz,
  Refresh,
  FolderPlus,
  Folder as FolderIcon,
  Palette,
  Plus,
  Search,
  Star,
  Trash,
  Xmark,
  Settings,
} from "./components/icons";
import { Button, iconButtonClass, MenuItems } from "./components/ui";
import { createNote, type Note } from "./lib/notes";
import { loadWorkspace, saveWorkspace } from "./lib/storage";
import {
  createFolder,
  deleteFolder,
  folderPath,
  moveNote,
  setItemIcon,
  type Folder,
  type Workspace,
} from "./lib/workspace";
import FileExplorer from "./components/FileExplorer";
import Dialog from "./components/Dialog";
import SettingsDialog from "./components/SettingsDialog";
import { applyTheme, getInitialTheme } from "./lib/theme";
import IconPicker from "./components/IconPicker";
import type { ItemTarget } from "./lib/item-icons";
import { DEFAULT_TOOLBAR_POSITION } from "./lib/editor-layout";

const NoteEditor = lazy(() => import("./components/NoteEditor"));

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace>({
    version: 2,
    notes: [],
    folders: [],
  });
  const { notes, folders } = workspace;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [initialTheme] = useState(getInitialTheme);
  const theme = workspace.theme ?? initialTheme;
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [explorerSelection, setExplorerSelection] = useState<ItemTarget | null>(
    null,
  );
  const [folderDialog, setFolderDialog] = useState<{
    id?: string;
    parentId: string | null;
    name: string;
  } | null>(null);
  const [folderError, setFolderError] = useState("");
  const [iconTarget, setIconTarget] = useState<ItemTarget | null>(null);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [moveId, setMoveId] = useState<string | null>(null);
  const [moveFolderId, setMoveFolderId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "error">(
    "saved",
  );
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState(false);
  const [mobileEditor, setMobileEditor] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const actionsRef = useRef<HTMLDetailsElement>(null);
  const actionsButtonRef = useRef<HTMLElement>(null);
  const selected = notes.find((note) => note.id === selectedId);
  const iconItem =
    iconTarget?.kind === "note"
      ? notes.find((note) => note.id === iconTarget.id)
      : folders.find((folder) => folder.id === iconTarget?.id);

  const openFolderDialog = (parentId: string | null, folder?: Folder) => {
    setFolderError("");
    setFolderDialog({ id: folder?.id, parentId, name: folder?.name ?? "" });
  };

  const saveFolder = () => {
    if (!folderDialog) return;
    const name = folderDialog.name.trim();
    if (!name) {
      setFolderError("Escribe un nombre.");
      return;
    }
    if (
      folders.some(
        (folder) =>
          folder.parentId === folderDialog.parentId &&
          folder.id !== folderDialog.id &&
          folder.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"),
      )
    ) {
      setFolderError("Ya existe una carpeta con ese nombre aquí.");
      return;
    }
    const folder = folderDialog.id
      ? { ...folders.find((item) => item.id === folderDialog.id)!, name }
      : createFolder(name, folderDialog.parentId);
    setWorkspace((previous) => ({
      ...previous,
      folders: folderDialog.id
        ? previous.folders.map((item) =>
            item.id === folder.id ? folder : item,
          )
        : [...previous.folders, folder],
    }));
    setActiveFolderId(folder.id);
    setExplorerSelection({ kind: "folder", id: folder.id });
    setFavorites(false);
    setQuery("");
    setFolderDialog(null);
  };

  useEffect(() => {
    let cancelled = false;
    void loadWorkspace()
      .then((stored) => {
        if (cancelled) return;
        const initial: Workspace = stored ?? {
          version: 2,
          notes: [createNote()],
          folders: [],
        };
        setWorkspace(initial);
        setSelectedId(initial.notes[0]?.id ?? null);
        setExplorerSelection(
          initial.notes[0] ? { kind: "note", id: initial.notes[0].id } : null,
        );
        setActiveFolderId(initial.notes[0]?.folderId ?? null);
        setLoaded(true);
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    setSaveStatus("saving");
    void saveWorkspace(workspace)
      .then(() => {
        if (!cancelled) setSaveStatus("saved");
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!cancelled) setSaveStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [workspace, loaded, retry]);

  useEffect(() => {
    if (loaded) applyTheme(theme);
  }, [loaded, theme]);

  const addNote = useCallback(
    (folderId: string | null = activeFolderId) => {
      if (!loaded) return;
      const note = createNote(folderId);
      setWorkspace((previous) => ({
        ...previous,
        notes: [note, ...previous.notes],
      }));
      setActiveFolderId(folderId);
      setSelectedId(note.id);
      setExplorerSelection({ kind: "note", id: note.id });
      setFavorites(false);
      setQuery("");
      setMobileEditor(true);
    },
    [loaded, activeFolderId],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        setMobileEditor(false);
        requestAnimationFrame(() => searchRef.current?.focus());
      }
      if (event.altKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        addNote();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [addNote]);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !actionsRef.current?.contains(event.target)
      ) {
        if (actionsRef.current) actionsRef.current.open = false;
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  const closeActions = () => {
    if (actionsRef.current) actionsRef.current.open = false;
    actionsButtonRef.current?.focus();
  };

  const updateNote = (
    id: string,
    changes: Partial<Pick<Note, "title" | "content" | "favorite">>,
  ) => {
    setWorkspace((previous) => ({
      ...previous,
      notes: previous.notes.map((note) =>
        note.id === id
          ? { ...note, ...changes, updatedAt: new Date().toISOString() }
          : note,
      ),
    }));
  };

  const relocateNote = (noteId: string, folderId: string | null) => {
    setWorkspace((previous) => moveNote(previous, noteId, folderId));
    if (noteId === selectedId) setActiveFolderId(folderId);
  };

  const removeItem = () => {
    const next = deleteFolderId
      ? deleteFolder(workspace, deleteFolderId)
      : { ...workspace, notes: notes.filter((note) => note.id !== deleteId) };
    setWorkspace(next);
    if (!next.notes.some((note) => note.id === selectedId)) {
      setSelectedId(next.notes[0]?.id ?? null);
      setMobileEditor(false);
    }
    if (!next.folders.some((folder) => folder.id === activeFolderId))
      setActiveFolderId(null);
    if (
      explorerSelection &&
      !(explorerSelection.kind === "note" ? next.notes : next.folders).some(
        (item) => item.id === explorerSelection.id,
      )
    ) {
      setExplorerSelection(
        next.notes[0] ? { kind: "note", id: next.notes[0].id } : null,
      );
    }
    setDeleteId(null);
    setDeleteFolderId(null);
  };

  const exportNote = () => {
    if (!selected) return;
    const title = selected.title || "Sin título";
    const escape = (text: string) =>
      text.replace(
        /[&<>"']/g,
        (char) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[char]!,
      );
    const blob = new Blob(
      [
        `<!doctype html><html lang="es"><meta charset="utf-8"><title>${escape(title)}</title><body><h1>${escape(title)}</h1>${selected.content}</body></html>`,
      ],
      { type: "text/html;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/[^\p{L}\p{N}\s_-]/gu, "").slice(0, 80) || "nota"}.html`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (loadError)
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center text-muted">
        <WarningCircle size={24} />
        <h1 className="text-lg text-ink">No pudimos abrir tus notas</h1>
        <p className="max-w-100 text-[13px]">
          Comprueba el acceso al almacenamiento local. Tus datos no se han
          sobrescrito.
        </p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </main>
    );
  if (!loaded)
    return (
      <main
        className="grid min-h-dvh place-items-center text-muted"
        role="status"
        aria-label="Abriendo notas"
      >
        <Refresh className="animate-spin motion-reduce:animate-none" />
      </main>
    );

  return (
    <div className="grid h-dvh grid-cols-1 overflow-hidden min-[651px]:grid-cols-[230px_minmax(0,1fr)] min-[901px]:grid-cols-[260px_minmax(0,1fr)]">
      <aside
        className={`${mobileEditor ? "hidden min-[651px]:flex" : "flex"} min-h-0 flex-col border-line bg-sidebar min-[651px]:border-r`}
        aria-label="Lista de notas"
      >
        <header className="flex items-center justify-between px-5 pt-6 pb-4">
          <h1 className="text-[15px] font-semibold">Notas</h1>
          <div className="flex items-center gap-1">
            <Button
              variant="icon"
              title="Nueva carpeta"
              aria-label="Nueva carpeta"
              onClick={() => openFolderDialog(activeFolderId)}
            >
              <FolderPlus size={18} />
            </Button>
            <Button
              variant="icon"
              title="Nueva nota (Ctrl+Alt+N)"
              aria-label="Nueva nota"
              onClick={() => addNote()}
            >
              <Plus size={19} />
            </Button>
          </div>
        </header>
        <div className="flex items-center gap-1.5 px-4 pb-4.5">
          <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded border border-line px-2 text-faint focus-within:border-strong">
            <Search size={15} />
            <input
              ref={searchRef}
              className="min-w-0 w-full bg-transparent text-xs text-ink outline-none placeholder:text-muted"
              aria-label="Buscar notas"
              placeholder="Buscar"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded hover:bg-hover focus-visible:outline-2 focus-visible:outline-strong"
                aria-label="Limpiar búsqueda"
                onClick={() => setQuery("")}
              >
                <Xmark size={14} />
              </button>
            )}
          </div>
          <Button
            variant="icon"
            aria-label="Mostrar solo favoritas"
            aria-pressed={favorites}
            title="Solo favoritas"
            onClick={() => setFavorites((value) => !value)}
          >
            <Star size={16} fill={favorites ? "currentColor" : "none"} />
          </Button>
        </div>
        <FileExplorer
          notes={notes}
          folders={folders}
          selection={explorerSelection}
          activeFolderId={activeFolderId}
          query={query}
          favorites={favorites}
          onSelect={(note) => {
            setExplorerSelection({ kind: "note", id: note.id });
            setSelectedId(note.id);
            setActiveFolderId(note.folderId);
            setMobileEditor(true);
          }}
          onSelectFolder={(id) => {
            setActiveFolderId(id);
            setExplorerSelection(id === null ? null : { kind: "folder", id });
          }}
          onMoveNote={relocateNote}
          onNewNote={addNote}
          onNewFolder={openFolderDialog}
          onRenameFolder={(folder) => openFolderDialog(folder.parentId, folder)}
          onChangeFolderIcon={(folder) =>
            setIconTarget({ kind: "folder", id: folder.id })
          }
          onDeleteFolder={(folder) => setDeleteFolderId(folder.id)}
        />
        <div className="shrink-0 border-t border-line p-2.5">
          <Button variant="menu" onClick={() => setSettingsOpen(true)}>
            <Settings size={16} />
            Ajustes
          </Button>
        </div>
      </aside>

      <main
        className={`${mobileEditor ? "flex" : "hidden min-[651px]:flex"} min-h-0 min-w-0 flex-col`}
      >
        <header className="flex min-h-14.5 shrink-0 items-center gap-2.5 px-3.5 min-[651px]:min-h-16 min-[651px]:px-5.5 min-[901px]:px-7">
          <Button
            variant="icon"
            className="min-[651px]:hidden"
            aria-label="Volver a las notas"
            onClick={() => setMobileEditor(false)}
          >
            <ArrowLeft size={18} />
          </Button>
          <div
            className={`flex items-center gap-1.5 text-[11px] ${saveStatus === "error" ? "text-danger" : "text-muted"}`}
            role="status"
          >
            {saveStatus === "error" ? (
              <WarningCircle size={13} />
            ) : saveStatus === "saving" ? (
              <Refresh
                size={13}
                className="animate-spin motion-reduce:animate-none"
              />
            ) : (
              <Check size={13} />
            )}
            <span>
              {saveStatus === "saved"
                ? "Guardado"
                : saveStatus === "saving"
                  ? "Guardando…"
                  : "No se pudo guardar"}
            </span>
            {saveStatus === "error" && (
              <Button
                variant="text"
                className="ml-1"
                onClick={() => setRetry((value) => value + 1)}
              >
                Reintentar
              </Button>
            )}
          </div>
          {selected && (
            <details
              className="relative ml-auto"
              ref={actionsRef}
              key={selected.id}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeActions();
                }
              }}
            >
              <summary
                ref={actionsButtonRef}
                className={`${iconButtonClass} list-none [&::-webkit-details-marker]:hidden`}
                aria-label="Opciones de la nota"
                title="Opciones de la nota"
              >
                <MoreHoriz size={20} />
              </summary>
              <MenuItems>
                <Button
                  variant="menu"
                  onClick={() => {
                    updateNote(selected.id, { favorite: !selected.favorite });
                    closeActions();
                  }}
                >
                  <Star size={15} />
                  {selected.favorite
                    ? "Quitar de favoritas"
                    : "Añadir a favoritas"}
                </Button>
                <Button
                  variant="menu"
                  onClick={() => {
                    closeActions();
                    setMoveId(selected.id);
                    setMoveFolderId(selected.folderId);
                  }}
                >
                  <FolderIcon size={15} />
                  Mover a…
                </Button>
                <Button
                  variant="menu"
                  onClick={() => {
                    closeActions();
                    setIconTarget({ kind: "note", id: selected.id });
                  }}
                >
                  <Palette size={15} />
                  Cambiar icono
                </Button>
                <Button
                  variant="menu"
                  aria-label="Exportar nota como HTML"
                  onClick={() => {
                    exportNote();
                    closeActions();
                  }}
                >
                  <Download size={15} />
                  Exportar HTML
                </Button>
                <Button
                  variant="menuDanger"
                  onClick={() => {
                    closeActions();
                    setDeleteId(selected.id);
                  }}
                >
                  <Trash size={15} />
                  Eliminar nota
                </Button>
              </MenuItems>
            </details>
          )}
        </header>
        {selected ? (
          <Suspense
            fallback={
              <p className="flex-1 p-6 text-[13px] text-muted">
                Cargando editor…
              </p>
            }
          >
            <NoteEditor
              key={selected.id}
              note={selected}
              onChange={(content) => updateNote(selected.id, { content })}
              onTitleChange={(title) => updateNote(selected.id, { title })}
              toolbarPosition={
                workspace.toolbarPosition ?? DEFAULT_TOOLBAR_POSITION
              }
              onToolbarPositionChange={(toolbarPosition) =>
                setWorkspace((previous) => ({ ...previous, toolbarPosition }))
              }
            />
          </Suspense>
        ) : (
          <div className="grid flex-1 place-content-center p-6">
            <Button variant="primary" onClick={() => addNote()}>
              <Plus size={16} /> Nueva nota
            </Button>
          </div>
        )}
      </main>

      {settingsOpen && (
        <SettingsDialog
          theme={theme}
          onClose={() => setSettingsOpen(false)}
          onThemeChange={(theme) =>
            setWorkspace((previous) => ({ ...previous, theme }))
          }
        />
      )}
      {iconTarget && iconItem && (
        <IconPicker
          name={
            "title" in iconItem ? iconItem.title || "Sin título" : iconItem.name
          }
          value={iconItem.icon}
          onClose={() => setIconTarget(null)}
          onSelect={(icon) => {
            setWorkspace((previous) => setItemIcon(previous, iconTarget, icon));
            setIconTarget(null);
          }}
        />
      )}
      {moveId && (
        <Dialog title="Mover nota" onClose={() => setMoveId(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              relocateNote(moveId, moveFolderId);
              setMoveId(null);
            }}
          >
            <label
              className="mt-4 mb-2 block text-xs text-muted"
              htmlFor="move-folder"
            >
              Carpeta de destino
            </label>
            <select
              id="move-folder"
              className="w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-strong"
              value={moveFolderId ?? ""}
              onChange={(event) => setMoveFolderId(event.target.value || null)}
            >
              <option value="">Notas (raíz)</option>
              {folders
                .map((folder) => ({
                  id: folder.id,
                  path: folderPath(folders, folder.id)
                    .map((item) => item.name)
                    .join(" / "),
                }))
                .sort((a, b) => a.path.localeCompare(b.path, "es"))
                .map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.path}
                  </option>
                ))}
            </select>
            <div className="mt-6 flex justify-end gap-2">
              <Button onClick={() => setMoveId(null)}>Cancelar</Button>
              <Button variant="primary" type="submit">
                Mover
              </Button>
            </div>
          </form>
        </Dialog>
      )}
      {folderDialog && (
        <Dialog
          title={folderDialog.id ? "Renombrar carpeta" : "Nueva carpeta"}
          onClose={() => setFolderDialog(null)}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveFolder();
            }}
          >
            <label
              className="mb-2 mt-4 block text-xs text-muted"
              htmlFor="folder-name"
            >
              Nombre
            </label>
            <input
              id="folder-name"
              className="w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-strong aria-invalid:border-danger"
              value={folderDialog.name}
              maxLength={120}
              aria-invalid={Boolean(folderError)}
              aria-describedby={folderError ? "folder-error" : undefined}
              onChange={(event) => {
                setFolderError("");
                setFolderDialog({ ...folderDialog, name: event.target.value });
              }}
            />
            {folderError && (
              <p
                id="folder-error"
                className="mt-2 text-xs text-danger"
                role="alert"
              >
                {folderError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Button onClick={() => setFolderDialog(null)}>Cancelar</Button>
              <Button variant="primary" type="submit">
                {folderDialog.id ? "Guardar" : "Crear carpeta"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
      {(deleteId || deleteFolderId) && (
        <Dialog
          title={deleteFolderId ? "¿Eliminar carpeta?" : "¿Eliminar nota?"}
          description={
            deleteFolderId
              ? "Se eliminarán todas sus subcarpetas y notas. Esta acción no se puede deshacer."
              : "Esta acción no se puede deshacer."
          }
          onClose={() => {
            setDeleteId(null);
            setDeleteFolderId(null);
          }}
        >
          <div className="mt-6 flex justify-end gap-2">
            <Button
              onClick={() => {
                setDeleteId(null);
                setDeleteFolderId(null);
              }}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={removeItem}>
              {deleteFolderId ? "Eliminar carpeta" : "Eliminar nota"}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
