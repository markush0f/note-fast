import { Extension, Node, mergeAttributes, type Editor } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { Fragment, Slice, DOMSerializer } from '@tiptap/pm/model';
import { Plugin } from '@tiptap/pm/state';
import { closeHistory } from '@tiptap/pm/history';
import BlockPreview from '../blocks/BlockPreview';
import { blockText, readBlock, type BlockData, type BlockKind } from '../blocks/note-blocks';

export const EDIT_BLOCK_EVENT = 'ntbk-edit-block';
export interface EditBlockDetail { kind: BlockKind; id: string; data: BlockData }
function BlockView({ node, editor, deleteNode, selected }: NodeViewProps) {
  const kind: BlockKind = node.type.name === 'chartBlock' ? 'chart' : 'spreadsheet';
  const data = readBlock(kind, node.attrs.payload);
  return <NodeViewWrapper contentEditable={false} className={`my-4 rounded-lg border bg-surface p-4 ${selected ? 'border-strong' : 'border-line'}`}>
    {data ? <BlockPreview data={data} /> : <p role="alert">Bloque dañado o de versión desconocida. Sus datos se conservan.</p>}
    <div className="mt-3 flex gap-4 text-sm">
      <button type="button" disabled={!data} className="underline disabled:opacity-40" onClick={() => editor.view.dom.dispatchEvent(new CustomEvent<EditBlockDetail>(EDIT_BLOCK_EVENT, { bubbles: true, detail: { kind, id: node.attrs.id, data: data! } }))}>Editar</button>
      <button type="button" className="underline" onClick={() => { if (window.confirm('¿Eliminar este bloque?')) deleteNode(); }}>Eliminar</button>
    </div>
  </NodeViewWrapper>;
}

function blockNode(name: string, kind: BlockKind) {
  return Node.create({
    name, group: 'block', atom: true, selectable: true, draggable: false,
    addAttributes() { return {
      id: { default: null, parseHTML: el => el.getAttribute('data-block-id'), renderHTML: attrs => ({ 'data-block-id': attrs.id }) },
      payload: { default: '', parseHTML: el => el.getAttribute('data-ntbk-payload') ?? '', renderHTML: attrs => ({ 'data-ntbk-payload': attrs.payload }) },
    }; },
    parseHTML() { return [{ tag: `div[data-ntbk-block="${kind}"]` }]; },
    renderHTML({ HTMLAttributes, node }) {
      const data = readBlock(kind, node.attrs.payload);
      return ['div', mergeAttributes(HTMLAttributes, { 'data-ntbk-block': kind }), data ? blockText(data) : 'Bloque no compatible'];
    },
    renderText({ node }) { const data = readBlock(kind, node.attrs.payload); return data ? blockText(data) : ''; },
    addNodeView() { return ReactNodeViewRenderer(BlockView); },
  });
}
export const ChartBlock = blockNode('chartBlock', 'chart');
export const SpreadsheetBlock = blockNode('spreadsheetBlock', 'spreadsheet');

export const BlockPaste = Extension.create({
  name: 'blockPaste',
  addProseMirrorPlugins() { return [new Plugin({ props: {
    transformPasted(slice) {
      const copy = (fragment: Fragment): Fragment => {
        const nodes: import('@tiptap/pm/model').Node[] = [];
        fragment.forEach(node => nodes.push(node.type.name === 'chartBlock' || node.type.name === 'spreadsheetBlock'
          ? node.type.create({ ...node.attrs, id: crypto.randomUUID() })
          : node.copy(copy(node.content))));
        return Fragment.fromArray(nodes);
      };
      return new Slice(copy(slice.content), slice.openStart, slice.openEnd);
    },
  } })]; },
});

export function prepareBlockChange(editor: Editor, kind: BlockKind, data: BlockData, id?: string) {
  const attrs = { id: id ?? crypto.randomUUID(), payload: JSON.stringify(data) };
  let tr = closeHistory(editor.state.tr);
  if (id) {
    let position: number | undefined;
    editor.state.doc.descendants((node, pos) => { if (node.attrs.id === id && ['chartBlock', 'spreadsheetBlock'].includes(node.type.name)) position = pos; });
    if (position === undefined) throw new Error('El bloque ya no existe.');
    tr = tr.setNodeMarkup(position, undefined, attrs);
  } else {
    const node = editor.schema.nodes[kind === 'chart' ? 'chartBlock' : 'spreadsheetBlock'].create(attrs);
    tr = tr.replaceSelection(new Slice(Fragment.fromArray([node, editor.schema.nodes.paragraph.create()]), 0, 0));
  }
  const container = document.createElement('div');
  container.append(DOMSerializer.fromSchema(editor.schema).serializeFragment(tr.doc.content));
  return { transaction: tr, html: container.innerHTML };
}
