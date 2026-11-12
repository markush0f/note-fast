import { useState } from 'react';
import type { Folder, Workspace } from '../lib/workspace';
import type { Note } from '../lib/notes';
import { folderPath } from '../lib/workspace';
import ItemIcon from './ItemIcon';
import IconPicker from './IconPicker';
import { Book, Calendar, EditPencil, Folder as FolderIcon, Plus, Star } from './icons';
import { Button } from './ui';

interface Props {
  workspace: Workspace;
  notes: Note[];
  folders: Folder[];
  onChange: (changes: Pick<Workspace, 'title' | 'description' | 'coverIcon'>) => void;
  onOpenNote: (note: Note) => void;
  onOpenFolder: (folder: Folder) => void;
  onNewNote: () => void;
}

export default function NotebookCover({ workspace, notes, folders, onChange, onOpenNote, onOpenFolder, onNewNote }: Props) {
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const pages = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const favorites = pages.filter(note => note.favorite).slice(0, 4);
  const recent = pages.slice(0, 4);
  const roots = folders.filter(folder => folder.parentId === null);
  return <main className="min-h-0 flex-1 overflow-y-auto bg-surface" aria-label="Portada del cuaderno">
    <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10 sm:py-14 lg:px-16">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-sidebar px-7 py-9 sm:px-12 sm:py-12">
        <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-selection/70 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center sm:gap-10">
          <button type="button" className="group flex size-24 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-surface text-primary shadow-sm ring-1 ring-line transition-transform hover:-rotate-3 hover:scale-105 focus-visible:outline-2 focus-visible:outline-strong sm:size-32" aria-label="Cambiar icono del cuaderno" title="Cambiar icono del cuaderno" onClick={() => setIconPickerOpen(true)}>
            {workspace.coverIcon ? <ItemIcon icon={workspace.coverIcon} kind="note" size={56} /> : <Book size={58} />}
            <span className="sr-only">Cambiar icono</span>
          </button>
          <div className="relative min-w-0 flex-1">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Tu espacio de ideas</p>
            <input aria-label="Nombre del cuaderno" value={workspace.title ?? ''} maxLength={120} placeholder="Mi cuaderno" onChange={event => onChange({ title: event.target.value })} className="w-full bg-transparent text-3xl font-semibold tracking-tight text-ink outline-none placeholder:text-faint sm:text-4xl" />
            <textarea aria-label="Descripción del cuaderno" value={workspace.description ?? ''} maxLength={500} placeholder="Un lugar para tus ideas, proyectos y descubrimientos…" rows={2} onChange={event => onChange({ description: event.target.value })} className="mt-3 w-full resize-none bg-transparent text-sm leading-6 text-secondary outline-none placeholder:text-muted sm:text-base" />
            <Button variant="primary" onClick={onNewNote}><Plus size={16} /> Nueva página</Button>
          </div>
        </div>
        <div className="relative mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-5 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><EditPencil size={14} />{pages.length} {pages.length === 1 ? 'página' : 'páginas'}</span>
          <span className="inline-flex items-center gap-1.5"><FolderIcon size={14} />{folders.length} {folders.length === 1 ? 'carpeta' : 'carpetas'}</span>
          {pages.some(page => page.favorite) && <span className="inline-flex items-center gap-1.5"><Star size={14} />{pages.filter(page => page.favorite).length} favoritas</span>}
        </div>
      </section>

      {favorites.length > 0 && <section className="mt-10" aria-labelledby="cover-favorites">
        <div className="mb-4 flex items-center gap-2"><Star size={16} className="text-muted" /><h2 id="cover-favorites" className="text-sm font-semibold text-ink">Favoritas</h2></div>
        <div className="grid gap-3 sm:grid-cols-2">
          {favorites.map(note => <button key={note.id} type="button" onClick={() => onOpenNote(note)} className="flex min-h-16 items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-strong"><ItemIcon icon={note.icon} kind="note" size={20} className="shrink-0 text-muted" /><span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{note.title || 'Sin título'}</span><Star size={14} className="text-muted" /></button>)}
        </div>
      </section>}

      <section className="mt-10" aria-labelledby="cover-recent">
        <div className="mb-4 flex items-center gap-2"><Calendar size={16} className="text-muted" /><h2 id="cover-recent" className="text-sm font-semibold text-ink">Abiertas recientemente</h2></div>
        {recent.length ? <div className="divide-y divide-line rounded-xl border border-line bg-surface px-4">
          {recent.map(note => <button key={note.id} type="button" onClick={() => onOpenNote(note)} className="flex w-full items-center gap-3 py-3.5 text-left focus-visible:outline-2 focus-visible:outline-strong"><ItemIcon icon={note.icon} kind="note" size={18} className="shrink-0 text-muted" /><span className="min-w-0 flex-1 truncate text-sm text-ink">{note.title || 'Sin título'}</span><span className="hidden text-xs text-muted sm:block">{new Date(note.updatedAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span></button>)}
        </div> : <p className="rounded-xl border border-dashed border-line px-5 py-7 text-sm text-muted">Tu cuaderno empieza aquí. Crea una página para guardar tus ideas.</p>}
      </section>

      {roots.length > 0 && <section className="mt-10" aria-labelledby="cover-folders">
        <h2 id="cover-folders" className="mb-4 text-sm font-semibold text-ink">Carpetas</h2>
        <div className="flex flex-wrap gap-2">{roots.map(folder => <button key={folder.id} type="button" onClick={() => onOpenFolder(folder)} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-xs text-secondary hover:bg-hover focus-visible:outline-2 focus-visible:outline-strong"><ItemIcon icon={folder.icon} kind="folder" size={15} /><span>{folder.name}</span><span className="text-muted">{folderPath(folders, folder.id).length > 1 ? '↗' : ''}</span></button>)}</div>
      </section>}
    </div>
    {iconPickerOpen && <IconPicker name={workspace.title || 'Mi cuaderno'} value={workspace.coverIcon} onSelect={icon => { onChange({ coverIcon: icon ?? undefined }); setIconPickerOpen(false); }} onClose={() => setIconPickerOpen(false)} />}
  </main>;
}
