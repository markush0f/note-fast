import { useEffect, useId, useRef, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  DEFAULT_FONT_SIZE,
  FONT_SIZE_PRESETS,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  parseFontSize,
  selectionFontSize,
} from "../formatting/font-size";
import ToolbarPopover from "./ToolbarPopover";
import Tooltip from "../../../shared/ui/Tooltip";

interface Props {
  editor: Editor;
  dragging: boolean;
  open: boolean;
  align: "left" | "right";
  onOpenChange: (open: boolean) => void;
}

const stepButton =
  "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-hover focus-visible:outline-2 focus-visible:outline-strong disabled:cursor-default disabled:opacity-30";

export default function FontSizeControl({
  editor,
  dragging,
  open,
  align,
  onOpenChange,
}: Props) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => selectionFontSize(editor),
  });
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const skipBlur = useRef(false);
  const errorId = useId();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const displayed = state.size === null ? "" : String(state.size);

  useEffect(() => {
    if (document.activeElement !== input.current) {
      setDraft(displayed);
      setError("");
    }
  }, [displayed, state.mixed]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const apply = (value: string, focus: boolean) => {
    const size = parseFontSize(value);
    if (size === null) {
      setError(
        `Introduce un número entero entre ${MIN_FONT_SIZE} y ${MAX_FONT_SIZE} px.`,
      );
      return false;
    }
    if (state.disabled) return false;
    if (focus) skipBlur.current = document.activeElement === input.current;
    editor.commands.setFontSize(`${size}px`);
    if (focus) editor.view.focus();
    setDraft(String(size));
    setError("");
    return true;
  };
  const step = (delta: number) => {
    const current = parseFontSize(draft) ?? state.size ?? DEFAULT_FONT_SIZE;
    apply(
      String(Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, current + delta))),
      true,
    );
  };
  const label =
    state.mixed || state.size === null ? "Tamaño" : `${state.size}`;

  return (
    <>
      <Tooltip
        label={
          state.mixed
            ? "Tamaño mixto"
            : state.size
              ? `Tamaño de fuente, ${state.size} px`
              : "Tamaño de fuente"
        }
        disabled={dragging || open}
      >
        <button
          ref={trigger}
          type="button"
          aria-label="Tamaño de fuente"
          aria-expanded={open}
          aria-haspopup="true"
          disabled={state.disabled}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-medium tracking-tight text-ink hover:bg-hover focus-visible:outline-2 focus-visible:outline-strong disabled:opacity-30 aria-expanded:bg-hover"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onOpenChange(!open)}
        >
          {label}
        </button>
      </Tooltip>
      <ToolbarPopover
        open={open && !dragging}
        anchorRef={trigger}
        align={align}
        label="Tamaño de fuente"
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          event.stopPropagation();
          skipBlur.current = true;
          setDraft(displayed);
          setError("");
          onOpenChange(false);
          trigger.current?.focus();
        }}
      >
        <div className="flex items-center gap-1 px-1 py-1">
          <button
            type="button"
            className={stepButton}
            aria-label="Reducir tamaño de texto"
            disabled={
              state.disabled ||
              (state.size !== null && state.size <= MIN_FONT_SIZE)
            }
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => step(-1)}
          >
            −
          </button>
          <input
            ref={input}
            type="number"
            min={MIN_FONT_SIZE}
            max={MAX_FONT_SIZE}
            step={1}
            inputMode="numeric"
            aria-label="Tamaño de texto en píxeles"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            disabled={state.disabled}
            className="h-8 min-w-0 flex-1 rounded-md border border-line bg-transparent px-1 text-center text-sm text-ink outline-none [appearance:textfield] focus:border-strong aria-invalid:border-danger disabled:opacity-30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            placeholder={state.mixed ? "Mixto" : "—"}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (apply(draft, true)) onOpenChange(false);
              }
            }}
            onBlur={() => {
              if (skipBlur.current) {
                skipBlur.current = false;
                return;
              }
              if (draft !== displayed && !apply(draft, false)) {
                setDraft(displayed);
                setError("");
              }
            }}
          />
          <span className="text-[10px] text-muted" aria-hidden="true">
            px
          </span>
          <button
            type="button"
            className={stepButton}
            aria-label="Aumentar tamaño de texto"
            disabled={
              state.disabled ||
              (state.size !== null && state.size >= MAX_FONT_SIZE)
            }
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => step(1)}
          >
            +
          </button>
        </div>
        {error && (
          <p id={errorId} className="px-2 text-[11px] text-danger" role="status">
            {error}
          </p>
        )}
        <div
          className="mt-1 grid grid-cols-5 gap-1"
          role="group"
          aria-label="Tamaños predefinidos"
        >
          {FONT_SIZE_PRESETS.map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={state.size === size && !state.mixed}
              className="rounded-md px-1 py-1.5 text-[11px] text-secondary hover:bg-hover aria-pressed:bg-primary aria-pressed:text-on-primary"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                apply(String(size), true);
                onOpenChange(false);
              }}
            >
              {size}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mt-1 w-full rounded-md px-2 py-2 text-left text-xs text-secondary hover:bg-subtle"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            editor.commands.unsetFontSize();
            editor.view.focus();
            setError("");
            onOpenChange(false);
          }}
        >
          Predeterminado
        </button>
      </ToolbarPopover>
    </>
  );
}
