export interface NoteLinkQuery {
  query: string;
  length: number;
}

export function findNoteLinkQuery(textBefore: string): NoteLinkQuery | null {
  const start = textBefore.lastIndexOf("[[");
  if (start < 0) return null;
  const query = textBefore.slice(start + 2);
  if (query.length > 80 || /[[\]]/.test(query)) return null;
  return { query, length: textBefore.length - start };
}

export function noteTitle(title: string): string {
  return title.trim() || "Sin título";
}

export function rankNoteLinks<T extends { id: string; title: string }>(
  notes: T[],
  query: string,
  excludeId?: string,
): T[] {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es");
  const search = normalize(query.trim());
  return notes
    .filter((note) => note.id !== excludeId)
    .map((note) => ({ note, title: normalize(noteTitle(note.title)) }))
    .filter(({ title }) => !search || title.includes(search))
    .sort(
      (a, b) =>
        Number(search && !a.title.startsWith(search)) -
          Number(search && !b.title.startsWith(search)) ||
        a.title.localeCompare(b.title, "es"),
    )
    .slice(0, 8)
    .map(({ note }) => note);
}
