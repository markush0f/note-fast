import { useEffect, useId, useRef, type ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

export default function Dialog({
  title,
  description,
  onClose,
  children,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const trigger =
      previous instanceof HTMLElement
        ? (previous.closest("details")?.querySelector("summary") ?? previous)
        : null;
    ref.current?.querySelector<HTMLElement>("input, button")?.focus();
    return () => {
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus();
    };
  }, []);
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-5"
      onClick={onClose}
    >
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-heading`}
        aria-describedby={description ? `${id}-description` : undefined}
        className="w-full max-w-90 rounded-lg border border-line bg-white p-6.5"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onClose();
          }
          if (event.key === "Tab") {
            const controls = ref.current?.querySelectorAll<HTMLElement>(
              "input, button:not(:disabled)",
            );
            if (!controls?.length) return;
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            }
            if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <h2 id={`${id}-heading`} className="mb-2.5 text-[17px] font-semibold">
          {title}
        </h2>
        {description && (
          <p id={`${id}-description`} className="text-[13px] text-muted">
            {description}
          </p>
        )}
        {children}
      </section>
    </div>
  );
}
