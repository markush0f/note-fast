import { useEffect, useRef, useState } from 'react';
import { Book, SendDiagonal, Sparks, Xmark } from './icons';
import { Button } from './ui';

const suggestions = [
  'Resume las páginas de este cuaderno',
  '¿Qué tareas tengo pendientes?',
  'Ayúdame a ordenar mis ideas',
];

interface ChatPanelProps {
  open: boolean;
  notebookName?: string;
  onClose: () => void;
}

export default function ChatPanel({ open, notebookName, onClose }: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    inputRef.current?.focus({ preventScroll: true });
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open]);

  return (
    <div className={`chat-slot ${open ? 'is-open' : ''}`} inert={!open} aria-hidden={!open}>
    <aside
      id="notebook-chat"
      aria-labelledby="chat-title"
      className="chat-panel flex min-h-0 min-w-0 flex-col border-l border-line bg-sidebar"
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header className="flex min-h-16 shrink-0 items-center gap-2.5 border-b border-line px-5">
        <Sparks size={18} className="text-secondary" />
        <h2 id="chat-title" className="text-[13px] font-semibold">Asistente</h2>
        <span className="rounded border border-line px-1.5 py-0.5 text-[10px] text-muted">Vista previa</span>
        <Button variant="icon" className="ml-auto" title="Ocultar chat" aria-label="Ocultar chat" onClick={onClose}>
          <Xmark size={18} />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-6">
        <div className="my-auto py-8">
          <div className="mb-5 flex size-11 items-center justify-center rounded-xl border border-line bg-surface text-secondary">
            <Sparks size={23} />
          </div>
          <h3 className="text-lg font-medium tracking-tight">Tus ideas, en conversación</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            Un espacio para explorar tus cuadernos, conectar ideas y dar forma a nuevas páginas.
          </p>
          <div className="mt-7 flex flex-col gap-2" aria-label="Sugerencias para empezar">
            {suggestions.map(suggestion => (
              <button
                key={suggestion}
                type="button"
                className="cursor-pointer rounded-lg border border-line bg-surface px-3.5 py-3 text-left text-xs leading-relaxed text-secondary transition-colors hover:border-strong hover:bg-hover focus-visible:outline-2 focus-visible:outline-strong"
                onClick={() => { setDraft(suggestion); inputRef.current?.focus(); }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="shrink-0 px-4 pb-4">
        <div className="rounded-xl border border-line bg-surface p-3 focus-within:border-strong">
          <div className="mb-3 flex min-w-0 items-center gap-1.5 text-[11px] text-muted">
            <Book size={13} className="shrink-0" />
            <span className="truncate" title={notebookName}>{notebookName ?? 'Todos mis cuadernos'}</span>
          </div>
          <textarea
            ref={inputRef}
            aria-label="Mensaje para el asistente"
            aria-describedby="chat-preview-notice"
            placeholder="Pregunta o comparte una idea…"
            value={draft}
            onChange={event => setDraft(event.target.value)}
            rows={3}
            className="block max-h-40 min-h-20 w-full resize-none bg-transparent text-[13px] leading-relaxed text-ink outline-none placeholder:text-faint"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted">IA aún no conectada</span>
            <Button variant="primary" className="!rounded-lg !p-2" disabled aria-label="Enviar mensaje" title="Disponible cuando se conecte la IA">
              <SendDiagonal size={16} />
            </Button>
          </div>
        </div>
        <p id="chat-preview-notice" className="mt-2.5 text-center text-[10px] leading-relaxed text-muted">
          Solo diseño. No se envían mensajes ni se modifican tus páginas.
        </p>
      </div>
    </aside>
    </div>
  );
}
