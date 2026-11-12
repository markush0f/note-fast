import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from "react";
import {
  getToolbarDragOffset,
  getToolbarPoint,
  type ToolbarBounds,
  type ToolbarPoint,
} from "./editor-layout";

export function useToolbarDrag(
  boundaryRef: RefObject<HTMLDivElement | null>,
  onDrop: (position: ToolbarPoint) => void,
  onStart: () => void,
) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const session = useRef<{
    pointerId: number;
    x: number;
    y: number;
    toolbar: ToolbarBounds;
    moved: boolean;
  } | null>(null);
  const [preview, setPreview] = useState<{
    x: number;
    y: number;
    point: ToolbarPoint;
  } | null>(null);
  const cancel = () => {
    session.current = null;
    setPreview(null);
  };
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && session.current) {
        event.preventDefault();
        event.stopPropagation();
        session.current = null;
        setPreview(null);
      }
    };
    const blur = () => {
      session.current = null;
      setPreview(null);
    };
    document.addEventListener("keydown", escape, true);
    window.addEventListener("blur", blur);
    return () => {
      document.removeEventListener("keydown", escape, true);
      window.removeEventListener("blur", blur);
    };
  }, []);
  const getPreview = (event: PointerEvent<HTMLButtonElement>) => {
    const current = session.current;
    const boundary = boundaryRef.current;
    if (!current || !boundary || current.pointerId !== event.pointerId)
      return null;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.moved && Math.hypot(dx, dy) < 5) return null;
    current.moved = true;
    const bounds = boundary.getBoundingClientRect();
    const offset = getToolbarDragOffset(current.toolbar, bounds, dx, dy);
    const x = current.toolbar.left - bounds.left + offset.x;
    const y = current.toolbar.top - bounds.top + offset.y;
    return { x, y, point: getToolbarPoint(x, y, bounds, current.toolbar) };
  };
  return {
    toolbarRef,
    preview,
    handleProps: {
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        if (
          !event.isPrimary ||
          event.button !== 0 ||
          !toolbarRef.current ||
          !boundaryRef.current
        )
          return;
        event.preventDefault();
        onStart();
        session.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          toolbar: toolbarRef.current.getBoundingClientRect(),
          moved: false,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
        const next = getPreview(event);
        if (next) setPreview(next);
      },
      onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
        if (session.current?.pointerId !== event.pointerId) return;
        const next = getPreview(event);
        cancel();
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
        if (next) onDrop(next.point);
      },
      onPointerCancel: cancel,
      onLostPointerCapture: cancel,
    },
  };
}
