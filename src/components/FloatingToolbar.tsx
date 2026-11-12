import { useId, useLayoutEffect, useState, type RefObject } from "react";
import type { Editor } from "@tiptap/react";
import {
  getToolbarCoordinates,
  getToolbarPoint,
  type ToolbarPlacement,
} from "../lib/editor-layout";
import EditorToolbar from "./EditorToolbar";
import { Drag } from "./icons";
import { useToolbarDrag } from "./useToolbarDrag";
import Tooltip from "./Tooltip";

interface Props {
  editor: Editor;
  boundaryRef: RefObject<HTMLDivElement | null>;
  placement: ToolbarPlacement;
  onPlacementChange: (placement: ToolbarPlacement) => void;
  onInsertBlock?: (kind: 'chart' | 'spreadsheet') => void;
  onInsertAttachment?: () => void;
}

export default function FloatingToolbar({
  editor,
  boundaryRef,
  placement,
  onPlacementChange,
  onInsertBlock,
  onInsertAttachment,
}: Props) {
  const instructions = useId();
  const { toolbarRef, preview, handleProps } = useToolbarDrag(
    boundaryRef,
    onPlacementChange,
    () => {
      toolbarRef.current?.querySelector("details")?.removeAttribute("open");
    },
  );
  const [size, setSize] = useState({
    width: 0,
    height: 0,
    toolbarWidth: 0,
    toolbarHeight: 0,
  });

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    // Parent refs can attach after a child's layout effect on the first commit.
    const boundary = boundaryRef.current ?? toolbar?.parentElement;
    if (!boundary || !toolbar) return;
    const measure = () => {
      const area = boundary.getBoundingClientRect();
      const bar = toolbar.getBoundingClientRect();
      setSize((previous) =>
        previous.width === area.width &&
        previous.height === area.height &&
        previous.toolbarWidth === bar.width &&
        previous.toolbarHeight === bar.height
          ? previous
          : {
              width: area.width,
              height: area.height,
              toolbarWidth: bar.width,
              toolbarHeight: bar.height,
            },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(boundary);
    observer.observe(toolbar);
    return () => observer.disconnect();
  }, [boundaryRef, toolbarRef]);

  const toolbarSize = { width: size.toolbarWidth, height: size.toolbarHeight };
  const coordinates =
    preview ?? getToolbarCoordinates(placement, size, toolbarSize);
  return (
    <div
      ref={toolbarRef}
      data-floating-toolbar
      data-toolbar-dragging={preview ? "true" : undefined}
      className={`absolute top-0 left-0 w-max max-w-[calc(100%_-_1.5rem)] ${preview ? "z-40 select-none" : "z-10"}`}
      style={{
        transform: `translate(${coordinates.x}px, ${coordinates.y}px)`,
        visibility: size.toolbarWidth ? "visible" : "hidden",
      }}
    >
      <EditorToolbar
        editor={editor}
        onInsertBlock={onInsertBlock}
        onInsertAttachment={onInsertAttachment}
        placement={placement}
        onPlacementChange={onPlacementChange}
        dragging={Boolean(preview)}
        dragHandle={
          <>
            <Tooltip
              label="Mover barra de herramientas"
              shortcut="Flechas · Shift para pasos mayores"
              disabled={Boolean(preview)}
            >
              <button
                type="button"
                {...handleProps}
                aria-label="Arrastrar barra de herramientas"
                aria-describedby={instructions}
                className="inline-flex size-8 shrink-0 touch-none cursor-grab items-center justify-center rounded-full text-muted hover:bg-hover active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-strong"
                onKeyDown={(event) => {
                  const delta = {
                    ArrowLeft: [-1, 0],
                    ArrowRight: [1, 0],
                    ArrowUp: [0, -1],
                    ArrowDown: [0, 1],
                  }[event.key];
                  if (!delta) return;
                  event.preventDefault();
                  const step = event.shiftKey ? 40 : 10;
                  onPlacementChange(
                    getToolbarPoint(
                      coordinates.x + delta[0] * step,
                      coordinates.y + delta[1] * step,
                      size,
                      toolbarSize,
                    ),
                  );
                }}
              >
                <Drag size={16} />
              </button>
            </Tooltip>
            <span id={instructions} className="sr-only">
              Arrastra para colocar la barra en cualquier punto del editor. Usa
              las flechas para moverla con el teclado y Escape para cancelar un
              arrastre.
            </span>
          </>
        }
      />
    </div>
  );
}
