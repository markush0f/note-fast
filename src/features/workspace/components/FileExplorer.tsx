import { useState, type DragEvent } from 'react';
import { MoreHoriz, Palette, EditPencil, Plus, Star, Trash, Book } from '../../../shared/ui/icons';
import { Button, iconButtonClass, MenuItems } from '../../../shared/ui/ui';
import { filterNotes, plainText, type Note } from '../model/notes';
import type { Notebook } from '../model/workspace';
import ItemIcon from '../icons/ItemIcon';
import type { ItemTarget } from '../icons/item-icons';

const NOTE_DRAG_TYPE = 'application/x-ntbk-note';
interface Props {
  notes: Note[];
  notebooks: Notebook[];
  selection: ItemTarget | null;
  activeNotebookId: string | null;
  query: string;
  favorites: boolean;
  onSelect: (note: Note) => void;
  onSelectNotebook: (id: string) => void;
  onNewNote: (notebookId: string) => void;
  onNewNotebook: () => void;
  onRenameNotebook: (notebook: Notebook) => void;
  onChangeNotebookIcon: (notebook: Notebook) => void;
  onDeleteNotebook: (notebook: Notebook) => void;
  onMoveNote: (noteId: string, notebookId: string) => void;
}
export default function FileExplorer(props: Props) {
  const { notes, notebooks, selection, activeNotebookId, query, favorites } = props;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(activeNotebookId ? [activeNotebookId] : []));
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const filtering = Boolean(query.trim() || favorites);
  const resetDrag = () => { setDraggedId(null); setDropTarget(null); };
  const noteRows = (values: Note[], showNotebook = false) => values.map(note => <li key={note.id}>
    <button draggable className={`mb-0.5 block w-full cursor-grab rounded px-2.5 py-1.5 text-left hover:bg-hover active:cursor-grabbing aria-[current=true]:bg-selection ${draggedId === note.id ? 'opacity-40' : ''}`} aria-label={`Abrir ${note.title || 'Sin título'}`} aria-current={selection?.kind === 'note' && selection.id === note.id ? 'true' : undefined} title={`${note.title || 'Sin título'}\n${plainText(note.content) || 'Página vacía'}`} onClick={() => props.onSelect(note)} onDragStart={event => { event.dataTransfer.setData(NOTE_DRAG_TYPE, note.id); event.dataTransfer.effectAllowed = 'move'; setDraggedId(note.id); setAnnouncement('Suelta la página sobre otro cuaderno para moverla.'); }} onDragEnd={resetDrag}>
      <span className="flex items-center gap-2 text-xs leading-5"><ItemIcon icon={note.icon} kind="note" size={13} className="shrink-0 text-muted" /><span className="min-w-0 flex-1 truncate">{note.title || 'Sin título'}</span>{note.favorite && <Star size={11} className="shrink-0 text-muted" fill="currentColor" />}</span>
      {showNotebook && <span className="block truncate pl-5 text-[10px] leading-4 text-muted">{notebooks.find(book => book.id === note.notebookId)?.name ?? 'Cuaderno'}</span>}
    </button>
  </li>);
  const destinations = (notebookId: string) => ({
    onDragOver: (event: DragEvent<HTMLElement>) => {
      const note = notes.find(item => item.id === draggedId);
      if (!note || note.notebookId === notebookId || !event.dataTransfer.types.includes(NOTE_DRAG_TYPE)) { event.dataTransfer.dropEffect = 'none'; return; }
      event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; setDropTarget(notebookId);
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDropTarget(current => current === notebookId ? null : current); },
    onDrop: (event: DragEvent<HTMLElement>) => {
      const note = notes.find(item => item.id === draggedId);
      if (!note || note.notebookId === notebookId || !event.dataTransfer.types.includes(NOTE_DRAG_TYPE)) return;
      event.preventDefault(); event.stopPropagation();
      const id = event.dataTransfer.getData(NOTE_DRAG_TYPE);
      if (id === draggedId) { props.onMoveNote(id, notebookId); setAnnouncement(`Página movida a ${notebooks.find(book => book.id === notebookId)?.name}.`); }
      resetDrag();
    },
  });
  return <div className="min-h-0 flex-1 overflow-auto px-2.5 pb-4 [scrollbar-width:thin]">
    <p role="status" className="sr-only">{announcement}</p>
    {filtering ? <div><ul className="list-none">{noteRows(filterNotes(notes, query, favorites), true)}</ul>{!filterNotes(notes, query, favorites).length && <p className="px-3 py-9 text-center text-xs text-muted">{query ? 'Sin resultados' : 'No hay favoritas'}</p>}</div> : <ul className="list-none">
      {notebooks.map(book => {
        const pages = filterNotes(notes.filter(note => note.notebookId === book.id), '', false);
        const isExpanded = expanded.has(book.id);
        const current = selection?.kind === 'notebook' && selection.id === book.id;
        return <li key={book.id}>
          <div {...destinations(book.id)} data-drop-target={dropTarget === book.id ? 'true' : undefined} className={`mb-0.5 flex items-center rounded ${dropTarget === book.id ? 'bg-selection ring-1 ring-inset ring-strong' : current ? 'bg-selection' : 'hover:bg-hover'}`}>
            <button type="button" className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded px-2 py-2 text-left text-xs font-semibold text-secondary" aria-label={`Abrir cuaderno ${book.name}`} aria-current={current ? 'true' : undefined} onClick={() => { props.onSelectNotebook(book.id); setExpanded(previous => new Set([...previous, book.id])); }}>
              <Book size={16} className="shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate">{book.name}</span>
            </button>
            <button type="button" className="flex size-7 shrink-0 items-center justify-center rounded text-muted hover:bg-hover" aria-label={`${isExpanded ? 'Contraer' : 'Expandir'} ${book.name}`} aria-expanded={isExpanded} onClick={() => setExpanded(previous => { const next = new Set(previous); if (next.has(book.id)) next.delete(book.id); else next.add(book.id); return next; })}>{isExpanded ? '−' : '+'}</button>
            <details className="relative shrink-0"><summary className={`${iconButtonClass} list-none [&::-webkit-details-marker]:hidden`} aria-label={`Opciones de ${book.name}`}><MoreHoriz size={16} /></summary><MenuItems><Button variant="menu" onClick={() => props.onNewNote(book.id)}><Plus size={15} />Nueva página</Button><Button variant="menu" onClick={() => props.onRenameNotebook(book)}><EditPencil size={15} />Renombrar cuaderno</Button><Button variant="menu" onClick={() => props.onChangeNotebookIcon(book)}><Palette size={15} />Cambiar icono</Button><Button variant="menuDanger" onClick={() => props.onDeleteNotebook(book)}><Trash size={15} />Eliminar cuaderno</Button></MenuItems></details>
          </div>
          {isExpanded && <ul className="ml-3 list-none border-l border-line pl-2">{noteRows(pages)}<li><button type="button" className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-muted hover:text-ink" onClick={() => props.onNewNote(book.id)}><Plus size={13} />Página</button></li></ul>}
        </li>;
      })}
      {!notebooks.length && <li className="px-3 py-8 text-center text-xs text-muted">Crea un cuaderno para empezar.</li>}
    </ul>}
    {filtering && draggedId !== null && <div className="mt-3" aria-label="Cuadernos de destino"><p className="px-2 pb-1 text-[10px] text-muted">Mover a otro cuaderno</p>{notebooks.map(book => <button key={book.id} {...destinations(book.id)} type="button" className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs hover:bg-hover" onClick={() => { props.onMoveNote(draggedId, book.id); resetDrag(); }}><Book size={15} />{book.name}</button>)}</div>}
  </div>;
}
