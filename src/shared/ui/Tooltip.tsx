import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type Ref,
} from "react";
import { createPortal } from "react-dom";

type TriggerProps = HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> };
interface Props {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  children: ReactElement;
}

export default function Tooltip({
  label,
  shortcut,
  disabled = false,
  children,
}: Props) {
  const id = useId();
  const child = children as ReactElement<TriggerProps>;
  const original = child.props;
  const anchor = useRef<HTMLElement | null>(null);
  const popup = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [point, setPoint] = useState<{ left: number; top: number } | null>(
    null,
  );
  const attachRef = useCallback(
    (node: HTMLElement | null) => {
      anchor.current = node;
      if (typeof original.ref === "function") return original.ref(node);
      if (original.ref) original.ref.current = node;
    },
    [original.ref],
  );
  const close = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setOpen(false);
    setPoint(null);
  };
  useEffect(() => {
    if (disabled) close();
  }, [disabled]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const dismiss = () => close();
    document.addEventListener("keydown", escape, true);
    window.addEventListener("resize", dismiss);
    document.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("keydown", escape, true);
      window.removeEventListener("resize", dismiss);
      document.removeEventListener("scroll", dismiss, true);
    };
  }, [open]);
  useLayoutEffect(() => {
    if (!open || disabled || !anchor.current || !popup.current) return;
    const target = anchor.current.getBoundingClientRect();
    const box = popup.current.getBoundingClientRect();
    const width = document.documentElement.clientWidth || window.innerWidth;
    const height = window.innerHeight;
    const left = Math.max(
      8,
      Math.min(
        target.left + (target.width - box.width) / 2,
        width - box.width - 8,
      ),
    );
    const preferredTop =
      target.top >= box.height + 16
        ? target.top - box.height - 8
        : target.bottom + 8;
    setPoint({
      left,
      top: Math.max(8, Math.min(preferredTop, height - box.height - 8)),
    });
  }, [open, disabled, label, shortcut]);
  return (
    <>
      {cloneElement(child, {
        ref: attachRef,
        "aria-describedby":
          [original["aria-describedby"], open && !disabled ? id : null]
            .filter(Boolean)
            .join(" ") || undefined,
        onPointerEnter: (event) => {
          original.onPointerEnter?.(event);
          if (disabled || event.pointerType === "touch") return;
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            setOpen(true);
            timer.current = null;
          }, 200);
        },
        onPointerLeave: (event) => {
          original.onPointerLeave?.(event);
          if (document.activeElement !== anchor.current) close();
        },
        onFocus: (event) => {
          original.onFocus?.(event);
          if (!disabled) setOpen(true);
        },
        onBlur: (event) => {
          original.onBlur?.(event);
          close();
        },
        onPointerDown: (event) => {
          original.onPointerDown?.(event);
          close();
        },
        onClick: (event) => {
          original.onClick?.(event);
          close();
        },
      })}
      {open &&
        !disabled &&
        createPortal(
          <div
            id={id}
            ref={popup}
            role="tooltip"
            className="pointer-events-none fixed z-[100] flex max-w-[calc(100vw_-_1rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-primary px-2.5 py-2 text-xs text-on-primary shadow-lg"
            style={{
              left: point?.left ?? 0,
              top: point?.top ?? 0,
              visibility: point ? "visible" : "hidden",
            }}
          >
            <span>{label}</span>
            {shortcut && (
              <kbd className="rounded border border-on-primary/20 px-1 py-0.5 font-sans text-[10px] whitespace-nowrap text-on-primary/80">
                {shortcut}
              </kbd>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
