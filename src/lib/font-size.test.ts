// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import {
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  parseFontSize,
  selectionFontSize,
} from "./font-size";

const editors: Editor[] = [];
const create = (content: string) => {
  const editor = new Editor({
    extensions: [StarterKit, TextStyle, FontSize],
    content,
  });
  editors.push(editor);
  return editor;
};
afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy();
});

describe("pixel font sizes", () => {
  it("accepts integer pixel values only in the supported range", () => {
    for (const value of [
      String(MIN_FONT_SIZE),
      "15",
      " 23 ",
      String(MAX_FONT_SIZE),
    ])
      expect(parseFontSize(value)).toBe(Number(value));
    for (const value of [
      "",
      " ",
      "7",
      "201",
      "-12",
      "15.5",
      "24px",
      "NaN",
      "Infinity",
      "1e2",
    ])
      expect(parseFontSize(value)).toBeNull();
  });
  it("changes only selected text and roundtrips the exact px style", () => {
    const editor = create("<p>Hola mundo</p>");
    editor.commands.setTextSelection({ from: 1, to: 5 });
    editor.commands.setFontSize("23px");
    expect(editor.getHTML()).toContain(
      'style="font-size: 23px;">Hola</span> mundo',
    );
    expect(editor.state.doc.textContent).toBe("Hola mundo");
    expect(selectionFontSize(editor)).toEqual({
      size: 23,
      mixed: false,
      disabled: false,
    });
    const restored = create(editor.getHTML());
    restored.commands.setTextSelection({ from: 1, to: 5 });
    expect(selectionFontSize(restored).size).toBe(23);
  });
  it("reports mixed selections rather than showing a misleading size", () => {
    const editor = create(
      '<p><span style="font-size: 24px">Grande</span> normal</p>',
    );
    editor.commands.selectAll();
    expect(selectionFontSize(editor)).toEqual({
      size: null,
      mixed: true,
      disabled: false,
    });
    editor.commands.setFontSize("18px");
    expect(selectionFontSize(editor)).toEqual({
      size: 18,
      mixed: false,
      disabled: false,
    });
  });
  it("restores inherited heading size while preserving bold", () => {
    const editor = create(
      '<h2><strong><span style="font-size: 35px">Título</span></strong></h2>',
    );
    editor.commands.setTextSelection({ from: 1, to: 7 });
    editor.commands.unsetFontSize();
    expect(editor.getHTML()).toContain("<h2><strong>Título</strong></h2>");
    expect(editor.getHTML()).not.toContain("font-size");
    expect(selectionFontSize(editor).size).toBe(21);
  });
  it("uses the selected size for subsequent typing at a cursor", () => {
    const editor = create("<p>Hola</p>");
    editor.commands.setTextSelection(5);
    editor.commands.setFontSize("19px");
    expect(selectionFontSize(editor).size).toBe(19);
    editor.commands.insertContent(" nuevo");
    expect(editor.getHTML()).toContain(
      'style="font-size: 19px;"> nuevo</span>',
    );
  });
  it("disables size controls in code without changing existing content", () => {
    const editor = create("<pre><code>const x = 1</code></pre>");
    editor.commands.setTextSelection(3);
    expect(selectionFontSize(editor).disabled).toBe(true);
    expect(editor.getHTML()).toContain("<code>const x = 1</code>");
  });
});
