import { Mark, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { findNoteLinkQuery, type NoteLinkQuery } from "./note-links";

export interface NoteLinkSuggestion extends NoteLinkQuery {
  from: number;
  to: number;
}

export const NoteLink = Mark.create<{
  onSuggest: (suggestion: NoteLinkSuggestion | null) => void;
}>({
  name: "noteLink",
  inclusive: false,
  excludes: "link",
  addOptions() {
    return { onSuggest: () => undefined };
  },
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-note-id"),
        renderHTML: (attributes) =>
          typeof attributes.id === "string"
            ? { "data-note-id": attributes.id }
            : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: "a[data-note-id]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, { class: "note-link", href: "#" }),
      0,
    ];
  },
  addProseMirrorPlugins() {
    const onSuggest = this.options.onSuggest;
    let last = "";
    const publish = (suggestion: NoteLinkSuggestion | null) => {
      const key = suggestion
        ? `${suggestion.from}:${suggestion.to}:${suggestion.query}`
        : "";
      if (key === last) return;
      last = key;
      queueMicrotask(() => onSuggest(suggestion));
    };
    return [
      new Plugin({
        key: new PluginKey("noteLinkSuggest"),
        view() {
          return {
            update(view) {
              const selection = view.state.selection;
              if (!selection.empty) {
                publish(null);
                return;
              }
              const before = selection.$from.parent.textBetween(
                0,
                selection.$from.parentOffset,
                undefined,
                "\ufffc",
              );
              const match = findNoteLinkQuery(before);
              publish(
                match
                  ? {
                      ...match,
                      from: selection.from - match.length,
                      to: selection.from,
                    }
                  : null,
              );
            },
            destroy() {
              publish(null);
            },
          };
        },
      }),
    ];
  },
});
