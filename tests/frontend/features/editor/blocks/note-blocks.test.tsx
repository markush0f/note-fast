// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Slice } from '@tiptap/pm/model';
import { BLOCK_LIMIT, WORKSPACE_LIMIT, checkBlockContentSize, blockHTML, byteSize, isChartData, isSpreadsheetData, newChart, newSpreadsheet, parseDecimal, readBlock } from '../../../../../src/features/editor/blocks/note-blocks';
import { ChartBlock, SpreadsheetBlock, BlockPaste, prepareBlockChange } from '../../../../../src/features/editor/extensions/note-block-extension';
import { plainText, createNote } from '../../../../../src/features/workspace/model/notes';
import { migrateWorkspace } from '../../../../../src/features/workspace/model/workspace';
import { parseBackup, serializeWorkspace } from '../../../../../src/features/workspace/export/backup';
import { exportNoteHTML } from '../../../../../src/features/workspace/export/block-export';

const editors: Editor[] = [];
const makeEditor = (content = '<p>Texto</p>') => {
  const editor = new Editor({ extensions: [StarterKit, ChartBlock, SpreadsheetBlock, BlockPaste], content });
  editors.push(editor);
  return editor;
};
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); });

describe('datos de bloques', () => {
  it('acepta solo decimales finitos sin separadores de miles', () => {
    expect(parseDecimal(' -1,25 ')).toBe(-1.25);
    expect(parseDecimal('.5')).toBe(.5);
    for (const input of ['', '1,234.5', '1 000', 'Infinity', 'NaN', '1e5', '0xff']) expect(parseDecimal(input)).toBeNull();
    expect(byteSize('á')).toBe(2);
  });
  it('comprueba el tamaño UTF-8 del cuaderno completo sin mutarlo', () => {
    const note = createNote();
    const workspace = { version: 4 as const, notes: [note], notebooks: [] };
    expect(checkBlockContentSize(workspace, note.id, '<p>Pequeño</p>')).toBeNull();
    expect(checkBlockContentSize(workspace, note.id, 'á'.repeat(WORKSPACE_LIMIT / 2))).toContain('5 MiB');
    expect(note.content).toBe('');
  });
  it('valida filas, series y restricciones de sectores', () => {
    const data = newChart();
    expect(isChartData(data)).toBe(true);
    expect(isChartData({ ...data, rows: [] })).toBe(false);
    expect(isChartData({ ...data, series: [{ name: '', color: 'red' }] })).toBe(false);
    expect(isChartData({ ...data, rows: [{ label: 'a', values: [Infinity] }] })).toBe(false);
    expect(isChartData({ ...data, rows: Array(501).fill(data.rows[0]) })).toBe(false);
    expect(isChartData({ ...data, series: Array(9).fill(data.series[0]) })).toBe(false);
    expect(isChartData({ ...data, type: 'pie' })).toBe(true);
    expect(isChartData({ ...data, type: 'pie', rows: [{ label: 'a', values: [-1] }] })).toBe(false);
    expect(isChartData({ ...data, type: 'pie', rows: [{ label: 'a', values: [0] }] })).toBe(false);
  });
  it('valida libros y rechaza JSON dañado, excesivo o de versión desconocida', () => {
    expect(isSpreadsheetData(newSpreadsheet())).toBe(true);
    expect(isSpreadsheetData({ ...newSpreadsheet(), workbook: {} })).toBe(false);
    expect(readBlock('chart', '{')).toBeNull();
    expect(readBlock('chart', ' '.repeat(BLOCK_LIMIT + 1))).toBeNull();
    expect(readBlock('chart', JSON.stringify({ ...newChart(), version: 99 }))).toBeNull();
    expect(readBlock('unknown', JSON.stringify(newChart()))).toBeNull();
  });
});

describe('documentos con bloques', () => {
  it('hace round-trip de HTML con escapes sin interpretar datos como HTML', () => {
    const data = { ...newChart(), title: '<img src=x onerror=alert(1)> " &', rows: [{ label: '<script>test</script>', values: [1] }] };
    const editor = makeEditor(blockHTML('chart', data));
    const html = editor.getHTML();
    expect(html).toContain('&quot;');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelector('img,script')).toBeNull();
    expect(readBlock('chart', doc.querySelector('[data-ntbk-block]')!.getAttribute('data-ntbk-payload'))).toEqual(data);
    const sheet = newSpreadsheet();
    editor.commands.setContent(blockHTML('spreadsheet', sheet));
    expect(readBlock('spreadsheet', editor.state.doc.firstChild!.attrs.payload)).toEqual(sheet);
  });
  it('conserva payloads desconocidos al editar texto vecino', () => {
    const doc = document.createElement('div');
    doc.setAttribute('data-ntbk-block', 'chart');
    doc.setAttribute('data-block-id', 'future');
    doc.setAttribute('data-ntbk-payload', '{"version":99,"extra":"original"}');
    const editor = makeEditor(doc.outerHTML + '<p>Texto</p>');
    editor.commands.insertContentAt(editor.state.doc.content.size - 1, ' nuevo');
    expect(editor.getHTML()).toContain('&quot;extra&quot;:&quot;original&quot;');
  });
  it('aplica una transacción, conserva el borrador antes de despachar y soporta deshacer/rehacer', () => {
    const editor = makeEditor();
    const original = editor.getHTML();
    const change = prepareBlockChange(editor, 'chart', newChart());
    expect(editor.getHTML()).toBe(original);
    editor.view.dispatch(change.transaction);
    const inserted = editor.getHTML();
    expect(inserted).toContain('data-ntbk-block="chart"');
    expect(editor.state.doc.lastChild!.type.name).toBe('paragraph');
    expect(editor.commands.undo()).toBe(true);
    expect(editor.getHTML()).toBe(original);
    expect(editor.commands.redo()).toBe(true);
    expect(editor.getHTML()).toBe(inserted);
    const id = editor.state.doc.firstChild!.attrs.id as string;
    const edit = prepareBlockChange(editor, 'chart', { ...newChart(), title: 'Otra' }, id);
    editor.view.dispatch(edit.transaction);
    expect(editor.getHTML()).toContain('Otra');
    editor.commands.undo();
    expect(editor.getHTML()).toBe(inserted);
  });
  it('asigna nuevos IDs al pegar sin perder datos', () => {
    const editor = makeEditor(blockHTML('chart', newChart(), 'source'));
    let slice = new Slice(editor.state.doc.content, 0, 0);
    editor.view.someProp('transformPasted', transform => { slice = transform(slice, editor.view, false); return false; });
    expect(slice.content.firstChild!.attrs.id).not.toBe('source');
    expect(slice.content.firstChild!.attrs.payload).toBe(editor.state.doc.firstChild!.attrs.payload);
  });
  it('migra v2 y legacy a v4, y exporta/importa sin perder libros', () => {
    const note = { ...createNote(), content: blockHTML('spreadsheet', newSpreadsheet()) + blockHTML('chart', newChart()) };
    const workspace = migrateWorkspace({ version: 2, notes: [note], folders: [], theme: 'dark' })!;
    expect(workspace.version).toBe(4);
    expect(workspace.notes[0]).toEqual(note);
    expect(parseBackup(serializeWorkspace(workspace))).toEqual(workspace);
    expect(migrateWorkspace([note])!.version).toBe(4);
    expect(() => migrateWorkspace({ version: 99, notes: [], folders: [] })).toThrow();
  });
  it('indexa solo texto visible, no snapshots internos', () => {
    const sheet = newSpreadsheet();
    sheet.preview.rows = [['resultado', '#DIV/0!']];
    const text = plainText(blockHTML('chart', newChart()) + blockHTML('spreadsheet', sheet));
    expect(text).toContain('Enero');
    expect(text).toContain('resultado');
    expect(text).toContain('#DIV/0!');
    expect(text).not.toContain('sheetOrder');
    expect(text).not.toContain('engineVersion');
  });
  it('exporta SVG y tablas estáticas, sin scripts ni snapshots', async () => {
    const html = await exportNoteHTML(blockHTML('chart', newChart()) + blockHTML('spreadsheet', newSpreadsheet()) + '<script>alert(1)</script><a href="javascript:alert(1)" onclick="bad()">a</a>');
    expect(html).toContain('<svg');
    expect(html).toContain('<table');
    expect(html).toContain('Vista previa parcial');
    expect(html).not.toContain('data-ntbk');
    expect(html).not.toContain('sheetOrder');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('javascript:');
  });
});
