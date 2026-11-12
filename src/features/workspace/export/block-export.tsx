import { renderToStaticMarkup } from 'react-dom/server';
import { attachmentDataURL } from '../../../infrastructure/storage/attachments';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { ChartGraphic, DataTable } from '../../editor/blocks/BlockPreview';
import { readBlock, type ChartBlockData } from '../../editor/blocks/note-blocks';

async function chartSVG(data: ChartBlockData): Promise<string> {
  // Recharts 3 computes its SVG after mount; server rendering produces an empty wrapper.
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:640px;height:280px';
  host.setAttribute('aria-hidden', 'true');
  document.body.append(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<ChartGraphic data={data} fixed />));
    for (let attempt = 0; attempt < 100; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 10));
      const svg = host.querySelector('svg[role="application"]');
      if (svg?.querySelector('.recharts-bar-rectangle, .recharts-line-curve, .recharts-line-dot, .recharts-pie-sector')) return svg.outerHTML;
    }
    throw new Error('No se pudo generar la gráfica para exportar. Inténtalo de nuevo.');
  } finally { root.unmount(); host.remove(); }
}

export async function exportNoteHTML(html: string): Promise<string> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const element of doc.querySelectorAll('[data-ntbk-block]')) {
    const data = readBlock(element.getAttribute('data-ntbk-block'), element.getAttribute('data-ntbk-payload'));
    const section = doc.createElement('section');
    if (!data) section.textContent = 'Bloque no compatible. Consulta la copia JSON para conservar sus datos.';
    else {
      const heading = doc.createElement('h2');
      heading.textContent = data.title;
      section.append(heading);
      const body = doc.createElement('div');
      body.innerHTML = 'series' in data
        ? (await chartSVG(data)) + renderToStaticMarkup(<DataTable headers={['Etiqueta', ...data.series.map(s => s.name)]} rows={data.rows.map(r => [r.label, ...r.values])} />)
        : renderToStaticMarkup(<><p>{data.preview.sheetName} · Vista previa parcial: primeras 10 filas y 6 columnas. La copia JSON contiene el libro editable completo.</p><DataTable rows={data.preview.rows} /></>);
      section.append(body);
    }
    element.replaceWith(section);
  }
  // Export is a passive document, including when content came from an imported backup.
  doc.querySelectorAll('script, iframe, object, embed, link, style, meta, base').forEach(el => el.remove());
  doc.querySelectorAll('*').forEach(el => {
    for (const attr of [...el.attributes]) {
      if (/^on/i.test(attr.name) || attr.name.startsWith('data-ntbk') || attr.name === 'data-block-id' || attr.name === 'srcdoc') el.removeAttribute(attr.name);
      if (['href', 'src', 'xlink:href'].includes(attr.name) && !/^(https?:|mailto:|#|data:image\/)/i.test(attr.value)) el.removeAttribute(attr.name);
    }
  });
  for (const element of doc.querySelectorAll('[data-attachment-id]')) {
    const id = element.getAttribute('data-attachment-id')!;
    const name = element.getAttribute('data-name') || 'Adjunto';
    const type = element.getAttribute('data-type') || '';
    const section = doc.createElement('figure');
    const url = await attachmentDataURL(id);
    if (type.startsWith('image/')) {
      const image = doc.createElement('img'); image.src = url; image.alt = name;
      image.style.maxWidth = '100%'; section.append(image);
    } else {
      const link = doc.createElement('a'); link.href = url; link.download = name; link.textContent = `PDF adjunto: ${name}`; section.append(link);
    }
    element.replaceWith(section);
  }
  return `<style>body{font:15px system-ui;max-width:900px;margin:2rem auto;padding:1rem}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:.4rem;text-align:left}svg{max-width:100%;height:auto}section{margin:2rem 0}</style>${doc.body.innerHTML}`;
}
