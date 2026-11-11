import { useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { TextStyle, FontSize, Color } from "@tiptap/extension-text-style";
import type { Note } from "../lib/notes";
import type { ToolbarPlacement } from "../lib/editor-layout";
import FloatingToolbar from "./FloatingToolbar";

const editorClasses = [
  "min-h-75 text-[15px] leading-[1.8] text-secondary outline-none [overflow-wrap:anywhere]",
  "[&_p]:mb-3.5 [&_strong]:font-semibold",
  "[&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-[26px] [&_h1]:leading-snug [&_h1]:font-semibold [&_h1]:text-ink",
  "[&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-[21px] [&_h2]:leading-snug [&_h2]:font-semibold [&_h2]:text-ink",
  "[&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:leading-snug [&_h3]:font-semibold [&_h3]:text-ink",
  "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5.5 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5.5 [&_li_p]:mb-1",
  "[&_blockquote]:my-5.5 [&_blockquote]:border-l-2 [&_blockquote]:border-strong [&_blockquote]:pl-4.5 [&_blockquote]:text-muted",
  "[&_code]:rounded-sm [&_code]:bg-soft [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.9em]",
  "[&_pre]:mb-4 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-subtle [&_pre]:p-4 [&_pre]:font-mono [&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_a]:underline [&_a]:underline-offset-3 [&_s]:line-through [&_hr]:my-6 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-line",
  "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0 [&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:items-baseline [&_ul[data-type=taskList]_li]:gap-2 [&_ul[data-type=taskList]_li>div]:flex-1 [&_input[type=checkbox]]:accent-primary",
  "[&>p.is-editor-empty:first-child]:before:pointer-events-none [&>p.is-editor-empty:first-child]:before:float-left [&>p.is-editor-empty:first-child]:before:h-0 [&>p.is-editor-empty:first-child]:before:text-faint [&>p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
].join(" ");

interface Props {
  note: Note;
  onChange: (content: string) => void;
  onTitleChange: (title: string) => void;
  toolbarPosition: ToolbarPlacement;
  onToolbarPositionChange: (position: ToolbarPlacement) => void;
}

export default function NoteEditor({
  note,
  onChange,
  onTitleChange,
  toolbarPosition,
  onToolbarPositionChange,
}: Props) {
  const boundaryRef = useRef<HTMLDivElement>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
      Placeholder.configure({ placeholder: "Escribe…" }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextStyle,
      FontSize,
      Color,
    ],
    content: note.content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: editorClasses,
        "aria-label": "Contenido de la nota",
        role: "textbox",
        "aria-multiline": "true",
      },
    },
  });

  if (!editor) return null;
  return (
    <div
      ref={boundaryRef}
      className="relative isolate flex min-h-0 flex-1 flex-col"
    >
      <FloatingToolbar
        editor={editor}
        boundaryRef={boundaryRef}
        placement={toolbarPosition}
        onPlacementChange={onToolbarPositionChange}
      />
      <div
        className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]"
        data-document-scroll
      >
        <article className="mx-auto w-full max-w-190 px-6 pt-20 pb-24 min-[651px]:px-8 min-[901px]:px-12 min-[901px]:pb-28">
          <input
            className="block w-full bg-transparent p-0 text-[28px] leading-snug font-semibold tracking-tight outline-none placeholder:text-faint min-[651px]:text-3xl"
            aria-label="Título de la nota"
            placeholder="Sin título"
            value={note.title}
            onChange={(event) => onTitleChange(event.target.value)}
          />
          <EditorContent editor={editor} className="mt-6" />
        </article>
      </div>
    </div>
  );
}
