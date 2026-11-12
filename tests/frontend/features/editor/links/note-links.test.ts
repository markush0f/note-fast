import { describe, expect, it } from "vitest";
import { findNoteLinkQuery, noteTitle, rankNoteLinks } from "../../../../../src/features/editor/links/note-links";

describe("note links", () => {
  it("reads an open wiki query and ignores closed or nested brackets", () => {
    expect(findNoteLinkQuery("ver [[plan")).toEqual({
      query: "plan",
      length: 6,
    });
    expect(findNoteLinkQuery("[[")).toEqual({ query: "", length: 2 });
    expect(findNoteLinkQuery("ya [[plan]] y")).toBeNull();
    expect(findNoteLinkQuery("texto")).toBeNull();
    expect(findNoteLinkQuery(`[[${"a".repeat(81)}`)).toBeNull();
  });

  it("ranks titles without accents and skips the current note", () => {
    const notes = [
      { id: "1", title: "Plan semanal" },
      { id: "2", title: "  " },
      { id: "3", title: "Plantilla" },
      { id: "4", title: "Otra" },
    ];
    expect(rankNoteLinks(notes, "plan", "1").map((note) => note.id)).toEqual([
      "3",
    ]);
    expect(rankNoteLinks(notes, "", "4").map((note) => noteTitle(note.title))).toEqual([
      "Plan semanal",
      "Plantilla",
      "Sin título",
    ]);
  });
});
