import { Component, Fragment, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Dialog from './Dialog';
import ChartForm, { fieldClass } from './ChartForm';
import type { BlockData } from '../lib/note-blocks';

class LoadBoundary extends Component<{ children: ReactNode }, { error: boolean; attempt: number }> {
  state = { error: false, attempt: 0 };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    return this.state.error ? <div role="alert">No se pudo cargar el editor de hojas. <button className={fieldClass} onClick={() => this.setState({ error: false, attempt: this.state.attempt + 1 })}>Reintentar</button></div> : <Fragment key={this.state.attempt}>{this.props.children}</Fragment>;
  }
}
// A retry remounts this component, recreating a rejected React.lazy wrapper.
function LazySheet({ initial, onDirty, onApply }: { initial: BlockData; onDirty: () => void; onApply: (data: BlockData) => void }) {
  const [Editor] = useState(() => lazy(() => import('./SpreadsheetEditor')));
  return 'workbook' in initial ? <Suspense fallback={<p role="status">Cargando hoja…</p>}><Editor initial={initial} onDirty={onDirty} onApply={onApply} busy={false} /></Suspense> : null;
}
export default function BlockDialog({ initial, onApply, onClose }: { initial: BlockData; onApply: (data: BlockData) => string | null; onClose: () => void }) {
  const dirty = useRef(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  const close = () => { if (!dirty.current || window.confirm('¿Descartar los cambios sin aplicar?')) onClose(); };
  const apply = (data: BlockData) => { const message = onApply(data); if (message) setError(message); else onClose(); };
  return createPortal(<div onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'k' || (event.altKey && event.key.toLowerCase() === 'n'))) event.stopPropagation(); }}><Dialog wide title={'series' in initial ? 'Editar gráfica' : 'Editar hoja de cálculo'} onClose={close}>
    <div className="mb-3 flex justify-end"><button className={fieldClass} onClick={close}>Cancelar</button></div>
    {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
    {'series' in initial ? <ChartForm initial={initial} onDirty={() => { dirty.current = true; }} onApply={apply} busy={false} /> : <LoadBoundary><LazySheet initial={initial} onDirty={() => { dirty.current = true; }} onApply={apply} /></LoadBoundary>}
  </Dialog></div>, document.body);
}
