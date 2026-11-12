import type { ItemIconId } from "./item-icons";
import { DEFAULT_NOTEBOOK_ID } from './workspace';
import { blockText, readBlock } from './note-blocks';

export interface Note {
  id: string;
  title: string;
  content: string;
  notebookId: string;
  icon?: ItemIconId;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export function createNote(notebookId = DEFAULT_NOTEBOOK_ID): Note {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "",
    content: "",
    notebookId,
    favorite: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function plainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll('[data-ntbk-block]').forEach(element => {
    const data = readBlock(element.getAttribute('data-ntbk-block'), element.getAttribute('data-ntbk-payload'));
    element.textContent = data ? blockText(data) : '';
  });
  doc
    .querySelectorAll("p, div, h1, h2, h3, h4, h5, h6, li, blockquote, pre, br")
    .forEach((element) => {
      element.after(doc.createTextNode("\n"));
    });
  return (doc.body.textContent ?? "").trim();
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}

export function characterCount(text: string): number {
  return [...text].length;
}

export function filterNotes(
  notes: Note[],
  query: string,
  favorites: boolean,
): Note[] {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es");
  const search = normalize(query.trim());
  return notes
    .filter(
      (note) =>
        (!favorites || note.favorite) &&
        normalize(`${note.title} ${plainText(note.content)}`).includes(search),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function welcomeNote(): Note {
  return {
    ...createNote(),
    title: "Un espacio para tus ideas",
    content:
      "<p>Cada gran idea empieza con una pequeña nota. Este es tu lugar para darle forma.</p><h2>Menos ruido. Más claridad.</h2><p>Guarda lo que te inspira, organiza tus pensamientos o simplemente empieza a escribir. No tiene que ser perfecto.</p><blockquote><p>Escribir es una forma de pensar en voz baja.</p></blockquote><h2>Hazlo tuyo</h2><ul><li><p>Crea una nota con el botón <strong>Nueva página</strong>.</p></li><li><p>Dale formato a tus ideas con la barra del editor.</p></li><li><p>Marca tus páginas favoritas para encontrarlas rápido.</p></li></ul><p>Tu cuaderno se guarda automáticamente en este dispositivo. Sin cuentas, sin distracciones. Solo tú y tus ideas.</p>",
  };
}
