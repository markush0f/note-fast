// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { printNote } from './print-note';

vi.mock('./block-export', () => ({ exportNoteHTML: vi.fn(async () => '<p>Contenido</p><svg></svg><table><tbody><tr><td>Vista previa</td></tr></tbody></table>') }));

function mockView() {
  const document = window.document.implementation.createHTMLDocument();
  const view = { document, opener: window, closed: false, focus: vi.fn(), print: vi.fn(), close: vi.fn() };
  vi.spyOn(window, 'open').mockReturnValue(view as unknown as Window);
  return view;
}

afterEach(() => vi.restoreAllMocks());

describe('PDF print view', () => {
  it('opens synchronously and prints a clean document with a safely escaped title', async () => {
    const view = mockView();
    const pending = printNote('<img src=x onerror=alert(1)>', '<p>Nota</p>');
    expect(window.open).toHaveBeenCalledWith('', '_blank');
    await pending;
    expect(view.opener).toBeNull();
    expect(view.document.querySelector('h1')?.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(view.document.querySelector('h1 img')).toBeNull();
    expect(view.document.querySelector('article svg')).not.toBeNull();
    expect(view.document.querySelector('article table')?.textContent).toBe('Vista previa');
    expect(view.document.body.textContent).toContain('@media print');
    expect(view.print).toHaveBeenCalledOnce();
    view.document.querySelector('button')!.click();
    expect(view.print).toHaveBeenCalledTimes(2);
  });

  it('explains how to recover when the popup is blocked', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    await expect(printNote('Nota', '')).rejects.toThrow('Permite las ventanas emergentes');
  });

  it('closes the blank view when content export fails', async () => {
    const view = mockView();
    const { exportNoteHTML } = await import('./block-export');
    vi.mocked(exportNoteHTML).mockRejectedValueOnce(new Error('Error de gráfica'));
    await expect(printNote('Nota', '')).rejects.toThrow('Error de gráfica');
    expect(view.close).toHaveBeenCalledOnce();
    expect(view.print).not.toHaveBeenCalled();
  });

  it('does not print if the user closes the view during export', async () => {
    const view = mockView();
    const pending = printNote('', '');
    view.closed = true;
    await pending;
    expect(view.print).not.toHaveBeenCalled();
  });
});
