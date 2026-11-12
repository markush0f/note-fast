import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { clear, get, set } from 'idb-keyval';
import { createNote } from '../../../../src/features/workspace/model/notes';
import { hasImportedWorkspaceToCloud, loadWorkspace, markWorkspaceImportedToCloud, saveWorkspace, storageLabel } from '../../../../src/infrastructure/storage/storage';
import { createNotebook, DEFAULT_NOTEBOOK_ID, DEFAULT_NOTEBOOK_NAME, type Workspace } from '../../../../src/features/workspace/model/workspace';
const empty=():Workspace=>({version:4,notes:[],notebooks:[{id:DEFAULT_NOTEBOOK_ID,name:DEFAULT_NOTEBOOK_NAME,description:''}]});
beforeEach(async()=>clear());
describe('IndexedDB persistence',()=>{
 it('remembers cloud import without deleting data',async()=>{const w={...empty(),notes:[createNote()]};await saveWorkspace(w);expect(await hasImportedWorkspaceToCloud()).toBe(false);await markWorkspaceImportedToCloud();expect(await hasImportedWorkspaceToCloud()).toBe(true);expect(await loadWorkspace()).toEqual(w);});
 it('distinguishes unused and empty workspaces',async()=>{expect(storageLabel).toBe('IndexedDB');expect(await loadWorkspace()).toBeUndefined();await saveWorkspace(empty());expect(await loadWorkspace()).toEqual(empty());});
 it('roundtrips notebooks, pages, edits and deletion',async()=>{const book=createNotebook('Proyectos');const note={...createNote(book.id),title:'Mi página',content:'<p>Hola</p>',icon:'book' as const};const w:Workspace={version:4,notebooks:[book],notes:[note]};await saveWorkspace(w);expect(await loadWorkspace()).toEqual(w);const changed={...w,notes:[{...note,title:'Actualizada',favorite:true}]};await saveWorkspace(changed);expect(await loadWorkspace()).toEqual(changed);});
 it('migrates old root pages and folder pages without loss',async()=>{await set('ntbk:workspace:v1',{version:3,notes:[{...createNote(),folderId:null}],folders:[]});const w=await loadWorkspace();expect(w?.notebooks[0].id).toBe(DEFAULT_NOTEBOOK_ID);expect(w?.notes[0].notebookId).toBe(DEFAULT_NOTEBOOK_ID);});
 it('does not overwrite unsupported stored data',async()=>{const future={version:99,notes:[],folders:[]};await set('ntbk:workspace:v1',future);await expect(loadWorkspace()).rejects.toThrow();expect(await get('ntbk:workspace:v1')).toEqual(future);});
});
