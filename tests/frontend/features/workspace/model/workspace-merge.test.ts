import { describe, expect, it } from 'vitest';
import { mergeWorkspaces } from '../../../../../src/features/workspace/model/workspace-merge';
import { createNote } from '../../../../../src/features/workspace/model/notes';
import { createNotebook, type Workspace } from '../../../../../src/features/workspace/model/workspace';
const note=createNote();const book=createNotebook('General');const base:Workspace={version:4,notes:[note],notebooks:[book]};const edit=(content:string):Workspace=>({...base,notes:[{...note,content}]});
describe('offline three-way merge',()=>{
 it('retains independent additions and edits without mutating inputs',()=>{const remote={...base,notes:[note,createNote()]};const local=edit('local');const before=JSON.stringify([base,local,remote]);const result=mergeWorkspaces(base,local,remote);expect(result.notes).toHaveLength(2);expect(result.notes[0].content).toBe('local');expect(JSON.stringify([base,local,remote])).toBe(before);});
 it('preserves both conflicting versions idempotently',()=>{const result=mergeWorkspaces(base,edit('local'),edit('remote'));expect(result.notes.map(n=>n.content).sort()).toEqual(['local','remote']);expect(result.notes.find(n=>n.content==='local')?.title).toContain('(conflicto)');expect(mergeWorkspaces(base,edit('local'),result).notes).toHaveLength(2);});
 it('merges notebook fields edited independently',()=>{const before={...base,notebooks:[book]};const local={...before,notebooks:[{...book,name:'Travel journal'}]};const remote={...before,notebooks:[{...book,description:'Summer trip'}]};expect(mergeWorkspaces(before,local,remote).notebooks[0]).toMatchObject({name:'Travel journal',description:'Summer trip'});});
 it('ignores JSONB property ordering',()=>{const remote={...base,notes:[Object.fromEntries(Object.entries(note).reverse()) as unknown as typeof note]};expect(mergeWorkspaces(base,edit('local'),remote).notes[0].content).toBe('local');});
 it('does not duplicate identical edits or undo permanent deletion',()=>{expect(mergeWorkspaces(base,edit('same'),edit('same')).notes).toHaveLength(1);expect(mergeWorkspaces(base,{...base,notes:[]},base).notes).toHaveLength(0);});
 it('preserves edited pages when the other device deletes or trashes them',()=>{expect(mergeWorkspaces(base,edit('local'),{...base,notes:[]}).notes[0].content).toBe('local');const remote={...base,notes:[{...note,deletedAt:new Date().toISOString()}]};expect(mergeWorkspaces(base,edit('local'),remote).notes).toHaveLength(2);});
});
