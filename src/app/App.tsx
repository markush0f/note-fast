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
  ChatBubble,
  SidebarCollapse,
  SidebarExpand,
  Check,
  WarningCircle,
  Download,
  MoreHoriz,
  Refresh,
  Book,
  Palette,
  Plus,
  Search,
  Star,
  Trash,
  Xmark,
  Settings,
} from "../shared/ui/icons";
import { Button, iconButtonClass, MenuItems } from "../shared/ui/ui";
import { createNote, plainText, type Note } from "../features/workspace/model/notes";
import type { PageContext, PageProposal } from "../features/assistant/api/ai";
import { checkBlockContentSize } from '../features/editor/blocks/note-blocks';
import { printNote } from '../features/workspace/export/print-note';
import { hasImportedWorkspaceToCloud, loadWorkspace, markWorkspaceImportedToCloud, saveWorkspace } from "../infrastructure/storage/storage";
import { currentUser, signOut } from "../infrastructure/api/cloud";
import { OfflineNotebook, cachedUser, rememberUser, forgetUser, hasPendingSignout, finishSignout, type OfflineUser, type SyncStatus } from '../infrastructure/sync/offline-sync';
import { setAttachmentAccount } from '../infrastructure/storage/attachments';
import AuthScreen from "../features/auth/components/AuthScreen";
import { isTauri } from "@tauri-apps/api/core";
import {
  createNotebook,
  DEFAULT_NOTEBOOK_ID,
  DEFAULT_NOTEBOOK_NAME,
  deleteForever,
  emptyTrash,
  moveNote,
  purgeTrash,
  restoreNotebook,
  restoreNote,
  setItemIcon,
  trashNotebook,
  trashNote,
  type Notebook,
  type Workspace,
} from "../features/workspace/model/workspace";
import FileExplorer from "../features/workspace/components/FileExplorer";
import Dialog from "../shared/ui/Dialog";
import SettingsDialog from "../features/settings/components/SettingsDialog";
import TrashDialog from "../features/workspace/components/TrashDialog";
import ChatPanel from "../features/assistant/components/ChatPanel";
import EditorErrorBoundary from "../features/editor/components/EditorErrorBoundary";
import { downloadWorkspace } from "../features/workspace/export/backup";
import { applyTheme, getInitialTheme } from "../shared/theme/theme";
import IconPicker from "../features/workspace/icons/IconPicker";
import type { ItemTarget } from "../features/workspace/icons/item-icons";
import { DEFAULT_TOOLBAR_POSITION } from "../features/editor/toolbar/editor-layout";

const NoteEditor = lazy(() => import("../features/editor/components/NoteEditor"));
const NotebookCover = lazy(() => import('../features/workspace/components/NotebookCover'));

export default function App() {
  const notebookRef = useRef<OfflineNotebook | null>(null);
  const [workspace, setWorkspaceState] = useState<Workspace>({
    version: 4,
    notes: [],
    notebooks: [],
  });
  const setWorkspace = (action: Workspace | ((previous: Workspace) => Workspace)) => {
    if (notebookRef.current) notebookRef.current.update(action);
    else setWorkspaceState(action);
  };
  const notes = workspace.notes.filter((note) => !note.deletedAt);
  const notebooks = workspace.notebooks.filter((notebook) => !notebook.deletedAt);
  const trashedNotes = workspace.notes.filter((note) => note.deletedAt);
  const trashedNotebooks = workspace.notebooks.filter((notebook) => notebook.deletedAt);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [initialTheme] = useState(getInitialTheme);
  const theme = workspace.theme ?? initialTheme;
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [explorerSelection, setExplorerSelection] = useState<ItemTarget | null>(
    null,
  );
  const [notebookDialog, setNotebookDialog] = useState<{ id?: string; name: string } | null>(null);
  const [notebookError, setNotebookError] = useState('');
  const [iconTarget, setIconTarget] = useState<ItemTarget | null>(null);
  const [deleteNotebookId, setDeleteNotebookId] = useState<string | null>(null);
  const [moveId, setMoveId] = useState<string | null>(null);
  const [moveNotebookId, setMoveNotebookId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const desktop = isTauri();
  const [authState, setAuthState] = useState<"checking" | "signed-out" | "signed-in">(desktop ? "signed-in" : "checking");
  const [userEmail, setUserEmail] = useState('');
  const [user, setUser] = useState<OfflineUser | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saveStatus, setSaveStatus] = useState<SyncStatus>('saved');
  const [syncMessage, setSyncMessage] = useState('');
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState(false);
  const [mobileEditor, setMobileEditor] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const actionsRef = useRef<HTMLDetailsElement>(null);
  const actionsButtonRef = useRef<HTMLElement>(null);
  const selected = notes.find((note) => note.id === selectedId);
  const applyAssistantProposal = (proposal: PageProposal, source: PageContext): boolean => {
    const current = notes.find(note => note.id === source.id);
    if (!current || selectedId !== source.id || current.content !== source.sourceContent) return false;
    const html = proposal.content.split(/\n{2,}/).map(paragraph => `<p>${paragraph.split('\n').map(line => line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;')).join('<br>')}</p>`).join('');
    const content = proposal.action === 'replace' ? html : `${current.content}${html}`;
    updateNote(current.id, { content });
    return true;
  };
  const iconItem =
    iconTarget?.kind === "note"
      ? notes.find((note) => note.id === iconTarget.id)
      : notebooks.find((book) => book.id === iconTarget?.id);

  const openNotebookDialog = (notebook?: Notebook) => {
    setNotebookError('');
    setNotebookDialog({ id: notebook?.id, name: notebook?.name ?? '' });
  };
  const saveNotebook = () => {
    if (!notebookDialog) return;
    const name = notebookDialog.name.trim();
    if (!name) { setNotebookError('Escribe un nombre.'); return; }
    if (notebooks.some(book => book.id !== notebookDialog.id && book.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'))) { setNotebookError('Ya existe un cuaderno con ese nombre.'); return; }
    const book = notebookDialog.id ? { ...notebooks.find(item => item.id === notebookDialog.id)!, name } : createNotebook(name);
    setWorkspace(previous => ({ ...previous, notebooks: notebookDialog.id ? previous.notebooks.map(item => item.id === book.id ? book : item) : [...previous.notebooks, book] }));
    setActiveNotebookId(book.id);
    setExplorerSelection({ kind: 'notebook', id: book.id });
    setFavorites(false); setQuery(''); setSelectedId(null); setNotebookDialog(null);
  };

  useEffect(() => {
    if (desktop) return;
    let cancelled = false;
    void (async () => {
      try {
        if (await hasPendingSignout()) {
          if (navigator.onLine) { await signOut(); await finishSignout(); }
          if (!cancelled) setAuthState('signed-out');
          return;
        }
        const account = await currentUser();
        await rememberUser(account);
        if (!cancelled) { setUser(account); setUserEmail(account.email); setAuthState('signed-in'); }
      } catch (error) {
        const account = error instanceof Error && error.message === 'unauthorized' ? undefined : await cachedUser();
        if (!cancelled) {
          if (account) { setUser(account); setUserEmail(account.email); setAuthState('signed-in'); }
          else setAuthState('signed-out');
        }
      }
    })().catch(() => { if (!cancelled) setAuthState('signed-out'); });
    return () => { cancelled = true; };
  }, [desktop]);

  useEffect(() => {
    if (!desktop) return;
    let cancelled = false;
    setAttachmentAccount('local');
    void (async () => {
      try {
        const stored = await loadWorkspace();
        const initial = purgeTrash(stored ?? {
          version: 4,
          notes: [createNote(DEFAULT_NOTEBOOK_ID)],
          notebooks: [{ id: DEFAULT_NOTEBOOK_ID, name: DEFAULT_NOTEBOOK_NAME, description: '' }],
        });
        if (cancelled) return;
        setWorkspaceState(initial);
        setActiveNotebookId(initial.notebooks.find(book => !book.deletedAt)?.id ?? null);
        setLoaded(true);
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'No se pudo abrir el cuaderno.');
      }
    })();
    return () => { cancelled = true; setAttachmentAccount(null); };
  }, [desktop]);

  const desktopSave = useRef(0);
  useEffect(() => {
    if (!desktop || !loaded) return;
    const generation = ++desktopSave.current;
    setSaveStatus('saving');
    setSyncMessage('');
    void saveWorkspace(workspace).then(() => {
      if (generation === desktopSave.current) setSaveStatus('saved');
    }).catch((error: unknown) => {
      if (generation !== desktopSave.current) return;
      setSaveStatus('error');
      setSyncMessage(error instanceof Error ? error.message : 'No se pudo guardar el cuaderno.');
    });
  }, [desktop, loaded, workspace]);

  useEffect(() => {
    if (authState !== 'signed-in' || !user || desktop) return;
    let cancelled = false;
    let notebook: OfflineNotebook | undefined;
    const timer = setTimeout(() => {
      void (async () => {
        setLoadError('');
        notebook = await OfflineNotebook.open(user, async () => {
          const local = !(await hasImportedWorkspaceToCloud()) ? await loadWorkspace() : undefined;
          await markWorkspaceImportedToCloud();
          return local ?? { version: 4, notes: [createNote(DEFAULT_NOTEBOOK_ID)], notebooks: [{ id: DEFAULT_NOTEBOOK_ID, name: DEFAULT_NOTEBOOK_NAME, description: '' }] };
        }, value => { if (!cancelled) setWorkspaceState(value); }, (status, message) => {
          if (!cancelled) { setSaveStatus(status); setSyncMessage(message ?? ''); }
        });
        if (cancelled) { notebook.stop(); return; }
        notebookRef.current = notebook;
        setAttachmentAccount(user.id);
        const initial = purgeTrash(notebook.workspace);
        setWorkspaceState(initial);
        setSelectedId(null);
        setExplorerSelection(null);
        setActiveNotebookId(initial.notebooks.find(book => !book.deletedAt)?.id ?? null);
        setLoaded(true);
        notebook.update(initial);
      })().catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'No se pudo abrir el cuaderno.');
      });
    }, 0);
    return () => { cancelled = true; clearTimeout(timer); notebook?.stop(); notebookRef.current = null; setAttachmentAccount(null); };
  }, [authState, user]);

  useEffect(() => {
    if (!loaded) return;
    const sync = () => { void notebookRef.current?.sync(); };
    const offline = () => setSaveStatus(previous => previous === 'saving' || previous === 'error' ? previous : 'offline');
    const warn = (event: BeforeUnloadEvent) => {
      if (saveStatus === 'saving' || saveStatus === 'error') { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('online', sync);
    window.addEventListener('offline', offline);
    window.addEventListener('beforeunload', warn);
    const timer = setInterval(sync, 30_000);
    return () => { clearInterval(timer); window.removeEventListener('online', sync); window.removeEventListener('offline', offline); window.removeEventListener('beforeunload', warn); };
  }, [loaded, saveStatus]);

  useEffect(() => {
    if (loaded) applyTheme(theme);
  }, [loaded, theme]);

  const addNote = useCallback(
    (notebookId: string = activeNotebookId ?? notebooks[0]?.id ?? DEFAULT_NOTEBOOK_ID) => {
      if (!loaded) return;
      const note = createNote(notebookId);
      setWorkspace((previous) => ({
        ...previous,
        notes: [note, ...previous.notes],
      }));
      setActiveNotebookId(notebookId);
      setSelectedId(note.id);
      setExplorerSelection({ kind: "note", id: note.id });
      setFavorites(false);
      setQuery("");
      setMobileEditor(true);
    },
    [loaded, activeNotebookId, notebooks],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
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

  const relocateNote = (noteId: string, notebookId: string) => {
    setWorkspace(previous => moveNote(previous, noteId, notebookId));
    if (noteId === selectedId) setActiveNotebookId(notebookId);
  };

  const removeItem = () => {
    const next = deleteNotebookId ? trashNotebook(workspace, deleteNotebookId) : trashNote(workspace, deleteId ?? '');
    const visible = next.notes.filter(note => !note.deletedAt);
    const visibleNotebooks = next.notebooks.filter(book => !book.deletedAt);
    setWorkspace(next);
    if (!visible.some(note => note.id === selectedId)) { setSelectedId(null); setMobileEditor(false); }
    if (!visibleNotebooks.some(book => book.id === activeNotebookId)) setActiveNotebookId(visibleNotebooks[0]?.id ?? null);
    if (explorerSelection && !(explorerSelection.kind === 'note' ? visible : visibleNotebooks).some(item => item.id === explorerSelection.id)) {
      setExplorerSelection(null);
      setSelectedId(null);
    }
    setDeleteId(null);
    setDeleteNotebookId(null);
  };

  const exportNote = async () => {
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
    let content: string;
    try {
      const { exportNoteHTML } = await import('../features/workspace/export/block-export');
      content = await exportNoteHTML(selected.content);
    }
    catch (error) { window.alert(error instanceof Error ? error.message : 'No se pudo exportar la nota.'); return; }
    const blob = new Blob(
      [
        `<!doctype html><html lang="es"><meta charset="utf-8"><title>${escape(title)}</title><body><h1>${escape(title)}</h1>${content}</body></html>`,
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

  if (authState === "checking")
    return <main className="grid min-h-dvh place-items-center text-muted" role="status">Comprobando sesión…</main>;
  if (authState === "signed-out")
    return <AuthScreen onAuthenticated={() => {
      void currentUser().then(async (account) => {
        await rememberUser(account);
        setUser(account); setUserEmail(account.email); setLoaded(false); setAuthState('signed-in');
      }).catch(() => window.alert('No se pudo abrir la sesión. Reintenta.'));
    }} />;

  if (loadError)
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center text-muted">
        <WarningCircle size={24} />
        <h1 className="text-lg text-ink">No pudimos abrir tu cuaderno</h1>
        <p className="max-w-100 text-[13px]">
          {loadError} Tus datos no se han sobrescrito.
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
        aria-label="Abriendo cuaderno"
      >
        <Refresh className="animate-spin motion-reduce:animate-none" />
      </main>
    );

  return (
    <div className={`app-shell h-dvh overflow-hidden ${sidebarVisible ? "sidebar-expanded" : "sidebar-collapsed"} ${chatOpen ? "chat-open" : ""}`}>
      <aside
        className={`app-sidebar ${mobileEditor ? "hidden min-[651px]:flex" : "flex"} min-h-0 flex-col border-line bg-sidebar min-[651px]:border-r`}
        aria-label="Cuaderno"
      >
        <header className="flex items-center justify-between px-5 pt-6 pb-4">
          <h1 className="text-[15px] font-semibold">Cuadernos</h1>
          <div className="flex items-center gap-1">
            <Button
              variant="icon"
              title="Nuevo cuaderno"
              aria-label="Nuevo cuaderno"
              onClick={() => openNotebookDialog()}
            >
              <Book size={18} />
            </Button>
            <Button
              variant="icon"
              title="Nueva página (Ctrl+Alt+N)"
              aria-label="Nueva página"
              onClick={() => addNote(activeNotebookId ?? undefined)}
            >
              <Plus size={19} />
            </Button>
            <Button
              variant="icon"
              className="hidden min-[651px]:inline-flex"
              title="Ocultar barra lateral"
              aria-label="Ocultar barra lateral"
              aria-expanded={sidebarVisible}
              onClick={() => setSidebarVisible(false)}
            >
              <SidebarCollapse size={18} />
            </Button>
          </div>
        </header>
        <div className="flex items-center gap-1.5 px-4 pb-4.5">
          <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded border border-line px-2 text-faint focus-within:border-strong">
            <Search size={15} />
            <input
              ref={searchRef}
              className="min-w-0 w-full bg-transparent text-xs text-ink outline-none placeholder:text-muted"
              aria-label="Buscar en el cuaderno"
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
          notebooks={notebooks}
          selection={explorerSelection}
          activeNotebookId={activeNotebookId}
          query={query}
          favorites={favorites}
          onSelect={note => { setExplorerSelection({ kind: 'note', id: note.id }); setSelectedId(note.id); setActiveNotebookId(note.notebookId); setMobileEditor(true); }}
          onSelectNotebook={id => { setSelectedId(null); setActiveNotebookId(id); setExplorerSelection({ kind: 'notebook', id }); setMobileEditor(true); }}
          onMoveNote={relocateNote}
          onNewNote={addNote}
          onNewNotebook={() => openNotebookDialog()}
          onRenameNotebook={openNotebookDialog}
          onChangeNotebookIcon={book => setIconTarget({ kind: 'notebook', id: book.id })}
          onDeleteNotebook={book => setDeleteNotebookId(book.id)}
        />
        <div className="shrink-0 border-t border-line p-2.5">
          {!desktop && <Button variant="menu" aria-expanded={chatOpen} aria-controls={chatOpen ? 'notebook-chat' : undefined} onClick={() => setChatOpen(value => !value)}>
            <ChatBubble size={16} />
            Asistente
          </Button>}
          <Button variant="menu" onClick={() => setTrashOpen(true)}>
            <Trash size={16} />
            Papelera
            {trashedNotes.length + trashedNotebooks.length > 0 && (
              <span className="text-[11px] text-muted">
                {trashedNotes.length + trashedNotebooks.length}
              </span>
            )}
          </Button>
          <Button variant="menu" onClick={() => setSettingsOpen(true)}>
            <Settings size={16} />
            Ajustes
          </Button>
          {!desktop && <p className="truncate px-2 py-1 text-[11px] text-muted" title={userEmail}>{userEmail}</p>}
          {!desktop && <Button variant="menu" onClick={() => {
            if (notebookRef.current?.pending && !window.confirm('Hay cambios pendientes de sincronizar. Se conservarán en este dispositivo para cuando vuelvas a entrar con esta cuenta. ¿Cerrar sesión?')) return;
            void (async () => {
              try {
                await notebookRef.current?.flush();
                if (navigator.onLine) await signOut();
                await forgetUser(!navigator.onLine);
                notebookRef.current?.stop();
                setLoaded(false); setUser(null); setAuthState('signed-out');
              } catch { window.alert('No se pudo cerrar sesión. Reintenta.'); }
            })();
          }}>Cerrar sesión</Button>}
        </div>
      </aside>

      <main
        className={`${mobileEditor ? "flex" : "hidden min-[651px]:flex"} min-h-0 min-w-0 flex-col`}
      >
        <header className="flex min-h-14.5 shrink-0 items-center gap-2.5 px-3.5 min-[651px]:min-h-16 min-[651px]:px-5.5 min-[901px]:px-7">
          {!sidebarVisible && <Button
            variant="icon"
            className="hidden min-[651px]:inline-flex"
            aria-label="Mostrar barra lateral"
            title="Mostrar barra lateral"
            aria-expanded={false}
            onClick={() => setSidebarVisible(true)}
          ><SidebarExpand size={18} /></Button>}
          <Button
            variant="icon"
            className="min-[651px]:hidden"
            aria-label="Volver al cuaderno"
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
            ) : saveStatus === 'saving' || saveStatus === 'syncing' ? (
              <Refresh
                size={13}
                className="animate-spin motion-reduce:animate-none"
              />
            ) : (
              <Check size={13} />
            )}
            <span>
              {desktop
                ? saveStatus === 'saving'
                  ? 'Guardando…'
                  : saveStatus === 'error'
                    ? 'No se pudo guardar'
                    : 'Guardado en este equipo'
                : saveStatus === "saved"
                  ? 'Sincronizado'
                  : saveStatus === 'saving'
                    ? 'Guardando en este dispositivo…'
                    : saveStatus === 'syncing'
                      ? 'Sincronizando…'
                      : saveStatus === 'offline'
                        ? 'Sin conexión · guardado local'
                        : 'Pendiente de sincronizar'}
            </span>
            {saveStatus === "error" && (
              <Button
                variant="text"
                className="ml-1"
                onClick={() => {
                  if (desktop) {
                    const generation = ++desktopSave.current;
                    setSaveStatus('saving');
                    void saveWorkspace(workspace).then(() => {
                      if (generation === desktopSave.current) setSaveStatus('saved');
                    }).catch(() => {
                      if (generation === desktopSave.current) setSaveStatus('error');
                    });
                  } else notebookRef.current?.retry();
                }}
              >
                Reintentar
              </Button>
            )}
          </div>
          {syncMessage && <span className="max-w-72 truncate text-[11px] text-danger" title={syncMessage} role="alert">{syncMessage}</span>}
          {desktop && <span className="ml-auto" />}
          {!desktop && <Button
            variant="icon"
            className="ml-auto"
            aria-label={chatOpen ? 'Ocultar chat' : 'Mostrar chat'}
            title={chatOpen ? 'Ocultar chat' : 'Mostrar chat'}
            aria-expanded={chatOpen}
            aria-controls={chatOpen ? 'notebook-chat' : undefined}
            onClick={() => setChatOpen(value => !value)}
          >
            <ChatBubble size={18} />
          </Button>}
          {selected && (
            <details
              className="relative"
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
                    setMoveNotebookId(selected.notebookId);
                  }}
                >
                  <Book size={15} />
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
                  variant="menu"
                  aria-label="Exportar nota como PDF"
                  onClick={() => {
                    void printNote(selected.title, selected.content).catch((error: unknown) => {
                      window.alert(error instanceof Error ? error.message : 'No se pudo exportar la nota como PDF.');
                    });
                    closeActions();
                  }}
                >
                  <Download size={15} />
                  Exportar PDF
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
          <EditorErrorBoundary key={selected.id}><Suspense
            fallback={
              <p className="flex-1 p-6 text-[13px] text-muted">
                Cargando editor…
              </p>
            }
          >
            <NoteEditor
              key={selected.id}
              note={selected}
              checkBlockContent={(content) => checkBlockContentSize(workspace, selected.id, content)}
              onChange={(content) => updateNote(selected.id, { content })}
              onTitleChange={(title) => updateNote(selected.id, { title })}
              toolbarPosition={
                workspace.toolbarPosition ?? DEFAULT_TOOLBAR_POSITION
              }
              onToolbarPositionChange={(toolbarPosition) =>
                setWorkspace((previous) => ({ ...previous, toolbarPosition }))
              }
              notes={notes}
              onOpenNote={(id) => {
                const target = notes.find((item) => item.id === id);
                if (!target) return;
                setSelectedId(target.id);
                setActiveNotebookId(target.notebookId);
                setExplorerSelection({ kind: "note", id: target.id });
                setFavorites(false);
                setQuery("");
                setMobileEditor(true);
              }}
            />
          </Suspense></EditorErrorBoundary>
        ) : activeNotebookId && notebooks.some(book => book.id === activeNotebookId) ? (
          <Suspense fallback={<p className="grid flex-1 place-content-center text-sm text-muted">Abriendo cuaderno…</p>}>
            <NotebookCover
              notebook={notebooks.find(book => book.id === activeNotebookId)!}
              notes={notes.filter(note => note.notebookId === activeNotebookId)}
              onChange={changes => setWorkspace(previous => ({ ...previous, notebooks: previous.notebooks.map(book => book.id === activeNotebookId ? { ...book, ...changes } : book) }))}
              onOpenNote={note => { setSelectedId(note.id); setActiveNotebookId(note.notebookId); setExplorerSelection({ kind: 'note', id: note.id }); setMobileEditor(true); }}
              onNewNote={() => addNote(activeNotebookId)}
            />
          </Suspense>
        ) : (
          <div className="grid flex-1 place-content-center gap-3 p-6 text-center">
            <p className="text-sm text-muted">Crea un cuaderno para organizar tus páginas.</p>
            <Button variant="primary" onClick={() => openNotebookDialog()}><Book size={16} /> Nuevo cuaderno</Button>
          </div>
        )}
      </main>

      {!desktop && <ChatPanel
        key={user?.id ?? 'signed-out'}
        userId={user?.id ?? ''}
        page={selected ? { id: selected.id, title: selected.title, content: plainText(selected.content).slice(0, 16000), sourceContent: selected.content } : undefined}
        onApplyProposal={applyAssistantProposal}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
      />}

      {trashOpen && (
        <TrashDialog
          notes={trashedNotes}
          notebooks={trashedNotebooks}
          onClose={() => setTrashOpen(false)}
          onRestoreNote={(id) => {
            const next = restoreNote(workspace, id);
            const note = next.notes.find((item) => item.id === id);
            setWorkspace(next);
            if (note) {
              setSelectedId(note.id);
              setActiveNotebookId(note.notebookId);
              setExplorerSelection({ kind: "note", id: note.id });
              setMobileEditor(true);
            }
            setTrashOpen(false);
          }}
          onRestoreNotebook={id => {
            setWorkspace(restoreNotebook(workspace, id));
            setActiveNotebookId(id);
            setExplorerSelection({ kind: 'notebook', id });
            setTrashOpen(false);
          }}
          onDeleteNote={(id) =>
            setWorkspace(deleteForever(workspace, { kind: "note", id }))
          }
          onDeleteNotebook={id => setWorkspace(deleteForever(workspace, { kind: 'notebook', id }))}
          onEmpty={() => setWorkspace(emptyTrash(workspace))}
        />
      )}
      {settingsOpen && (
        <SettingsDialog
          theme={theme}
          onClose={() => setSettingsOpen(false)}
          onThemeChange={(theme) =>
            setWorkspace((previous) => ({ ...previous, theme }))
          }
          onExport={() => downloadWorkspace(workspace)}
          onImport={(imported) => {
            setWorkspace(imported);
            setSelectedId(null);
            setExplorerSelection(null);
            setActiveNotebookId(imported.notebooks.find(book => !book.deletedAt)?.id ?? null);
            setQuery("");
            setFavorites(false);
            setMobileEditor(false);
            setSettingsOpen(false);
          }}
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
        <Dialog title="Mover página" onClose={() => setMoveId(null)}>
          <form onSubmit={event => { event.preventDefault(); if (moveNotebookId) relocateNote(moveId, moveNotebookId); setMoveId(null); }}>
            <label className="mt-4 mb-2 block text-xs text-muted" htmlFor="move-notebook">Cuaderno de destino</label>
            <select id="move-notebook" className="w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-strong" value={moveNotebookId ?? ''} onChange={event => setMoveNotebookId(event.target.value)}>
              {notebooks.map(book => <option key={book.id} value={book.id}>{book.name}</option>)}
            </select>
            <div className="mt-6 flex justify-end gap-2"><Button onClick={() => setMoveId(null)}>Cancelar</Button><Button variant="primary" type="submit">Mover</Button></div>
          </form>
        </Dialog>
      )}
      {notebookDialog && (
        <Dialog title={notebookDialog.id ? 'Renombrar cuaderno' : 'Nuevo cuaderno'} onClose={() => setNotebookDialog(null)}>
          <form onSubmit={event => { event.preventDefault(); saveNotebook(); }}>
            <label className="mb-2 mt-4 block text-xs text-muted" htmlFor="notebook-name">Nombre</label>
            <input id="notebook-name" className="w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-strong aria-invalid:border-danger" value={notebookDialog.name} maxLength={120} aria-invalid={Boolean(notebookError)} aria-describedby={notebookError ? 'notebook-error' : undefined} onChange={event => { setNotebookError(''); setNotebookDialog({ ...notebookDialog, name: event.target.value }); }} />
            {notebookError && <p id="notebook-error" className="mt-2 text-xs text-danger" role="alert">{notebookError}</p>}
            <div className="mt-6 flex justify-end gap-2"><Button onClick={() => setNotebookDialog(null)}>Cancelar</Button><Button variant="primary" type="submit">{notebookDialog.id ? 'Guardar' : 'Crear cuaderno'}</Button></div>
          </form>
        </Dialog>
      )}
      {(deleteId || deleteNotebookId) && (
        <Dialog title={deleteNotebookId ? '¿Eliminar cuaderno?' : '¿Eliminar página?'} description={deleteNotebookId ? 'El cuaderno y sus páginas irán a la papelera durante 30 días.' : 'La página irá a la papelera durante 30 días.'} onClose={() => { setDeleteId(null); setDeleteNotebookId(null); }}>
          <div className="mt-6 flex justify-end gap-2"><Button onClick={() => { setDeleteId(null); setDeleteNotebookId(null); }}>Cancelar</Button><Button variant="danger" onClick={removeItem}>{deleteNotebookId ? 'Eliminar cuaderno' : 'Eliminar página'}</Button></div>
        </Dialog>
      )}
    </div>
  );
}
