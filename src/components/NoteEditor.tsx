import { useState, useRef, useEffect } from "react";
import BlockDialog from './BlockDialog';
import { AttachmentNode } from '../lib/attachment-extension';
import { FILE_ACCEPT, storeAttachment } from '../lib/attachments';
import { ChartBlock, SpreadsheetBlock, BlockPaste, EDIT_BLOCK_EVENT, prepareBlockChange, type EditBlockDetail } from '../lib/note-block-extension';
import { BLOCK_LIMIT, byteSize, newChart, newSpreadsheet, type BlockData, type BlockKind } from '../lib/note-blocks';
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { TextStyle, FontSize, Color } from "@tiptap/extension-text-style";
import { characterCount, wordCount, plainText, type Note } from "../lib/notes";
import type { ToolbarPlacement } from "../lib/editor-layout";
import { NoteLink, type NoteLinkSuggestion } from "../lib/note-link-extension";
import { noteTitle, rankNoteLinks } from "../lib/note-links";
import FloatingToolbar from "./FloatingToolbar";
import NoteLinkMenu from "./NoteLinkMenu";

const editorClasses = [
  "min-h-75 text-[15px] leading-[1.8] text-secondary outline-none [overflow-wrap:anywhere]",
  "[&_p]:mb-3.5 [&_strong]:font-semibold",
  "[&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-[26px] [&_h1]:leading-snug [&_h1]:font-semibold [&_h1]:text-ink",
  "[&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-[21px] [&_h2]:leading-snug [&_h2]:font-semibold [&_h2]:text-ink",
  "[&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:leading-snug [&_h3]:font-semibold [&_h3]:text-ink",
  "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5.5 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5.5 [&_li_p]:mb-1",
  "[&_blockquote]:my-5.5 [&_blockquote]:border-l-2 [&_blockquote]:border-strong [&_blockquote]:pl-4.5 [&_blockquote]:text-muted",
  "[&_code]:rounded-sm [&_code]:bg-soft [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.9em]",
  "[&_pre]:mb-4 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-subtle [&_pre]:p-4 [&_pre]:font-mono [&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_a]:underline [&_a]:underline-offset-3 [&_a.note-link]:text-ink [&_a.note-link]:decoration-strong [&_s]:line-through [&_hr]:my-6 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-line",
  "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0 [&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:items-baseline [&_ul[data-type=taskList]_li]:gap-2 [&_ul[data-type=taskList]_li>div]:flex-1 [&_input[type=checkbox]]:accent-primary",
  "[&>p.is-editor-empty:first-child]:before:pointer-events-none [&>p.is-editor-empty:first-child]:before:float-left [&>p.is-editor-empty:first-child]:before:h-0 [&>p.is-editor-empty:first-child]:before:text-faint [&>p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
].join(" ");

interface Props {
  note: Note;
  onChange: (content: string) => void;
  onTitleChange: (title: string) => void;
  toolbarPosition: ToolbarPlacement;
  onToolbarPositionChange: (position: ToolbarPlacement) => void;
  notes: Note[];
  onOpenNote: (id: string) => void;
  checkBlockContent: (content: string) => string | null;
}

export default function NoteEditor({
  note,
  onChange,
  onTitleChange,
  toolbarPosition,
  onToolbarPositionChange,
  notes,
  onOpenNote,
  checkBlockContent,
}: Props) {
  const boundaryRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const attachRef = useRef<(files: File[]) => void>(() => {});
  const [fileError, setFileError] = useState('');
  const [attaching, setAttaching] = useState(false);
  const [draft, setDraft] = useState<{ kind: BlockKind; data: BlockData; id?: string } | null>(null);
  const [writing, setWriting] = useState(false);
  const [suggestion, setSuggestion] = useState<NoteLinkSuggestion | null>(null);
  const [linkIndex, setLinkIndex] = useState(0);
  const openRef = useRef(onOpenNote);
  const suggestionRef = useRef(suggestion);
  const matchesRef = useRef<Note[]>([]);
  const indexRef = useRef(0);
  const insertRef = useRef<(target: Note) => void>(() => undefined);
  openRef.current = onOpenNote;
  suggestionRef.current = suggestion;
  indexRef.current = linkIndex;
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
      NoteLink.configure({
        onSuggest: (next) => {
          setSuggestion(next);
          setLinkIndex(0);
        },
      }),
      Placeholder.configure({ placeholder: "Escribe…" }),
      TaskList,
      TaskItem.configure({ nested: true }),
      ChartBlock,
      SpreadsheetBlock,
      AttachmentNode,
      BlockPaste,
      TextStyle,
      FontSize,
      Color,
    ],
    content: note.content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: editorClasses,
        "aria-label": "Contenido de la nota",
        role: "textbox",
        "aria-multiline": "true",
      },
      handlePaste: (_view, event) => {
        const clipboard = event.clipboardData;
        const files = [...(clipboard?.files ?? [])];
        // Some browsers expose pasted screenshots only as image/* clipboard items,
        // with an empty FileList. Prefer the item representation in that case.
        const images = [...(clipboard?.items ?? [])]
          .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
          .map(item => item.getAsFile())
          .filter((file): file is File => Boolean(file));
        const attachments = files.length ? files : images;
        if (!attachments.length) return false;
        event.preventDefault();
        attachRef.current(attachments);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        const files = [...(event.dataTransfer?.files ?? [])];
        if (moved || !files.length) return false;
        event.preventDefault();
        const position = view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (position) editor?.commands.setTextSelection(position.pos);
        attachRef.current(files); return true;
      },
      handleDOMEvents: {
        focus: () => {
          setWriting(true);
          return false;
        },
        blur: () => {
          setWriting(false);
          return false;
        },
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target;
        if (!(target instanceof Element)) return false;
        const id = target.closest("a[data-note-id]")?.getAttribute("data-note-id");
        if (!id) return false;
        event.preventDefault();
        openRef.current(id);
        return true;
      },
      handleKeyDown: (_view, event) => {
        const current = suggestionRef.current;
        const matches = matchesRef.current;
        if (!current) return false;
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setSuggestion(null);
          return true;
        }
        if (!matches.length) return false;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const delta = event.key === "ArrowDown" ? 1 : -1;
          const next = (indexRef.current + delta + matches.length) % matches.length;
          indexRef.current = next;
          setLinkIndex(next);
          return true;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          insertRef.current(matches[indexRef.current]);
          return true;
        }
        return false;
      },
    },
  });
  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.getHTML() !== note.content) editor.commands.setContent(note.content, { emitUpdate: false });
  }, [editor, note.content]);
  attachRef.current = (files) => {
    if (!editor || attaching) return;
    setAttaching(true); setFileError('');
    void (async () => {
      try {
        for (const file of files) {
          const attachment = await storeAttachment(file);
          if (editor.isDestroyed) return;
          editor.chain().focus().insertContentAt(editor.state.selection.to, [{ type: 'attachment', attrs: attachment }, { type: 'paragraph' }]).run();
        }
      } catch (error) { setFileError(error instanceof Error ? error.message : 'No se pudo guardar el adjunto.'); }
      finally { setAttaching(false); }
    })();
  };
  useEffect(() => {
    const boundary = boundaryRef.current;
    if (!boundary) return;
    const open = (event: Event) => setDraft((event as CustomEvent<EditBlockDetail>).detail);
    boundary.addEventListener(EDIT_BLOCK_EVENT, open);
    return () => boundary.removeEventListener(EDIT_BLOCK_EVENT, open);
  }, [editor]);
  const applyBlock = (data: BlockData) => {
    if (!editor || !draft) return 'No se encuentra el editor.';
    if (byteSize(JSON.stringify(data)) > BLOCK_LIMIT) return 'El bloque supera el límite de 1 MiB. Reduce sus datos.';
    try {
      const { transaction, html } = prepareBlockChange(editor, draft.kind, data, draft.id);
      const error = checkBlockContent(html);
      if (error) return error;
      editor.view.dispatch(transaction);
      return null;
    } catch (error) { return error instanceof Error ? error.message : 'No se pudo aplicar el bloque.'; }
  };
  insertRef.current = (target: Note) => {
    const current = suggestionRef.current;
    if (!editor || !current) return;
    editor
      .chain()
      .focus()
      .insertContentAt(
        { from: current.from, to: current.to },
        [
          {
            type: "text",
            text: noteTitle(target.title),
            marks: [{ type: "noteLink", attrs: { id: target.id } }],
          },
          { type: "text", text: " " },
        ],
      )
      .run();
    setSuggestion(null);
  };
  const matches = suggestion
    ? rankNoteLinks(notes, suggestion.query, note.id)
    : [];
  matchesRef.current = matches;

  const text = useEditorState({
    editor,
    selector: ({ editor }) => editor && !editor.isDestroyed ? editor.getText() : null,
  });
  const words = wordCount(text ?? plainText(note.content));
  const characters = characterCount(text ?? plainText(note.content));

  if (!editor) return null;
  return (
    <div
      ref={boundaryRef}
      className="relative isolate flex min-h-0 flex-1 flex-col"
    >
      <input ref={fileInput} type="file" multiple accept={FILE_ACCEPT} className="hidden" aria-label="Seleccionar imágenes o PDF" onChange={event => { attachRef.current([...(event.target.files ?? [])]); event.target.value = ''; }} />
      {(fileError || attaching) && <p className="px-6 py-2 text-sm text-muted" role={fileError ? 'alert' : 'status'}>{fileError || 'Guardando adjunto en este dispositivo…'}</p>}
      {draft && <BlockDialog initial={draft.data} onApply={applyBlock} onClose={() => setDraft(null)} />}
      <FloatingToolbar
        onInsertAttachment={() => fileInput.current?.click()}
        onInsertBlock={kind => setDraft({ kind, data: kind === 'chart' ? newChart() : newSpreadsheet() })}
        editor={editor}
        boundaryRef={boundaryRef}
        placement={toolbarPosition}
        onPlacementChange={onToolbarPositionChange}
      />
      <div
        className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]"
        data-document-scroll
      >
        <article className="mx-auto w-full max-w-190 px-6 pt-20 pb-24 min-[651px]:px-8 min-[901px]:px-12 min-[901px]:pb-28">
          <input
            className="block w-full bg-transparent p-0 text-[28px] leading-snug font-semibold tracking-tight outline-none placeholder:text-faint min-[651px]:text-3xl"
            aria-label="Título de la nota"
            placeholder="Sin título"
            value={note.title}
            onChange={(event) => onTitleChange(event.target.value)}
            onFocus={() => setWriting(true)}
            onBlur={() => setWriting(false)}
          />
          <EditorContent editor={editor} className="mt-6" />
          {suggestion && (
            <NoteLinkMenu
              editor={editor}
              notes={matches}
              suggestion={suggestion}
              activeIndex={Math.min(linkIndex, Math.max(matches.length - 1, 0))}
              onPick={(target) => insertRef.current(target)}
            />
          )}
        </article>
      </div>
      <p
        className={`pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] text-faint ${writing ? "opacity-100" : "opacity-0"}`}
        aria-hidden={writing ? undefined : true}
      >
        {words === 1 ? "1 palabra" : `${words} palabras`} ·{" "}
        {characters === 1 ? "1 carácter" : `${characters} caracteres`}
      </p>
    </div>
  );
}
