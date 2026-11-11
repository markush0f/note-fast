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
  Heading2,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code2,
  Undo2,
  Redo2,
  Ellipsis,
  type LucideIcon,
} from "lucide-react";
import type { Note } from "../lib/notes";

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
        class: "prose-editor",
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
    icon: LucideIcon;
    active?: boolean;
    disabled?: boolean;
    action: () => void;
    divider?: boolean;
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
      divider: true,
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
      divider: true,
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
      divider: true,
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
        className="editor-toolbar"
        role="toolbar"
        aria-label="Formato de texto"
      >
        {tools
          .filter(
            (tool) =>
              expanded ||
              [Bold, Italic, Heading2, List].some((icon) => icon === tool.icon),
          )
          .map(({ label, icon: Icon, active, disabled, action, divider }) => (
            <span className={divider ? "tool-group" : ""} key={label}>
              <button
                type="button"
                className={`icon-button ${active ? "is-active" : ""}`}
                aria-label={label}
                title={label}
                aria-pressed={active}
                disabled={disabled}
                onClick={action}
              >
                <Icon size={17} />
              </button>
            </span>
          ))}
        <button
          type="button"
          className={`icon-button ${expanded ? "is-active" : ""}`}
          aria-label={
            expanded ? "Menos opciones de formato" : "Más opciones de formato"
          }
          title={expanded ? "Menos opciones" : "Más opciones"}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          <Ellipsis size={17} />
        </button>
      </div>
      <EditorContent editor={editor} />
    </>
  );
}
