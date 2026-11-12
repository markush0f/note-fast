import { useEffect, useState } from 'react';
import { Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { loadAttachment, attachmentAccount, type Attachment } from './attachments';
import { Download, MediaImage, Page, Trash } from '../components/icons';

function AttachmentView({ node, deleteNode, selected }: NodeViewProps) {
  const file = node.attrs as Attachment;
  const [url, setURL] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
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
  return <NodeViewWrapper contentEditable={false} className={`my-4 rounded-lg border bg-surface p-3 ${selected ? 'border-strong' : 'border-line'}`}>
    {file.type.startsWith('image/') && url && <img src={url} alt={file.name} className="mx-auto mb-3 max-h-150 max-w-full rounded object-contain" />}
    <div className="flex items-center gap-2 text-sm">
      {file.type.startsWith('image/') ? <MediaImage size={18} /> : <Page size={18} />}
      <span className="min-w-0 flex-1 break-words">{file.name} <span className="text-muted">({file.size < 1024 ? `${file.size} B` : file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)} KiB` : `${(file.size / (1024 * 1024)).toFixed(1)} MiB`})</span></span>
      {url && <a href={url} download={file.name} aria-label={`Descargar ${file.name}`} className="rounded p-2 hover:bg-hover"><Download size={16} /></a>}
      <button type="button" aria-label={`Eliminar adjunto ${file.name}`} className="rounded p-2 hover:bg-hover" onClick={() => { if (window.confirm('¿Quitar este adjunto de la nota?')) deleteNode(); }}><Trash size={16} /></button>
    </div>
    {error ? <p role="alert" className="mt-2 text-sm text-muted">{error} <button type="button" className="underline" onClick={() => setRetry(value => value + 1)}>Reintentar</button></p> : !url && <p role="status" className="mt-2 text-sm text-muted">Cargando adjunto…</p>}
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
