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
  CircleAlert,
  Download,
  Ellipsis,
  LoaderCircle,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { createNote, filterNotes, plainText, type Note } from "./lib/notes";
import { loadNotes, saveNotes } from "./lib/storage";

const NoteEditor = lazy(() => import("./components/NoteEditor"));

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
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
  const visible = filterNotes(notes, query, favorites);

  useEffect(() => {
    let cancelled = false;
    void loadNotes()
      .then((stored) => {
        if (cancelled) return;
        const initial = stored ?? [createNote()];
        setNotes(initial);
        setSelectedId(initial[0]?.id ?? null);
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
    void saveNotes(notes)
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
  }, [notes, loaded, retry]);

  const addNote = useCallback(() => {
    if (!loaded) return;
    const note = createNote();
    setNotes((previous) => [note, ...previous]);
    setSelectedId(note.id);
    setFavorites(false);
    setQuery("");
    setMobileEditor(true);
  }, [loaded]);

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
    setNotes((previous) =>
      previous.map((note) =>
        note.id === id
          ? { ...note, ...changes, updatedAt: new Date().toISOString() }
          : note,
      ),
    );
  };

  const removeNote = () => {
    const remaining = notes.filter((note) => note.id !== deleteId);
    setNotes(remaining);
    if (selectedId === deleteId) {
      setSelectedId(remaining[0]?.id ?? null);
      setMobileEditor(false);
    }
    setDeleteId(null);
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
      <main className="loading-screen">
        <CircleAlert size={24} />
        <h1>No pudimos abrir tus notas</h1>
        <p>
          Comprueba el acceso al almacenamiento local. Tus datos no se han
          sobrescrito.
        </p>
        <button
          className="primary-button"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </button>
      </main>
    );
  if (!loaded)
    return (
      <main className="loading-screen">
        <LoaderCircle className="animate-spin" aria-label="Abriendo notas" />
      </main>
    );

  return (
    <div className={`app-shell ${mobileEditor ? "show-editor" : ""}`}>
      <aside className="notes-panel" aria-label="Lista de notas">
        <header className="notes-heading">
          <h1>Notas</h1>
          <button
            className="icon-button new-note"
            title="Nueva nota (Ctrl+Alt+N)"
            aria-label="Nueva nota"
            onClick={addNote}
          >
            <Plus size={19} />
          </button>
        </header>
        <div className="search-row">
          <div className="search-box">
            <Search size={15} />
            <input
              ref={searchRef}
              aria-label="Buscar notas"
              placeholder="Buscar"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                className="icon-button"
                aria-label="Limpiar búsqueda"
                onClick={() => setQuery("")}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            className={`icon-button ${favorites ? "is-active" : ""}`}
            aria-label="Mostrar solo favoritas"
            aria-pressed={favorites}
            title="Solo favoritas"
            onClick={() => setFavorites((value) => !value)}
          >
            <Star size={16} fill={favorites ? "currentColor" : "none"} />
          </button>
        </div>
        <div className="notes-list">
          {visible.map((note) => (
            <button
              key={note.id}
              className={`note-card ${selectedId === note.id ? "active" : ""}`}
              aria-current={selectedId === note.id ? "true" : undefined}
              onClick={() => {
                setSelectedId(note.id);
                setMobileEditor(true);
              }}
            >
              <div className="note-card-title">
                <span>{note.title || "Sin título"}</span>
                {note.favorite && <Star size={12} fill="currentColor" />}
              </div>
              <p>{plainText(note.content) || "Nota vacía"}</p>
            </button>
          ))}
          {!visible.length && (
            <div className="empty-list">
              <p>
                {query
                  ? "Sin resultados"
                  : favorites
                    ? "No hay favoritas"
                    : "No hay notas"}
              </p>
              {!query && !favorites && (
                <button className="text-button" onClick={addNote}>
                  Crear nota
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      <main className="editor-panel">
        <header className="document-header">
          <button
            className="icon-button mobile-back"
            aria-label="Volver a las notas"
            onClick={() => setMobileEditor(false)}
          >
            <ArrowLeft size={18} />
          </button>
          <div
            className={`save-status ${saveStatus === "error" ? "save-error" : ""}`}
            role="status"
          >
            {saveStatus === "error" ? (
              <CircleAlert size={13} />
            ) : saveStatus === "saving" ? (
              <LoaderCircle size={13} className="animate-spin" />
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
              <button
                className="text-button"
                onClick={() => setRetry((value) => value + 1)}
              >
                Reintentar
              </button>
            )}
          </div>
          {selected && (
            <details
              className="note-actions"
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
                className="icon-button"
                aria-label="Opciones de la nota"
                title="Opciones de la nota"
              >
                <Ellipsis size={20} />
              </summary>
              <div className="actions-popover">
                <button
                  onClick={() => {
                    updateNote(selected.id, { favorite: !selected.favorite });
                    closeActions();
                  }}
                >
                  <Star size={15} />
                  {selected.favorite
                    ? "Quitar de favoritas"
                    : "Añadir a favoritas"}
                </button>
                <button
                  aria-label="Exportar nota como HTML"
                  onClick={() => {
                    exportNote();
                    closeActions();
                  }}
                >
                  <Download size={15} />
                  Exportar HTML
                </button>
                <button
                  className="delete-button"
                  onClick={() => {
                    closeActions();
                    setDeleteId(selected.id);
                  }}
                >
                  <Trash2 size={15} />
                  Eliminar nota
                </button>
              </div>
            </details>
          )}
        </header>
        {selected ? (
          <div className="document-scroll">
            <article className="document">
              <input
                key={`title-${selected.id}`}
                className="title-input"
                aria-label="Título de la nota"
                placeholder="Sin título"
                value={selected.title}
                onChange={(event) =>
                  updateNote(selected.id, { title: event.target.value })
                }
              />
              <Suspense
                fallback={<p className="editor-loading">Cargando editor…</p>}
              >
                <NoteEditor
                  key={selected.id}
                  note={selected}
                  onChange={(content) => updateNote(selected.id, { content })}
                />
              </Suspense>
            </article>
          </div>
        ) : (
          <div className="blank-editor">
            <button className="primary-button" onClick={addNote}>
              <Plus size={16} /> Nueva nota
            </button>
          </div>
        )}
      </main>

      {deleteId && (
        <div
          className="modal-overlay"
          onClick={() => {
            setDeleteId(null);
            actionsButtonRef.current?.focus();
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-heading"
            aria-describedby="delete-description"
            className="dialog"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setDeleteId(null);
                actionsButtonRef.current?.focus();
              }
              if (event.key === "Tab") {
                event.preventDefault();
                const buttons = event.currentTarget.querySelectorAll("button");
                (document.activeElement === buttons[0]
                  ? buttons[1]
                  : buttons[0]
                ).focus();
              }
            }}
          >
            <h2 id="delete-heading">¿Eliminar nota?</h2>
            <p id="delete-description">Esta acción no se puede deshacer.</p>
            <div className="dialog-actions">
              <button
                autoFocus
                className="secondary-button"
                onClick={() => {
                  setDeleteId(null);
                  actionsButtonRef.current?.focus();
                }}
              >
                Cancelar
              </button>
              <button className="danger-button" onClick={removeNote}>
                Eliminar nota
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
