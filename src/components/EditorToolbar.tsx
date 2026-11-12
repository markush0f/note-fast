import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  Bold,
  StatsUpSquare,
  Table2Columns,
  Plus,
  Italic,
  Underline,
  Strikethrough,
  Link,
  ColorPicker,
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
  Check,
  type IconComponent,
} from "./icons";
import { Button } from "./ui";
import Tooltip from "./Tooltip";
import FontSizeControl from "./FontSizeControl";
import ToolbarPopover from "./ToolbarPopover";
import { formatShortcut } from "../lib/shortcuts";
import { isTextColor, parseLink, TEXT_COLORS } from "../lib/text-format";
import {
  TOOLBAR_POSITIONS,
  getToolbarPlacementCorner,
  type ToolbarPosition,
  type ToolbarPlacement,
} from "../lib/editor-layout";

interface Props {
  editor: Editor;
  placement: ToolbarPlacement;
  onPlacementChange: (placement: ToolbarPlacement) => void;
  onInsertBlock?: (kind: 'chart' | 'spreadsheet') => void;
  dragHandle: ReactNode;
  dragging: boolean;
}

const cornerPreview: Record<ToolbarPosition, string> = {
  "top-left": "top-0.5 left-0.5",
  "top-right": "top-0.5 right-0.5",
  "bottom-left": "bottom-0.5 left-0.5",
  "bottom-right": "bottom-0.5 right-0.5",
};

const railButton =
  "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-transparent text-muted hover:bg-hover hover:text-ink aria-pressed:bg-primary aria-pressed:text-on-primary focus-visible:outline-2 focus-visible:outline-strong disabled:cursor-default disabled:opacity-30";

type Menu = "size" | "more" | "position" | "link" | "color" | "insert";

export default function EditorToolbar({
  editor,
  placement,
  onPlacementChange,
  dragHandle,
  onInsertBlock,
  dragging,
}: Props) {
  const [menu, setMenu] = useState<Menu | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const insertRef = useRef<HTMLButtonElement>(null);
  const linkRef = useRef<HTMLButtonElement>(null);
  const colorRef = useRef<HTMLButtonElement>(null);
  const positionRef = useRef<HTMLButtonElement>(null);
  const position = getToolbarPlacementCorner(placement);
  const align = position.endsWith("right") ? "left" : "right";
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      strike: editor.isActive("strike"),
      link: editor.isActive("link"),
      color:
        typeof editor.getAttributes("textStyle").color === "string"
          ? editor.getAttributes("textStyle").color
          : "",
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
    if (dragging) setMenu(null);
  }, [dragging]);

  useEffect(() => {
    if (!menu) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (barRef.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest("[data-toolbar-popover]")
      )
        return;
      setMenu(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      const current = menu;
      setMenu(null);
      if (current === "more") moreRef.current?.focus();
      if (current === "insert") insertRef.current?.focus();
      if (current === "link") linkRef.current?.focus();
      if (current === "color") colorRef.current?.focus();
      if (current === "position") positionRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const tools: {
    label: string;
    shortcut?: string;
    icon: IconComponent;
    active?: boolean;
    disabled?: boolean;
    primary?: boolean;
    action: () => void;
  }[] = [
    {
      label: "Negrita",
      shortcut: "Mod+B",
      icon: Bold,
      active: state.bold,
      primary: true,
      action: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Cursiva",
      shortcut: "Mod+I",
      icon: Italic,
      active: state.italic,
      primary: true,
      action: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Subrayado",
      shortcut: "Mod+U",
      icon: Underline,
      active: state.underline,
      action: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: "Tachado",
      shortcut: "Mod+Shift+S",
      icon: Strikethrough,
      active: state.strike,
      action: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      label: "Encabezado",
      shortcut: "Mod+Alt+2",
      icon: TextSize,
      active: state.heading,
      primary: true,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Lista con viñetas",
      shortcut: "Mod+Shift+8",
      icon: List,
      active: state.bullet,
      primary: true,
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Lista numerada",
      shortcut: "Mod+Shift+7",
      icon: NumberedListLeft,
      active: state.ordered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Lista de tareas",
      shortcut: "Mod+Shift+9",
      icon: TaskList,
      active: state.task,
      action: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      label: "Cita",
      shortcut: "Mod+Shift+B",
      icon: Quote,
      active: state.quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: "Bloque de código",
      shortcut: "Mod+Alt+C",
      icon: Code,
      active: state.code,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      label: "Deshacer",
      shortcut: "Mod+Z",
      icon: Undo,
      disabled: !state.undo,
      action: () => editor.chain().focus().undo().run(),
    },
    {
      label: "Rehacer",
      shortcut: "Mod+Shift+Z",
      icon: Redo,
      disabled: !state.redo,
      action: () => editor.chain().focus().redo().run(),
    },
  ];
  const primary = tools.filter((tool) => tool.primary);
  const secondary = tools.filter((tool) => !tool.primary);

  return (
    <div
      ref={barRef}
      data-toolbar-position={typeof placement === "string" ? placement : "free"}
      data-toolbar-orientation="vertical"
      className={`flex max-h-[calc(100dvh-7rem)] w-11 flex-col items-center gap-0.5 overflow-y-auto rounded-full border border-line bg-surface/95 p-1 shadow-lg shadow-black/10 backdrop-blur-md [scrollbar-width:none] ${dragging ? "shadow-black/20" : ""}`}
      role="toolbar"
      aria-orientation="vertical"
      aria-label="Formato de texto"
    >
      {dragHandle}
      {onInsertBlock && <>
        <Tooltip label="Insertar" disabled={dragging || menu === 'insert'}><button type="button" ref={insertRef} className={railButton} aria-label="Insertar" aria-expanded={menu === 'insert'} onMouseDown={e => e.preventDefault()} onClick={() => setMenu(menu === 'insert' ? null : 'insert')}><Plus size={16} /></button></Tooltip>
        <ToolbarPopover open={menu === 'insert' && !dragging} anchorRef={insertRef} align={align} label="Insertar">
          <div className="grid gap-1 p-2">{([['chart', 'Gráfica', StatsUpSquare], ['spreadsheet', 'Hoja de cálculo', Table2Columns]] as const).map(([kind, label, Icon]) => <button key={kind} type="button" className="flex items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-hover" onMouseDown={e => e.preventDefault()} onClick={() => { setMenu(null); onInsertBlock(kind); }}><Icon size={18} className="shrink-0" />{label}</button>)}</div>
        </ToolbarPopover>
      </>}
      <span className="my-0.5 h-px w-5 bg-line" aria-hidden="true" />
      <FontSizeControl
        editor={editor}
        dragging={dragging}
        align={align}
        open={menu === "size"}
        onOpenChange={(open) => setMenu(open ? "size" : null)}
      />
      {primary.map(({ label, shortcut, icon: Icon, active, disabled, action }) => (
        <Tooltip
          key={label}
          label={label}
          shortcut={shortcut ? formatShortcut(shortcut) : undefined}
          disabled={dragging}
        >
          <button
            type="button"
            className={railButton}
            aria-label={label}
            aria-keyshortcuts={
              shortcut
                ? formatShortcut(shortcut)
                    .replace("Cmd", "Meta")
                    .replace("Ctrl", "Control")
                : undefined
            }
            aria-pressed={active}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setMenu(null);
              action();
            }}
          >
            <Icon size={16} />
          </button>
        </Tooltip>
      ))}
      <Tooltip label="Enlace" disabled={dragging || menu === "link"}>
        <button
          ref={linkRef}
          type="button"
          className={railButton}
          aria-label="Enlace"
          aria-pressed={state.link || menu === "link"}
          aria-expanded={menu === "link"}
          aria-haspopup="true"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setMenu((value) => (value === "link" ? null : "link"))}
        >
          <Link size={16} />
        </button>
      </Tooltip>
      <LinkFields
        editor={editor}
        open={menu === "link" && !dragging}
        anchorRef={linkRef}
        align={align}
        onDone={() => {
          setMenu(null);
          linkRef.current?.focus();
        }}
      />
      <Tooltip label="Color de texto" disabled={dragging || menu === "color"}>
        <button
          ref={colorRef}
          type="button"
          className={railButton}
          aria-label="Color de texto"
          aria-pressed={Boolean(state.color) || menu === "color"}
          aria-expanded={menu === "color"}
          aria-haspopup="true"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() =>
            setMenu((value) => (value === "color" ? null : "color"))
          }
        >
          <ColorPicker size={16} />
        </button>
      </Tooltip>
      <ColorFields
        editor={editor}
        open={menu === "color" && !dragging}
        anchorRef={colorRef}
        align={align}
        onDone={() => {
          setMenu(null);
          colorRef.current?.focus();
        }}
      />
      <Tooltip label="Más opciones de formato" disabled={dragging || menu === "more"}>
        <button
          ref={moreRef}
          type="button"
          className={railButton}
          aria-pressed={menu === "more"}
          aria-label="Más opciones de formato"
          aria-expanded={menu === "more"}
          aria-haspopup="true"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setMenu((value) => (value === "more" ? null : "more"))}
        >
          <MoreHoriz size={16} />
        </button>
      </Tooltip>
      <ToolbarPopover
        open={menu === "more" && !dragging}
        anchorRef={moreRef}
        align={align}
        label="Más opciones de formato"
      >
        <p className="px-2 pt-1 pb-1 text-[10px] tracking-wide text-muted uppercase">
          Formato
        </p>
        {secondary.map(({ label, shortcut, icon: Icon, active, disabled, action }) => (
          <Button
            key={label}
            variant="menu"
            aria-label={label}
            aria-keyshortcuts={
              shortcut
                ? formatShortcut(shortcut)
                    .replace("Cmd", "Meta")
                    .replace("Ctrl", "Control")
                : undefined
            }
            aria-pressed={active}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              action();
              setMenu(null);
            }}
          >
            <Icon size={15} />
            <span className="flex-1">{label}</span>
            {shortcut && (
              <span className="text-[10px] text-faint">
                {formatShortcut(shortcut)}
              </span>
            )}
          </Button>
        ))}
      </ToolbarPopover>
      <span className="my-0.5 h-px w-5 bg-line" aria-hidden="true" />
      <Tooltip label="Posición de la barra" disabled={dragging || menu === "position"}>
        <button
          ref={positionRef}
          type="button"
          className={railButton}
          aria-label="Posición de la barra"
          aria-expanded={menu === "position"}
          aria-haspopup="true"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() =>
            setMenu((value) => (value === "position" ? null : "position"))
          }
        >
          <Position size={15} />
        </button>
      </Tooltip>
      <ToolbarPopover
        open={menu === "position" && !dragging}
        anchorRef={positionRef}
        align={align}
        label="Ubicación de herramientas"
      >
        {TOOLBAR_POSITIONS.map((option) => (
          <Button
            key={option.id}
            variant="menu"
            aria-pressed={placement === option.id}
            onClick={() => {
              onPlacementChange(option.id);
              setMenu(null);
              positionRef.current?.focus();
            }}
          >
            <span
              className="relative size-4 shrink-0 rounded-sm border border-strong"
              aria-hidden="true"
            >
              <span
                className={`absolute size-1.5 rounded-xs bg-muted ${cornerPreview[option.id]}`}
              />
            </span>
            <span className="flex-1">{option.label}</span>
            {placement === option.id && <Check size={13} />}
          </Button>
        ))}
      </ToolbarPopover>
    </div>
  );
}

function LinkFields({
  editor,
  open,
  anchorRef,
  align,
  onDone,
}: {
  editor: Editor;
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  align: "left" | "right";
  onDone: () => void;
}) {
  const href = useEditorState({
    editor,
    selector: ({ editor }) => {
      const value = editor.getAttributes("link").href;
      return typeof value === "string" ? value : "";
    },
  });
  const inputId = useId();
  const [draft, setDraft] = useState(href);
  const [error, setError] = useState("");
  useEffect(() => {
    setDraft(href);
    setError("");
  }, [href, open]);
  const apply = () => {
    const url = parseLink(draft);
    if (!url) {
      setError("Usa una dirección http, https o un correo.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    onDone();
  };
  return (
    <ToolbarPopover open={open} anchorRef={anchorRef} align={align} label="Enlace">
      <form
        className="px-1 py-1"
        onSubmit={(event) => {
          event.preventDefault();
          apply();
        }}
      >
        <label
          className="mb-1 block px-1 text-[10px] tracking-wide text-muted uppercase"
          htmlFor={inputId}
        >
          Dirección
        </label>
        <input
          id={inputId}
          aria-label="Dirección del enlace"
          aria-invalid={Boolean(error)}
          className="h-8 w-full rounded-md border border-line bg-transparent px-2 text-xs text-ink outline-none focus:border-strong aria-invalid:border-danger"
          placeholder="https://"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setError("");
          }}
        />
        {error && (
          <p className="px-1 pt-1 text-[11px] text-danger" role="status">
            {error}
          </p>
        )}
        <div className="mt-1 flex gap-1">
          <Button variant="menu" type="submit">
            Aplicar enlace
          </Button>
          <Button
            variant="menu"
            disabled={!href}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              onDone();
            }}
          >
            Quitar enlace
          </Button>
        </div>
      </form>
    </ToolbarPopover>
  );
}

function ColorFields({
  editor,
  open,
  anchorRef,
  align,
  onDone,
}: {
  editor: Editor;
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  align: "left" | "right";
  onDone: () => void;
}) {
  const color = useEditorState({
    editor,
    selector: ({ editor }) => {
      const value = editor.getAttributes("textStyle").color;
      return typeof value === "string" ? value : "";
    },
  });
  return (
    <ToolbarPopover
      open={open}
      anchorRef={anchorRef}
      align={align}
      label="Color de texto"
    >
      <div className="px-1 py-1">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Colores">
          {TEXT_COLORS.map((swatch) => (
            <button
              key={swatch.id}
              type="button"
              aria-label={swatch.label}
              aria-pressed={color.toLowerCase() === swatch.id}
              className="size-6 rounded-full border border-line aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-strong"
              style={{ backgroundColor: swatch.id }}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                editor.chain().focus().setColor(swatch.id).run();
                onDone();
              }}
            />
          ))}
          <label className="inline-flex size-6 cursor-pointer overflow-hidden rounded-full border border-line">
            <input
              type="color"
              aria-label="Color personalizado"
              className="size-8 cursor-pointer border-0 bg-transparent p-0"
              value={isTextColor(color) ? color : "#57534e"}
              onInput={(event) => {
                const value = event.currentTarget.value;
                if (!isTextColor(value)) return;
                editor.chain().focus().setColor(value).run();
              }}
            />
          </label>
        </div>
        <Button
          variant="menu"
          className="mt-1"
          disabled={!color}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            editor.chain().focus().unsetColor().run();
            onDone();
          }}
        >
          Quitar color
        </Button>
      </div>
    </ToolbarPopover>
  );
}
