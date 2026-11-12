import { useEffect, useRef, useState } from 'react';
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import esES from '@univerjs/preset-sheets-core/locales/es-ES';
import '@univerjs/preset-sheets-core/lib/index.css';
import { UNIVER_VERSION, type SpreadsheetBlockData } from '../lib/note-blocks';
import { fieldClass } from './ChartForm';

export default function SpreadsheetEditor({ initial, onDirty, onApply, busy }: { initial: SpreadsheetBlockData; onDirty: () => void; onApply: (data: SpreadsheetBlockData) => void; busy: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<ReturnType<typeof createUniver> | null>(null);
  const dirty = useRef(onDirty);
  dirty.current = onDirty;
  const [title, setTitle] = useState(initial.title);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!container.current) return;
    let disposeListener: (() => void) | undefined;
    let owned: ReturnType<typeof createUniver> | undefined;
    const mount = document.createElement('div');
    mount.style.height = '100%';
    container.current.append(mount);
    setReady(false);
    try {
      if (initial.engineVersion !== UNIVER_VERSION) throw new Error('Versión de hoja no compatible. Conserva una copia JSON y abre la hoja con su versión original.');
      const app = createUniver({ locale: LocaleType.ES_ES, locales: { [LocaleType.ES_ES]: mergeLocales(esES) }, darkMode: document.documentElement.dataset.theme === 'dark', presets: [UniverSheetsCorePreset({ container: mount })] });
      owned = app;
      instance.current = app;
      const book = app.univerAPI.createWorkbook(structuredClone(initial.workbook));
      const listener = book.onCommandExecuted(command => {
        // Mutations are actual workbook edits; selection and scrolling do not dirty a draft.
        if (command.id.includes('.mutation.')) dirty.current();
      });
      disposeListener = () => listener.dispose();
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar la hoja.');
      instance.current = null;
    }
    return () => {
      disposeListener?.();
      mount.remove();
      if (instance.current === owned) instance.current = null;
      // Univer owns a separate React root. Dispose after our React commit finishes.
      const app = owned;
      queueMicrotask(() => app?.univer.dispose());
    };
  }, [initial, attempt]);
  const apply = async () => {
    const app = instance.current;
    if (!app) return;
    setSaving(true); setError('');
    try {
      const book = app.univerAPI.getActiveWorkbook();
      if (!book) throw new Error('No se encuentra el libro.');
      if (book.isCellEditing() && !(await book.endEditingAsync(true))) throw new Error('Termina la edición de la celda para continuar.');
      await app.univerAPI.getFormula().onCalculationResultApplied(10000);
      const sheet = book.getActiveSheet();
      const rows = Math.min(10, sheet.getMaxRows());
      const columns = Math.min(6, sheet.getMaxColumns());
      onApply({ ...initial, title, engineVersion: UNIVER_VERSION, workbook: book.save(), preview: { sheetName: sheet.getSheetName(), rows: sheet.getRange(0, 0, rows, columns).getDisplayValues() } });
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar la hoja.'); }
    finally { setSaving(false); }
  };
  return <div className="space-y-3">
    <label className="grid gap-1 text-sm">Título<input className={fieldClass} value={title} onChange={e => { setTitle(e.target.value); onDirty(); }} /></label>
    <p className="text-xs text-muted">Fórmulas con nombres como SUM: =SUM(A1:A3). El motor no garantiza compatibilidad completa con Excel. Máximo 1 MiB por bloque y 5 MiB por cuaderno.</p>
    {error && <div role="alert"><p>{error}</p>{!ready && <button type="button" className={fieldClass} onClick={() => { setError(''); setAttempt(attempt + 1); }}>Reintentar</button>}</div>}
    <div ref={container} className="h-[max(360px,60dvh)] w-full overflow-hidden border border-line" onInput={onDirty} onKeyDown={e => {
      if (e.key === 'Escape' && (instance.current?.univerAPI.getActiveWorkbook()?.isCellEditing() || document.querySelector('[role="menu"]'))) e.stopPropagation();
    }} />
    <button type="button" className={fieldClass} disabled={!ready || busy || saving} onClick={() => void apply()}>{saving ? 'Calculando…' : 'Aplicar'}</button>
  </div>;
}
