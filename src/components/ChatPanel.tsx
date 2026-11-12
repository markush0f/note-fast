import { useEffect, useRef, useState } from 'react';
import { Plus, Refresh, SendDiagonal, Sparks, Xmark } from './icons';
import { Button } from './ui';
import { listModels, sendChat, type ChatMessage } from '../lib/ai';

const suggestions = [
  'Ayúdame a ordenar mis ideas',
  'Prepara una plantilla para un proyecto',
  '¿Cómo puedo organizar mis tareas?',
];

interface ChatPanelProps {
  open: boolean;
  userId: string;
  onClose: () => void;
}

export default function ChatPanel({ open, userId, onClose }: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState('');
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    inputRef.current?.focus({ preventScroll: true });
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open || !userId) return;
    const controller = new AbortController();
    setLoadingModels(true);
    setModelsError('');
    void listModels(userId, controller.signal).then(values => {
      if (controller.signal.aborted) return;
      setModels(values);
      setModel(previous => values.includes(previous) ? previous : values[0] ?? '');
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return;
      setModels([]);
      setModelsError(cause instanceof Error ? cause.message : 'No se pudieron cargar los modelos.');
    }).finally(() => { if (!controller.signal.aborted) setLoadingModels(false); });
    return () => controller.abort();
  }, [open, userId, refresh]);

  useEffect(() => () => { requestRef.current?.abort(); requestRef.current = null; }, []);
  useEffect(() => {
    const element = conversationRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, busy, open]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !model || !userId || loadingModels || !models.includes(model) || requestRef.current) return;
    if (messages.length >= 20 || messages.reduce((size, message) => size + message.content.length, text.length) > 64000) {
      setError('La conversación es demasiado larga. Inicia una conversación nueva.');
      return;
    }
    const controller = new AbortController();
    requestRef.current = controller;
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setDraft('');
    setError('');
    setBusy(true);
    try {
      const reply = await sendChat(userId, model, next, controller.signal);
      if (requestRef.current === controller && !controller.signal.aborted) setMessages([...next, reply]);
    } catch (cause) {
      if (requestRef.current !== controller) return;
      setMessages(messages);
      setDraft(text);
      setError(controller.signal.aborted ? 'Respuesta detenida. Puedes volver a enviar el mensaje.' : cause instanceof Error ? cause.message : 'No se pudo obtener una respuesta.');
    } finally {
      if (requestRef.current === controller) { requestRef.current = null; setBusy(false); }
    }
  };

  return (
    <div className={`chat-slot ${open ? 'is-open' : ''}`} inert={!open} aria-hidden={!open}>
      <aside
        id="notebook-chat"
        aria-labelledby="chat-title"
        className="chat-panel flex min-h-0 min-w-0 flex-col border-l border-line bg-sidebar"
        onKeyDown={event => {
          if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
        }}
      >
        <header className="flex min-h-16 shrink-0 items-center gap-2.5 border-b border-line px-5">
          <Sparks size={18} className="text-secondary" />
          <h2 id="chat-title" className="text-[13px] font-semibold">Asistente</h2>
          <span className="rounded border border-line px-1.5 py-0.5 text-[10px] text-muted">Ollama</span>
          <Button variant="icon" className="ml-auto" title="Nueva conversación" aria-label="Nueva conversación" disabled={busy || !messages.length} onClick={() => { setMessages([]); setDraft(''); setError(''); inputRef.current?.focus(); }}>
            <Plus size={18} />
          </Button>
          <Button variant="icon" title="Ocultar chat" aria-label="Ocultar chat" onClick={onClose}><Xmark size={18} /></Button>
        </header>

        <div className="shrink-0 border-b border-line px-4 py-3">
          <label htmlFor="chat-model" className="mb-1.5 block text-[11px] text-muted">Modelo local</label>
          <div className="flex items-center gap-2">
            <select id="chat-model" value={model} disabled={busy || loadingModels || !models.length} onChange={event => { setModel(event.target.value); setError(''); }} className="min-w-0 flex-1 rounded border border-line bg-surface px-2 py-2 text-xs text-ink outline-none focus-visible:border-strong disabled:opacity-50">
              {!models.length && <option value="">{loadingModels ? 'Buscando modelos…' : 'Sin modelos disponibles'}</option>}
              {models.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
            <Button variant="icon" aria-label="Actualizar modelos" title="Actualizar modelos" disabled={loadingModels || busy} onClick={() => setRefresh(value => value + 1)}><Refresh size={16} className={loadingModels ? 'animate-spin motion-reduce:animate-none' : ''} /></Button>
          </div>
          {modelsError && <p role="alert" className="mt-2 text-xs leading-relaxed text-danger">{modelsError}</p>}
          {!loadingModels && !modelsError && !models.length && <p className="mt-2 text-xs leading-relaxed text-muted">Instala un modelo con <code>ollama pull llama3.2</code> y actualiza la lista.</p>}
        </div>

        <div ref={conversationRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-6">
          {!messages.length ? <div className="my-auto py-8">
            <div className="mb-5 flex size-11 items-center justify-center rounded-xl border border-line bg-surface text-secondary"><Sparks size={23} /></div>
            <h3 className="text-lg font-medium tracking-tight">Tus ideas, en conversación</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">Conversa con un modelo de Ollama. Por ahora, el asistente solo puede ver los mensajes de este chat.</p>
            <div className="mt-7 flex flex-col gap-2" aria-label="Sugerencias para empezar">
              {suggestions.map(suggestion => <button key={suggestion} type="button" className="cursor-pointer rounded-lg border border-line bg-surface px-3.5 py-3 text-left text-xs leading-relaxed text-secondary transition-colors hover:border-strong hover:bg-hover focus-visible:outline-2 focus-visible:outline-strong" onClick={() => { setDraft(suggestion); inputRef.current?.focus(); }}>{suggestion}</button>)}
            </div>
          </div> : <div role="log" aria-label="Conversación con el asistente" aria-live="polite" className="flex flex-col gap-5">
            {messages.map((message, index) => <div key={index} className={message.role === 'user' ? 'ml-5 rounded-xl bg-selection px-3.5 py-3' : 'pr-2'}>
              <p className="mb-1.5 text-[10px] font-medium text-muted">{message.role === 'user' ? 'Tú' : 'Asistente'}</p>
              <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-ink [overflow-wrap:anywhere]">{message.content}</p>
            </div>)}
          </div>}
          {busy && <p role="status" className="mt-5 flex items-center gap-2 text-xs text-muted"><Refresh size={13} className="animate-spin motion-reduce:animate-none" />Generando respuesta…</p>}
        </div>

        <div className="shrink-0 px-4 pb-4">
          {error && <p role="alert" className="mb-3 text-xs leading-relaxed text-danger">{error}</p>}
          <form onSubmit={event => { event.preventDefault(); void send(); }} className="rounded-xl border border-line bg-surface p-3 focus-within:border-strong">
            <textarea ref={inputRef} aria-label="Mensaje para el asistente" aria-describedby="chat-notice" placeholder="Pregunta o comparte una idea…" value={draft} maxLength={16000} disabled={busy} onChange={event => setDraft(event.target.value)} rows={3}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); }
              }}
              className="block max-h-40 min-h-20 w-full resize-none bg-transparent text-[13px] leading-relaxed text-ink outline-none placeholder:text-faint disabled:opacity-50" />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted">Enter para enviar · Mayús+Enter para saltar</span>
              {busy ? <Button variant="secondary" className="!px-2 !py-2" onClick={() => requestRef.current?.abort()}>Detener</Button> :
                <Button type="submit" variant="primary" className="!rounded-lg !p-2" disabled={!draft.trim() || !model || !models.includes(model) || loadingModels || !userId} aria-label="Enviar mensaje" title="Enviar mensaje"><SendDiagonal size={16} /></Button>}
            </div>
          </form>
          <p id="chat-notice" className="mt-2.5 text-center text-[10px] leading-relaxed text-muted">Sin acceso a tus páginas. El historial solo dura esta sesión.</p>
        </div>
      </aside>
    </div>
  );
}
