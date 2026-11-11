import type { Editor } from "@tiptap/core";
import type { Mark } from "@tiptap/pm/model";

export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 200;
export const DEFAULT_FONT_SIZE = 15;
export const FONT_SIZE_PRESETS = [
  10, 12, 14, 15, 16, 18, 20, 24, 28, 32, 40, 48, 64, 72, 96,
];

export function parseFontSize(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const size = Number(value);
  return Number.isInteger(size) &&
    size >= MIN_FONT_SIZE &&
    size <= MAX_FONT_SIZE
    ? size
    : null;
}

function inheritedSize(type: string | undefined, level: unknown): number {
  if (type === "heading")
    return (
      ({ 1: 26, 2: 21, 3: 18 } as Record<number, number>)[Number(level)] ??
      DEFAULT_FONT_SIZE
    );
  return DEFAULT_FONT_SIZE;
}
function markSize(marks: readonly Mark[], fallback: number): number | null {
  const value = marks.find((mark) => mark.type.name === "textStyle")?.attrs
    .fontSize as unknown;
  if (!value) return fallback;
  if (typeof value !== "string" || !/^\d+(?:\.\d+)?px$/.test(value))
    return null;
  return Number.parseFloat(value);
}

export function selectionFontSize(editor: Editor): {
  size: number | null;
  mixed: boolean;
  disabled: boolean;
} {
  const { selection, storedMarks, doc } = editor.state;
  const parent = selection.$from.parent;
  const fallback = inheritedSize(parent.type.name, parent.attrs.level);
  const disabled = editor.isActive("codeBlock") || editor.isActive("code");
  if (selection.empty)
    return {
      size: markSize(storedMarks ?? selection.$from.marks(), fallback),
      mixed: false,
      disabled,
    };
  const sizes = new Set<number | null>();
  doc.nodesBetween(selection.from, selection.to, (node, position, parent) => {
    if (
      node.isText &&
      position < selection.to &&
      position + node.nodeSize > selection.from
    ) {
      sizes.add(
        markSize(
          node.marks,
          inheritedSize(parent?.type.name, parent?.attrs.level),
        ),
      );
    } else if (node.isTextblock && node.content.size === 0) {
      sizes.add(inheritedSize(node.type.name, node.attrs.level));
    }
  });
  return {
    size:
      sizes.size > 1
        ? null
        : sizes.size
          ? (sizes.values().next().value ?? null)
          : fallback,
    mixed: sizes.size > 1,
    disabled,
  };
}
