import { useEffect, useState } from 'react';
import { Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { loadAttachment, attachmentAccount, type Attachment } from './attachments';
import { Check, Copy, Download, Page, Trash } from '../components/icons';

function AttachmentView({ node, deleteNode, selected }: NodeViewProps) {
  const file = node.attrs as Attachment;
  const [url, setURL] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [copied, setCopied] = useState(false);
  const isImage = file.type.startsWith('image/');
  const owner = attachmentAccount();
  useEffect(() => {
    let active = true;
    let objectURL = '';
    setError(''); setURL('');
    void loadAttachment(file.id, owner).then(blob => {
      if (!active) return;
      objectURL = URL.createObjectURL(blob); setURL(objectURL);
    }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudo abrir el adjunto.'); });
    return () => { active = false; if (objectURL) URL.revokeObjectURL(objectURL); };
  }, [file.id, owner, retry]);
  const copyImage = async () => {
    try {
      if (!url || !navigator.clipboard?.write || typeof ClipboardItem === 'undefined') throw new Error('Copia de imágenes no disponible en este navegador.');
      const blob = await loadAttachment(file.id, owner);
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo copiar la imagen.');
    }
  };
  const remove = () => { if (window.confirm('¿Quitar este adjunto de la nota?')) deleteNode(); };
  const actions = <div className="absolute top-2 right-2 flex gap-1 rounded-lg bg-surface/95 p-1 shadow-md ring-1 ring-black/10 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
    {isImage && <button type="button" aria-label={`Copiar ${file.name}`} title="Copiar imagen" className="rounded p-2 text-ink hover:bg-hover focus-visible:outline-2 focus-visible:outline-strong" onClick={() => void copyImage()}>{copied ? <Check size={16} /> : <Copy size={16} />}</button>}
    {url && <a href={url} download={file.name} aria-label={`Descargar ${file.name}`} title="Descargar" className="rounded p-2 text-ink hover:bg-hover focus-visible:outline-2 focus-visible:outline-strong"><Download size={16} /></a>}
    <button type="button" aria-label={`Eliminar adjunto ${file.name}`} title="Eliminar" className="rounded p-2 text-ink hover:bg-hover focus-visible:outline-2 focus-visible:outline-strong" onClick={remove}><Trash size={16} /></button>
  </div>;
  if (isImage) return <NodeViewWrapper contentEditable={false} className="my-4">
    <figure className={`group relative m-0 w-fit max-w-full ${selected ? 'outline-2 outline-offset-2 outline-strong' : ''}`}>
      {url ? <img src={url} alt={file.name} className="block max-h-150 max-w-full object-contain" /> : <p role={error ? 'alert' : 'status'} className="text-sm text-muted">{error || 'Cargando imagen…'}</p>}
      {url && actions}
      {error && <p role="alert" className="mt-1 text-xs text-danger">{error} <button type="button" className="underline" onClick={() => setRetry(value => value + 1)}>Reintentar</button></p>}
    </figure>
  </NodeViewWrapper>;
  return <NodeViewWrapper contentEditable={false} className="my-4">
    <div className={`group relative flex items-center gap-2 ${selected ? 'rounded outline-2 outline-strong' : ''}`}>
      <Page size={18} /><span className="flex-1 text-sm">{file.name}</span>
      {actions}
      {error && <p role="alert" className="text-xs text-danger">{error} <button type="button" className="underline" onClick={() => setRetry(value => value + 1)}>Reintentar</button></p>}
    </div>
  </NodeViewWrapper>;
}

export const AttachmentNode = Node.create({
  name: 'attachment', group: 'block', atom: true, selectable: true,
  addAttributes() {
    return Object.fromEntries(['id', 'name', 'type', 'size'].map(key => [key, {
      default: key === 'size' ? 0 : '',
      parseHTML: (element: HTMLElement) => key === 'size' ? Number(element.getAttribute('data-size')) : element.getAttribute(key === 'id' ? 'data-attachment-id' : `data-${key}`) ?? '',
      renderHTML: (attrs: Record<string, unknown>) => ({ [key === 'id' ? 'data-attachment-id' : `data-${key}`]: attrs[key] }),
    }]));
  },
  parseHTML() { return [{ tag: 'figure[data-attachment-id]' }]; },
  renderHTML({ HTMLAttributes, node }) { return ['figure', HTMLAttributes, String(node.attrs.name)]; },
  renderText({ node }) { return String(node.attrs.name); },
  addNodeView() { return ReactNodeViewRenderer(AttachmentView); },
});
