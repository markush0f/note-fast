// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newSpreadsheet, type SpreadsheetBlockData } from '../lib/note-blocks';

const mocks = vi.hoisted(() => ({ create: vi.fn(), dispose: vi.fn(), disposeListener: vi.fn(), endEditing: vi.fn(), calculated: vi.fn(), save: vi.fn() }));
vi.mock('@univerjs/presets', () => ({ createUniver: mocks.create, LocaleType: { ES_ES: 'esES' }, mergeLocales: (value: unknown) => value }));
vi.mock('@univerjs/preset-sheets-core', () => ({ UniverSheetsCorePreset: () => ({}) }));
vi.mock('@univerjs/preset-sheets-core/locales/es-ES', () => ({ default: {} }));
import SpreadsheetEditor from './SpreadsheetEditor';

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  vi.resetAllMocks();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  mocks.endEditing.mockResolvedValue(true); mocks.calculated.mockResolvedValue(undefined);
  mocks.save.mockImplementation(() => newSpreadsheet().workbook);
  const book = {
    onCommandExecuted: () => ({ dispose: mocks.disposeListener }),
    isCellEditing: () => true, endEditingAsync: mocks.endEditing, save: mocks.save,
    getActiveSheet: () => ({ getMaxRows: () => 100, getMaxColumns: () => 26, getSheetName: () => 'Hoja 1', getRange: () => ({ getDisplayValues: () => [['6', '#DIV/0!']] }) }),
  };
  mocks.create.mockReturnValue({ univer: { dispose: mocks.dispose }, univerAPI: { createWorkbook: () => book, getActiveWorkbook: () => book, getFormula: () => ({ onCalculationResultApplied: mocks.calculated }) } });
});
afterEach(async () => { await act(async () => { root.unmount(); await Promise.resolve(); }); host.remove(); });

describe('adaptador Univer', () => {
  it('solo guarda al aplicar, termina la celda y espera a los resultados calculados', async () => {
    const apply = vi.fn((_data: SpreadsheetBlockData) => {});
    await act(async () => root.render(createElement(SpreadsheetEditor, { initial: newSpreadsheet(), onDirty: vi.fn(), onApply: apply, busy: false })));
    expect(apply).not.toHaveBeenCalled();
    await act(async () => { host.querySelector('button')!.click(); await Promise.resolve(); });
    expect(mocks.endEditing).toHaveBeenCalledWith(true);
    expect(mocks.calculated).toHaveBeenCalledWith(10000);
    expect(apply.mock.calls[0][0].preview.rows).toEqual([['6', '#DIV/0!']]);
    await act(async () => root.unmount());
    expect(mocks.disposeListener).toHaveBeenCalledOnce();
    expect(mocks.dispose).toHaveBeenCalledOnce();
  });
  it('conserva el snapshot si la versión del motor es distinta', async () => {
    const initial = { ...newSpreadsheet(), engineVersion: '99.0.0' };
    await act(async () => root.render(createElement(SpreadsheetEditor, { initial, onDirty: vi.fn(), onApply: vi.fn(), busy: false })));
    expect(mocks.create).not.toHaveBeenCalled();
    expect(host.querySelector('[role=alert]')?.textContent).toContain('Versión de hoja no compatible');
  });
  it('no aplica datos si el cálculo falla', async () => {
    mocks.calculated.mockRejectedValue(new Error('Cálculo no disponible'));
    const apply = vi.fn();
    await act(async () => root.render(createElement(SpreadsheetEditor, { initial: newSpreadsheet(), onDirty: vi.fn(), onApply: apply, busy: false })));
    await act(async () => { host.querySelector('button')!.click(); await Promise.resolve(); });
    expect(apply).not.toHaveBeenCalled();
    expect(host.querySelector('[role=alert]')?.textContent).toContain('Cálculo no disponible');
  });
});
