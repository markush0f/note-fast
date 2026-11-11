import { useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  Bold,
  Italic,
  Underline,
  TextSize as Heading2,
  List,
  NumberedListLeft as ListOrdered,
  TaskList as ListTodo,
  Quote,
  Code as Code2,
  Undo as Undo2,
  Redo as Redo2,
  MoreHoriz as Ellipsis,
  type IconComponent,
} from "./icons";
import type { Note } from "../lib/notes";
import { Button } from "./ui";

const editorClasses = [
  "min-h-75 text-[15px] leading-[1.8] text-stone-600 outline-none [overflow-wrap:anywhere]",
  "[&_p]:mb-3.5 [&_strong]:font-semibold",
  "[&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-[26px] [&_h1]:leading-snug [&_h1]:font-semibold [&_h1]:text-ink",
  "[&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-[21px] [&_h2]:leading-snug [&_h2]:font-semibold [&_h2]:text-ink",
  "[&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:leading-snug [&_h3]:font-semibold [&_h3]:text-ink",
  "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5.5 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5.5 [&_li_p]:mb-1",
  "[&_blockquote]:my-5.5 [&_blockquote]:border-l-2 [&_blockquote]:border-stone-300 [&_blockquote]:pl-4.5 [&_blockquote]:text-muted",
  "[&_code]:rounded-sm [&_code]:bg-stone-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.9em]",
  "[&_pre]:mb-4 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-stone-50 [&_pre]:p-4 [&_pre]:font-mono [&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_a]:underline [&_a]:underline-offset-3 [&_hr]:my-6 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-line",
  "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0 [&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:items-baseline [&_ul[data-type=taskList]_li]:gap-2 [&_ul[data-type=taskList]_li>div]:flex-1 [&_input[type=checkbox]]:accent-stone-600",
  "[&>p.is-editor-empty:first-child]:before:pointer-events-none [&>p.is-editor-empty:first-child]:before:float-left [&>p.is-editor-empty:first-child]:before:h-0 [&>p.is-editor-empty:first-child]:before:text-stone-400 [&>p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
].join(" ");

interface Props {
  note: Note;
  onChange: (content: string) => void;
}

export default function NoteEditor({ note, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Placeholder.configure({
        placeholder: "Escribe…",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
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
  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            underline: editor.isActive("underline"),
            heading: editor.isActive("heading", { level: 2 }),
            bullet: editor.isActive("bulletList"),
            ordered: editor.isActive("orderedList"),
            task: editor.isActive("taskList"),
            quote: editor.isActive("blockquote"),
            code: editor.isActive("codeBlock"),
            undo: editor.can().undo(),
            redo: editor.can().redo(),
          }
        : null,
  });

  if (!editor || !state) return null;
  const tools: {
    label: string;
    icon: IconComponent;
    active?: boolean;
    disabled?: boolean;
    action: () => void;
  }[] = [
    {
      label: "Negrita (Ctrl+B)",
      icon: Bold,
      active: state.bold,
      action: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Cursiva (Ctrl+I)",
      icon: Italic,
      active: state.italic,
      action: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Subrayado (Ctrl+U)",
      icon: Underline,
      active: state.underline,
      action: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: "Encabezado",
      icon: Heading2,
      active: state.heading,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Lista con viñetas",
      icon: List,
      active: state.bullet,
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Lista numerada",
      icon: ListOrdered,
      active: state.ordered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Lista de tareas",
      icon: ListTodo,
      active: state.task,
      action: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      label: "Cita",
      icon: Quote,
      active: state.quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: "Bloque de código",
      icon: Code2,
      active: state.code,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      label: "Deshacer (Ctrl+Z)",
      icon: Undo2,
      disabled: !state.undo,
      action: () => editor.chain().focus().undo().run(),
    },
    {
      label: "Rehacer (Ctrl+Shift+Z)",
      icon: Redo2,
      disabled: !state.redo,
      action: () => editor.chain().focus().redo().run(),
    },
  ];
  return (
    <>
      <div
        className="mt-4.5 mb-6 flex flex-wrap items-center gap-0.5"
        role="toolbar"
        aria-label="Formato de texto"
      >
        {tools
          .filter(
            (tool) =>
              expanded ||
              [Bold, Italic, Heading2, List].some((icon) => icon === tool.icon),
          )
          .map(({ label, icon: Icon, active, disabled, action }) => (
            <Button
              key={label}
              variant="icon"
              aria-label={label}
              title={label}
              aria-pressed={active}
              disabled={disabled}
              onClick={action}
            >
              <Icon size={17} />
            </Button>
          ))}
        <Button
          variant="icon"
          aria-pressed={expanded}
          aria-label={
            expanded ? "Menos opciones de formato" : "Más opciones de formato"
          }
          title={expanded ? "Menos opciones" : "Más opciones"}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          <Ellipsis size={17} />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </>
  );
}
