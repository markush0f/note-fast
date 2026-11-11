import {
  useLayoutEffect,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  align: "left" | "right";
  label: string;
  children: ReactNode;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
}

export default function ToolbarPopover({
  open,
  anchorRef,
  align,
  label,
  children,
  onKeyDown,
}: Props) {
  const [box, setBox] = useState<{
    left: number;
    top: number;
    maxHeight: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = 248;
      const preferred =
        align === "right" ? rect.right + 8 : rect.left - width - 8;
      const maxHeight = Math.min(360, window.innerHeight - 16);
      setBox({
        left: Math.max(8, Math.min(preferred, window.innerWidth - width - 8)),
        top: Math.max(8, Math.min(rect.top, window.innerHeight - 8 - 120)),
        maxHeight,
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, align, anchorRef]);

  if (!box) return null;
  return createPortal(
    <div
      data-toolbar-popover
      role="group"
      aria-label={label}
      hidden={!open}
      onKeyDown={onKeyDown}
      style={{ left: box.left, top: box.top, maxHeight: box.maxHeight }}
      className="fixed z-50 w-[248px] overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-lg shadow-black/10"
    >
      {children}
    </div>,
    document.body,
  );
}
