import { noteTitle } from "../lib/note-links";
import { TRASH_DAYS, type Folder } from "../lib/workspace";
import type { Note } from "../lib/notes";
import Dialog from "./Dialog";
import { Button } from "./ui";

interface Props {
  notes: Note[];
  folders: Folder[];
  onRestoreNote: (id: string) => void;
  onRestoreFolder: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  onEmpty: () => void;
  onClose: () => void;
}

function remaining(deletedAt: string): string {
  const left = Date.parse(deletedAt) + TRASH_DAYS * 24 * 60 * 60 * 1000 - Date.now();
  const days = Math.max(1, Math.ceil(left / (24 * 60 * 60 * 1000)));
  return days === 1 ? "1 día" : `${days} días`;
}

export default function TrashDialog({
  notes,
  folders,
  onRestoreNote,
  onRestoreFolder,
  onDeleteNote,
  onDeleteFolder,
  onEmpty,
  onClose,
}: Props) {
  const items = [
    ...folders.map((folder) => ({
      id: folder.id,
      kind: "folder" as const,
      label: folder.name,
      deletedAt: folder.deletedAt ?? "",
    })),
    ...notes.map((note) => ({
      id: note.id,
      kind: "note" as const,
      label: noteTitle(note.title),
      deletedAt: note.deletedAt ?? "",
    })),
  ].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));

  return (
    <Dialog
      title="Papelera"
      description={`Los elementos se eliminan de forma definitiva a los ${TRASH_DAYS} días.`}
      onClose={onClose}
    >
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">La papelera está vacía.</p>
      ) : (
        <ul className="mt-4 max-h-80 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <li
              key={`${item.kind}-${item.id}`}
              className="flex items-center gap-2 rounded-md px-2 py-1.5"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">{item.label}</span>
                <span className="text-[11px] text-muted">
                  {item.kind === "folder" ? "Carpeta" : "Nota"} · {remaining(item.deletedAt)}
                </span>
              </span>
              <Button
                variant="text"
                onClick={() =>
                  item.kind === "folder"
                    ? onRestoreFolder(item.id)
                    : onRestoreNote(item.id)
                }
              >
                Restaurar
              </Button>
              <Button
                variant="text"
                className="text-danger"
                onClick={() =>
                  item.kind === "folder"
                    ? onDeleteFolder(item.id)
                    : onDeleteNote(item.id)
                }
              >
                Borrar
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={onClose}>Cerrar</Button>
        <Button variant="danger" disabled={items.length === 0} onClick={onEmpty}>
          Vaciar papelera
        </Button>
      </div>
    </Dialog>
  );
}
