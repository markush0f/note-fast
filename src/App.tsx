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
  ArrowUpRight,
  BookOpen,
  Check,
  CircleAlert,
  Download,
  FileText,
  Leaf,
  LoaderCircle,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  createNote,
  filterNotes,
  plainText,
  welcomeNote,
  wordCount,
  type Note,
} from "./lib/notes";
import { loadNotes, saveNotes, storageLabel } from "./lib/storage";

const NoteEditor = lazy(() => import("./components/NoteEditor"));
const dateFormat = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
});
const fullDate = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

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
  const selected = notes.find((note) => note.id === selectedId);
  const visible = filterNotes(notes, query, favorites);

  useEffect(() => {
    let cancelled = false;
    void loadNotes()
      .then((stored) => {
        if (cancelled) return;
        const initial = stored ?? [welcomeNote()];
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
        searchRef.current?.focus();
      }
      if (event.altKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        addNote();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [addNote]);

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
        <CircleAlert size={32} />
        <h1>No pudimos abrir tus notas</h1>
        <p>
          Comprueba el acceso al almacenamiento local. No se ha sobrescrito
          ningún dato.
        </p>
        <button
          className="primary-button"
          onClick={() => window.location.reload()}
        >
          Volver a intentar
        </button>
      </main>
    );
  if (!loaded)
    return (
      <main className="loading-screen">
        <LoaderCircle className="animate-spin" />
        <p>Abriendo tu cuaderno…</p>
      </main>
    );

  return (
    <div className={`app-shell ${mobileEditor ? "show-editor" : ""}`}>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            setFavorites(false);
            setQuery("");
            setMobileEditor(false);
          }}
          aria-label="ntbk, inicio"
        >
          <span className="brand-icon">
            <BookOpen size={21} />
          </span>
          <span>
            ntbk<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="workspace-label">TU ESPACIO PERSONAL</div>
        <button
          className="primary-button new-note"
          onClick={addNote}
          title="Nueva nota (Ctrl+Alt+N)"
        >
          <Plus size={18} /> Nueva nota <span>+</span>
        </button>
        <nav aria-label="Cuadernos">
          <button
            className={`nav-item ${!favorites ? "selected" : ""}`}
            onClick={() => {
              setFavorites(false);
              setMobileEditor(false);
            }}
          >
            <FileText size={18} />
            Todas las notas<span className="count">{notes.length}</span>
          </button>
          <button
            className={`nav-item ${favorites ? "selected" : ""}`}
            onClick={() => {
              setFavorites(true);
              setMobileEditor(false);
            }}
          >
            <Star size={18} />
            Favoritas
            <span className="count">
              {notes.filter((note) => note.favorite).length}
            </span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card">
            <span className="local-symbol">
              <ShieldCheck size={20} />
            </span>
            <strong>Tuyas, de verdad.</strong>
            <p>
              Tus ideas se quedan aquí.
              <br />
              Sin nube. Sin distracciones.
            </p>
            <span className="local-tag">
              <span /> Almacenamiento local
            </span>
          </div>
          <div className="sidebar-footer">
            <span>ntbk / v0.1.0</span>
            <Leaf size={14} />
          </div>
        </div>
      </aside>

      <section className="notes-panel" aria-label="Lista de notas">
        <header className="notes-heading">
          <div>
            <span className="eyebrow">TU COLECCIÓN</span>
            <h1>
              {favorites ? "Favoritas" : "Todas las notas"}
              <span>{visible.length}</span>
            </h1>
          </div>
          <button
            className="icon-button"
            title="Nueva nota"
            aria-label="Nueva nota"
            onClick={addNote}
          >
            <Plus size={20} />
          </button>
        </header>
        <div className="search-box">
          <Search size={16} />
          <input
            ref={searchRef}
            aria-label="Buscar notas"
            placeholder="Buscar una idea…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button
              className="icon-button"
              aria-label="Limpiar búsqueda"
              onClick={() => setQuery("")}
            >
              <X size={14} />
            </button>
          ) : (
            <kbd>⌘ K</kbd>
          )}
        </div>
        <div className="list-label">
          <span>ÚLTIMAS NOTAS</span>
          <span>Por edición ↓</span>
        </div>
        <div className="notes-list">
          {visible.map((note) => (
            <button
              key={note.id}
              className={`note-card ${selectedId === note.id ? "active" : ""}`}
              onClick={() => {
                setSelectedId(note.id);
                setMobileEditor(true);
              }}
            >
              <div className="note-card-title">
                <span>{note.title || "Sin título"}</span>
                {note.favorite && <Star size={13} fill="currentColor" />}
              </div>
              <p>
                {plainText(note.content) ||
                  "Una página en blanco, mil posibilidades."}
              </p>
              <div className="note-card-meta">
                <span>{dateFormat.format(new Date(note.updatedAt))}</span>
                <span>{wordCount(plainText(note.content))} palabras</span>
              </div>
            </button>
          ))}
          {!visible.length && (
            <div className="empty-list">
              <Search size={25} />
              <h2>
                {query
                  ? "No encontramos esa idea"
                  : favorites
                    ? "Tus imprescindibles, aquí"
                    : "Todo empieza con una nota"}
              </h2>
              <p>
                {query
                  ? "Prueba con otra palabra."
                  : favorites
                    ? "Marca una nota con la estrella para guardarla aquí."
                    : "Crea tu primera nota y dale espacio a tus ideas."}
              </p>
              {!query && !favorites && (
                <button className="text-button" onClick={addNote}>
                  Crear una nota <ArrowUpRight size={15} />
                </button>
              )}
            </div>
          )}
        </div>
        <footer className="notes-footer">
          <span className="status-dot" /> Un lugar para pensar con calma
        </footer>
      </section>

      <main className="editor-panel">
        <header className="document-header">
          <div className="document-breadcrumb">
            <button
              className="icon-button mobile-back"
              aria-label="Volver a las notas"
              onClick={() => setMobileEditor(false)}
            >
              <ArrowLeft size={18} />
            </button>
            <BookOpen size={15} />
            <span>Mi cuaderno</span>
            <span className="breadcrumb-slash">/</span>
            <span className="breadcrumb-title">
              {selected?.title ||
                (selected ? "Sin título" : "Tu próximo comienzo")}
            </span>
          </div>
          <div className="document-actions">
            {selected && (
              <>
                <button
                  className={`icon-button ${selected.favorite ? "favorite-active" : ""}`}
                  aria-label={
                    selected.favorite
                      ? "Quitar de favoritas"
                      : "Añadir a favoritas"
                  }
                  title="Favorita"
                  onClick={() =>
                    updateNote(selected.id, { favorite: !selected.favorite })
                  }
                >
                  <Star
                    size={18}
                    fill={selected.favorite ? "currentColor" : "none"}
                  />
                </button>
                <button
                  className="icon-button"
                  aria-label="Exportar nota como HTML"
                  title="Exportar como HTML"
                  onClick={exportNote}
                >
                  <Download size={18} />
                </button>
                <span className="action-divider" />
                <button
                  className="icon-button delete-button"
                  aria-label="Eliminar nota"
                  title="Eliminar nota"
                  onClick={() => setDeleteId(selected.id)}
                >
                  <Trash2 size={17} />
                </button>
              </>
            )}
          </div>
        </header>
        {selected ? (
          <div className="document-scroll">
            <article className="document">
              <div className="document-kicker">
                <span className="note-label">
                  <FileText size={12} /> NOTA PERSONAL
                </span>
                <span>{fullDate.format(new Date(selected.createdAt))}</span>
              </div>
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
              <div className="document-description">
                Un poco de espacio para lo que tienes en mente.
              </div>
              <Suspense
                fallback={
                  <p className="editor-loading">Preparando tu página…</p>
                }
              >
                <NoteEditor
                  key={selected.id}
                  note={selected}
                  onChange={(content) => updateNote(selected.id, { content })}
                />
              </Suspense>
              <div className="document-end">
                <span /> <Leaf size={15} /> <span />
              </div>
            </article>
          </div>
        ) : (
          <div className="blank-editor">
            <BookOpen size={40} strokeWidth={1} />
            <h2>Las ideas necesitan un lugar.</h2>
            <p>Elige una nota o empieza algo nuevo.</p>
            <button className="primary-button" onClick={addNote}>
              <Plus size={17} /> Nueva nota
            </button>
          </div>
        )}
        <footer className="editor-footer">
          <div
            className={`save-status ${saveStatus === "error" ? "save-error" : ""}`}
            role="status"
          >
            {saveStatus === "saved" ? (
              <Check size={14} />
            ) : saveStatus === "saving" ? (
              <LoaderCircle size={14} className="animate-spin" />
            ) : (
              <CircleAlert size={14} />
            )}
            <span>
              {saveStatus === "saved"
                ? "Todos los cambios guardados"
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
          <div className="editor-stats">
            <span>
              {selected ? wordCount(plainText(selected.content)) : 0} palabras
            </span>
            <span className="footer-divider" />
            <span>
              {storageLabel} <span className="status-dot" />
            </span>
          </div>
        </footer>
      </main>
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-heading"
            aria-describedby="delete-description"
            className="dialog"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") setDeleteId(null);
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
            <Trash2 size={25} />
            <h2 id="delete-heading">¿Eliminar esta nota?</h2>
            <p id="delete-description">
              Esta acción no se puede deshacer. Puedes exportarla antes para
              conservar una copia.
            </p>
            <div className="dialog-actions">
              <button
                autoFocus
                className="secondary-button"
                onClick={() => setDeleteId(null)}
              >
                Conservar nota
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
