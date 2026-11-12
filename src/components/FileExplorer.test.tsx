// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createNote } from '../lib/notes';
import { createNotebook } from '../lib/workspace';
import FileExplorer from './FileExplorer';
const props=()=>{const book=createNotebook('Ideas');const note={...createNote(book.id),title:'Primera página'};return {notes:[note],notebooks:[book],selection:null,activeNotebookId:book.id,query:'',favorites:false,onSelect:vi.fn(),onSelectNotebook:vi.fn(),onNewNote:vi.fn(),onNewNotebook:vi.fn(),onRenameNotebook:vi.fn(),onChangeNotebookIcon:vi.fn(),onDeleteNotebook:vi.fn(),onMoveNote:vi.fn()};};
describe('FileExplorer',()=>{it('shows notebooks and their editable pages',()=>{const p=props();const html=renderToStaticMarkup(<FileExplorer {...p}/>);expect(html).toContain('Ideas');expect(html).toContain('Primera página');expect(html).not.toContain('Carpeta');});it('offers creation and page actions',()=>{const html=renderToStaticMarkup(<FileExplorer {...props()}/>);expect(html).toContain('Nueva página');});});
