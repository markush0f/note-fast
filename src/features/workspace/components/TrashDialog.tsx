import { noteTitle } from '../../editor/links/note-links';
import { TRASH_DAYS, type Notebook } from '../model/workspace';
import type { Note } from '../model/notes';
import Dialog from '../../../shared/ui/Dialog';
import { Button } from '../../../shared/ui/ui';
interface Props { notes: Note[]; notebooks: Notebook[]; onRestoreNote: (id: string) => void; onRestoreNotebook: (id: string) => void; onDeleteNote: (id: string) => void; onDeleteNotebook: (id: string) => void; onEmpty: () => void; onClose: () => void; }
function remaining(date: string) { const days = Math.max(1, Math.ceil((Date.parse(date) + TRASH_DAYS * 86400000 - Date.now()) / 86400000)); return days === 1 ? '1 día' : `${days} días`; }
export default function TrashDialog({ notes, notebooks, onRestoreNote, onRestoreNotebook, onDeleteNote, onDeleteNotebook, onEmpty, onClose }: Props) {
  const items = [...notebooks.map(book => ({ id: book.id, kind: 'notebook' as const, label: book.name, deletedAt: book.deletedAt ?? '' })), ...notes.map(note => ({ id: note.id, kind: 'note' as const, label: noteTitle(note.title), deletedAt: note.deletedAt ?? '' }))].sort((a,b) => b.deletedAt.localeCompare(a.deletedAt));
  return <Dialog title="Papelera" description={`Los elementos se eliminan de forma definitiva a los ${TRASH_DAYS} días.`} onClose={onClose}>
    {!items.length ? <p className="mt-4 text-sm text-muted">La papelera está vacía.</p> : <ul className="mt-4 max-h-80 space-y-1 overflow-y-auto">{items.map(item => <li key={`${item.kind}-${item.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5"><span className="min-w-0 flex-1"><span className="block truncate text-sm text-ink">{item.label}</span><span className="text-[11px] text-muted">{item.kind === 'notebook' ? 'Cuaderno' : 'Página'} · {remaining(item.deletedAt)}</span></span><Button variant="text" onClick={() => item.kind === 'notebook' ? onRestoreNotebook(item.id) : onRestoreNote(item.id)}>Restaurar</Button><Button variant="text" className="text-danger" onClick={() => item.kind === 'notebook' ? onDeleteNotebook(item.id) : onDeleteNote(item.id)}>Borrar</Button></li>)}</ul>}
    <div className="mt-6 flex justify-end gap-2"><Button onClick={onClose}>Cerrar</Button><Button variant="danger" disabled={!items.length} onClick={onEmpty}>Vaciar papelera</Button></div>
  </Dialog>;
}
