import type { IWorkbookData } from '@univerjs/core';
import type { Workspace } from '../../workspace/model/workspace';

export const UNIVER_VERSION = '1.4.0';
export const BLOCK_LIMIT = 1024 * 1024;
export const WORKSPACE_LIMIT = 5 * 1024 * 1024;
export type BlockKind = 'chart' | 'spreadsheet';
export interface ChartBlockData {
  version: 1;
  title: string;
  type: 'bar' | 'line' | 'pie';
  rows: { label: string; values: number[] }[];
  series: { name: string; color: string }[];
}
export interface SpreadsheetBlockData {
  version: 1;
  title: string;
  engine: 'univer';
  engineVersion: string;
  workbook: IWorkbookData;
  preview: { sheetName: string; rows: string[][] };
}
export type BlockData = ChartBlockData | SpreadsheetBlockData;
export const byteSize = (value: string) => new TextEncoder().encode(value).byteLength;
export function checkBlockContentSize(workspace: Workspace, noteId: string, content: string): string | null {
  const candidate = { ...workspace, notes: workspace.notes.map(note => note.id === noteId ? { ...note, content, updatedAt: new Date().toISOString() } : note) };
  return byteSize(JSON.stringify(candidate)) > WORKSPACE_LIMIT ? 'El cuaderno supera el límite de 5 MiB. Reduce los datos antes de aplicar.' : null;
}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export function parseDecimal(value: string): number | null {
  const text = value.trim();
  if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text)) return null;
  const number = Number(text.replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

export function isChartData(value: unknown): value is ChartBlockData {
  if (!record(value) || value.version !== 1 || typeof value.title !== 'string' || !['bar', 'line', 'pie'].includes(String(value.type))) return false;
  if (!Array.isArray(value.series) || !value.series.length || value.series.length > 8 || !Array.isArray(value.rows) || !value.rows.length || value.rows.length > 500) return false;
  const series = value.series;
  if (!series.every(s => record(s) && typeof s.name === 'string' && !!s.name.trim() && typeof s.color === 'string' && /^#[\da-f]{6}$/i.test(s.color))) return false;
  if (!value.rows.every(r => record(r) && typeof r.label === 'string' && !!r.label.trim() && Array.isArray(r.values) && r.values.length === series.length && r.values.every(n => typeof n === 'number' && Number.isFinite(n)))) return false;
  if (value.type === 'pie') {
    const rows = value.rows as ChartBlockData['rows'];
    if (series.length !== 1 || rows.some(r => r.values[0] < 0) || !rows.some(r => r.values[0] > 0)) return false;
  }
  return true;
}

export function isSpreadsheetData(value: unknown): value is SpreadsheetBlockData {
  if (!record(value) || value.version !== 1 || typeof value.title !== 'string' || value.engine !== 'univer' || typeof value.engineVersion !== 'string') return false;
  const w = value.workbook;
  if (!record(w) || typeof w.id !== 'string' || !Array.isArray(w.sheetOrder) || !w.sheetOrder.length || !record(w.sheets)) return false;
  const sheets = w.sheets;
  if (!w.sheetOrder.every(id => typeof id === 'string' && record(sheets[id]) && typeof sheets[id].name === 'string' && Number.isInteger(sheets[id].rowCount) && Number(sheets[id].rowCount) > 0 && Number.isInteger(sheets[id].columnCount) && Number(sheets[id].columnCount) > 0)) return false;
  const p = value.preview;
  return record(p) && typeof p.sheetName === 'string' && Array.isArray(p.rows) && p.rows.length <= 10 && p.rows.every(r => Array.isArray(r) && r.length <= 6 && r.every(c => typeof c === 'string'));
}

export function readBlock(kind: string | null, payload: string | null): BlockData | null {
  if (!payload || byteSize(payload) > BLOCK_LIMIT) return null;
  try {
    const value: unknown = JSON.parse(payload);
    return (kind === 'chart' ? isChartData(value) : kind === 'spreadsheet' && isSpreadsheetData(value)) ? value as BlockData : null;
  } catch { return null; }
}

export function blockText(data: BlockData): string {
  return 'series' in data
    ? [data.title, ...data.series.map(s => s.name), ...data.rows.map(r => `${r.label} ${r.values.join(' ')}`)].join('\n')
    : [data.title, data.preview.sheetName, ...data.preview.rows.map(r => r.join(' '))].join('\n');
}

export function newChart(): ChartBlockData {
  return { version: 1, title: 'Gráfica', type: 'bar', series: [{ name: 'Serie 1', color: '#5683c4' }], rows: [{ label: 'Enero', values: [10] }, { label: 'Febrero', values: [20] }, { label: 'Marzo', values: [15] }] };
}

export function newSpreadsheet(): SpreadsheetBlockData {
  const id = crypto.randomUUID();
  return {
    version: 1, title: 'Hoja de cálculo', engine: 'univer', engineVersion: UNIVER_VERSION,
    workbook: { id: crypto.randomUUID(), name: 'Libro', appVersion: UNIVER_VERSION, locale: 'esES', styles: {}, sheetOrder: [id], sheets: { [id]: { id, name: 'Hoja 1', rowCount: 100, columnCount: 26, cellData: {} } } } as IWorkbookData,
    preview: { sheetName: 'Hoja 1', rows: [] },
  };
}

export function blockHTML(kind: BlockKind, data: BlockData, id: string = crypto.randomUUID()): string {
  const element = document.createElement('div');
  element.setAttribute('data-ntbk-block', kind);
  element.setAttribute('data-block-id', id);
  element.setAttribute('data-ntbk-payload', JSON.stringify(data));
  element.textContent = blockText(data);
  return element.outerHTML;
}
