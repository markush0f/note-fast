import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import type { Note } from "../lib/notes";
import { noteTitle, type NoteLinkQuery } from "../lib/note-links";

interface Suggestion extends NoteLinkQuery {
  from: number;
  to: number;
}

interface Props {
  editor: Editor;
  notes: Note[];
  suggestion: Suggestion;
  activeIndex: number;
  onPick: (note: Note) => void;
}

export default function NoteLinkMenu({
  editor,
  notes,
  suggestion,
  activeIndex,
  onPick,
}: Props) {
  const [box, setBox] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      const coords = editor.view.coordsAtPos(suggestion.from);
      const width = 240;
      setBox({
        left: Math.max(8, Math.min(coords.left, window.innerWidth - width - 8)),
        top: Math.min(coords.bottom + 6, window.innerHeight - 220),
      });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [editor, suggestion.from, suggestion.to, suggestion.query]);
  if (!box) return null;
  return createPortal(
    <div
      role="listbox"
      aria-label="Páginas para enlazar"
      className="fixed z-50 w-60 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-lg shadow-black/10"
      style={{ left: box.left, top: box.top }}
    >
      {notes.length === 0 ? (
        <p className="px-2 py-2 text-xs text-muted">No hay páginas con ese título</p>
      ) : (
        notes.map((note, index) => (
          <button
            key={note.id}
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            className={`block w-full rounded-md px-2 py-1.5 text-left text-xs text-secondary ${index === activeIndex ? "bg-selection text-ink" : "hover:bg-subtle"}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(note)}
          >
            {noteTitle(note.title)}
          </button>
        ))
      )}
    </div>,
    document.body,
  );
}
