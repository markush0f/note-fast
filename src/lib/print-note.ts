const PRINT_STYLES = `
  :root { color-scheme: light; }
  body { color: #111; background: #fff; overflow-wrap: anywhere; }
  .print-controls { font: 14px system-ui; padding-bottom: 1rem; border-bottom: 1px solid #ddd; }
  .print-controls button { cursor: pointer; padding: .5rem 1rem; }
  .print-controls p { margin-bottom: 0; }
  img, svg { max-width: 100%; height: auto; }
  pre { white-space: pre-wrap; }
  blockquote { margin-left: 0; padding-left: 1rem; border-left: 3px solid #bbb; }
  table { table-layout: fixed; }
  tr, img, svg { break-inside: avoid; }
  h1, h2, h3, h4 { break-after: avoid; }
  @page { size: A4; margin: 18mm; }
  @media print {
    body { max-width: none; margin: 0; padding: 0; }
    .print-controls { display: none; }
    a { color: inherit; text-decoration: underline; }
    * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  }
`;

/** Open synchronously during the click so popup blockers do not block the print view. */
export async function printNote(title: string, html: string): Promise<void> {
  const view = window.open('', '_blank');
  if (!view) throw new Error('Permite las ventanas emergentes para exportar la nota como PDF.');
  view.opener = null;
  const doc = view.document;
  doc.title = title || 'Sin título';
  doc.documentElement.lang = 'es';
  doc.body.textContent = 'Preparando nota para PDF…';

  try {
    const { exportNoteHTML } = await import('./block-export');
    const content = await exportNoteHTML(html);
    if (view.closed) return;
    doc.body.replaceChildren();
    const controls = doc.createElement('div');
    controls.className = 'print-controls';
    const button = doc.createElement('button');
    button.type = 'button';
    button.textContent = 'Imprimir / Guardar como PDF';
    button.onclick = () => { view.focus(); view.print(); };
    const hint = doc.createElement('p');
    hint.textContent = 'Elige «Guardar como PDF» como destino en el diálogo de impresión. Puedes cerrar esta pestaña al terminar.';
    controls.append(button, hint);
    const heading = doc.createElement('h1');
    heading.textContent = title || 'Sin título';
    const article = doc.createElement('article');
    article.innerHTML = content;
    const style = doc.createElement('style');
    style.textContent = PRINT_STYLES;
    doc.body.append(controls, heading, article, style);
    await Promise.all([...doc.images].map(image => image.decode().catch(() => {})));
    await doc.fonts?.ready;
    if (!view.closed) {
      view.focus();
      view.print();
    }
  } catch (error) {
    if (!view.closed) view.close();
    throw error;
  }
}
