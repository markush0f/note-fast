// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  createNote,
  filterNotes,
  plainText,
  welcomeNote,
  characterCount,
  wordCount,
} from "../../../../../src/features/workspace/model/notes";

describe("notes", () => {
  it("creates independent blank notes with timestamps", () => {
    const a = createNote();
    const b = createNote();
    expect(a.id).not.toBe(b.id);
    expect(a.title).toBe("");
    expect(a.favorite).toBe(false);
    expect(a.createdAt).toBe(a.updatedAt);
    expect(Number.isNaN(Date.parse(a.createdAt))).toBe(false);
  });
  it("extracts editor text without markup", () => {
    expect(plainText("<p>Una <strong>idea</strong> &amp; otra.</p>")).toBe(
      "Una idea & otra.",
    );
    expect(wordCount(plainText("<p>Una</p><p>idea<br>nueva</p>"))).toBe(3);
  });
  it("counts whitespace-separated words", () => {
    expect(wordCount(" \n ")).toBe(0);
    expect(wordCount("  una idea\npara mañana  ")).toBe(4);
    expect(characterCount("café")).toBe(4);
    expect(characterCount("")).toBe(0);
  });
  it("searches title and content ignoring case and accents", () => {
    const note = {
      ...createNote(),
      title: "Inspiración",
      content: "<p>El próximo café</p>",
    };
    expect(filterNotes([note], "INSPIRACION", false)).toEqual([note]);
    expect(filterNotes([note], "cafe", false)).toEqual([note]);
    expect(filterNotes([note], "ausente", false)).toEqual([]);
    expect(filterNotes([note], "strong", false)).toEqual([]);
  });
  it("filters favorites and sorts latest first without mutating the source", () => {
    const older = { ...createNote(), updatedAt: "2025-01-01T00:00:00.000Z" };
    const newer = {
      ...createNote(),
      favorite: true,
      updatedAt: "2025-02-01T00:00:00.000Z",
    };
    const source = [older, newer];
    expect(filterNotes(source, "", false)).toEqual([newer, older]);
    expect(filterNotes(source, "", true)).toEqual([newer]);
    expect(source).toEqual([older, newer]);
  });
  it("provides an editable welcome note", () => {
    const note = welcomeNote();
    expect(note.title).toBeTruthy();
    expect(wordCount(plainText(note.content))).toBeGreaterThan(20);
  });
});
