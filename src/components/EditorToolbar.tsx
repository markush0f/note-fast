import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useToolbarDrag } from "./useToolbarDrag";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  TextSize,
  List,
  NumberedListLeft,
  TaskList,
  Quote,
  Code,
  Undo,
  Redo,
  MoreHoriz,
  Position,
  Drag,
  Check,
  type IconComponent,
} from "./icons";
import { Button, iconButtonClass } from "./ui";
import { TOOLBAR_POSITIONS, type ToolbarPosition } from "../lib/editor-layout";

interface Props {
  editor: Editor;
  boundaryRef: RefObject<HTMLDivElement | null>;
  position: ToolbarPosition;
  onPositionChange: (position: ToolbarPosition) => void;
}

const cornerPreview: Record<ToolbarPosition, string> = {
  "top-left": "top-0.5 left-0.5",
  "top-right": "top-0.5 right-0.5",
  "bottom-left": "bottom-0.5 left-0.5",
  "bottom-right": "bottom-0.5 right-0.5",
};

export default function EditorToolbar({
  editor,
  boundaryRef,
  position,
  onPositionChange,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const instructions = useId();
  const { toolbarRef, preview, handleProps } = useToolbarDrag(
    boundaryRef,
    onPositionChange,
    () => {
      if (menuRef.current) menuRef.current.open = false;
    },
  );
  const bottom = position.startsWith("bottom");
  const right = position.endsWith("right");
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
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
    }),
  });

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target) &&
        menuRef.current
      )
        menuRef.current.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  const closeMenu = () => {
    if (menuRef.current) menuRef.current.open = false;
    triggerRef.current?.focus();
  };
  const tools: {
    label: string;
    icon: IconComponent;
    active?: boolean;
    disabled?: boolean;
    basic?: boolean;
    action: () => void;
  }[] = [
    {
      label: "Negrita (Ctrl+B)",
      icon: Bold,
      active: state.bold,
      basic: true,
      action: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Cursiva (Ctrl+I)",
      icon: Italic,
      active: state.italic,
      basic: true,
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
      icon: TextSize,
      active: state.heading,
      basic: true,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Lista con viñetas",
      icon: List,
      active: state.bullet,
      basic: true,
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Lista numerada",
      icon: NumberedListLeft,
      active: state.ordered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Lista de tareas",
      icon: TaskList,
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
      icon: Code,
      active: state.code,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      label: "Deshacer (Ctrl+Z)",
      icon: Undo,
      disabled: !state.undo,
      action: () => editor.chain().focus().undo().run(),
    },
    {
      label: "Rehacer (Ctrl+Shift+Z)",
      icon: Redo,
      disabled: !state.redo,
      action: () => editor.chain().focus().redo().run(),
    },
  ];

  return (
    <>
      <div
        ref={toolbarRef}
        data-toolbar-position={position}
        data-toolbar-dragging={preview ? "true" : undefined}
        style={
          preview
            ? { transform: `translate(${preview.x}px, ${preview.y}px)` }
            : undefined
        }
        className={`relative flex max-w-full flex-wrap items-center gap-0.5 rounded-lg border border-line bg-white p-1.5 shadow-black/5 ${preview ? "z-40 shadow-lg select-none" : "z-10 shadow-sm"}`}
        role="toolbar"
        aria-label="Formato de texto"
      >
        <button
          type="button"
          {...handleProps}
          aria-label="Arrastrar barra de herramientas"
          aria-describedby={instructions}
          title="Arrastra la barra a una esquina"
          className="inline-flex size-7.5 shrink-0 touch-none cursor-grab items-center justify-center rounded text-muted hover:bg-hover active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-stone-500"
        >
          <Drag size={16} />
        </button>
        <span id={instructions} className="sr-only">
          Arrastra para cambiar de esquina. Pulsa Escape para cancelar o utiliza
          el selector de posición con el teclado.
        </span>
        {tools
          .filter((tool) => expanded || tool.basic)
          .map(({ label, icon: Icon, active, disabled, action }) => (
            <Button
              key={label}
              variant="icon"
              aria-label={label}
              title={label}
              aria-pressed={active}
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
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
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setExpanded((value) => !value)}
        >
          <MoreHoriz size={17} />
        </Button>
        <span className="mx-0.5 h-4 w-px bg-line" aria-hidden="true" />
        <details
          ref={menuRef}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              closeMenu();
            }
          }}
        >
          <summary
            ref={triggerRef}
            className={`${iconButtonClass} list-none [&::-webkit-details-marker]:hidden`}
            aria-label="Posición de la barra"
            title="Posición de la barra"
          >
            <Position size={16} />
          </summary>
          <div
            className={`absolute z-30 max-h-[40dvh] w-58 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md border border-line bg-white p-1 shadow-lg shadow-black/5 ${bottom ? "bottom-full mb-2" : "top-full mt-2"} ${right ? "right-0" : "left-0"}`}
            role="group"
            aria-label="Ubicación de herramientas"
          >
            {TOOLBAR_POSITIONS.map((option) => (
              <Button
                key={option.id}
                variant="menu"
                aria-pressed={position === option.id}
                onClick={() => {
                  onPositionChange(option.id);
                  closeMenu();
                }}
              >
                <span
                  className="relative size-4 shrink-0 rounded-sm border border-stone-300"
                  aria-hidden="true"
                >
                  <span
                    className={`absolute size-1.5 rounded-xs bg-stone-500 ${cornerPreview[option.id]}`}
                  />
                </span>
                <span className="flex-1">{option.label}</span>
                {position === option.id && <Check size={13} />}
              </Button>
            ))}
          </div>
        </details>
      </div>
      {preview &&
        boundaryRef.current &&
        createPortal(
          <div
            className="pointer-events-none absolute inset-0 z-20 bg-white/30"
            aria-hidden="true"
          >
            {TOOLBAR_POSITIONS.map((corner) => (
              <span
                key={corner.id}
                data-drop-corner={corner.id}
                data-active={
                  preview.position === corner.id ? "true" : undefined
                }
                className={`absolute rounded border border-dashed px-2 py-1.5 text-[10px] ${cornerPreview[corner.id]} ${preview.position === corner.id ? "border-stone-500 bg-stone-200 text-ink" : "border-stone-300 bg-white text-muted"}`}
              >
                {corner.label}
              </span>
            ))}
          </div>,
          boundaryRef.current,
        )}
    </>
  );
}
