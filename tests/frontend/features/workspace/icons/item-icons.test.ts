import { describe, expect, it } from 'vitest';
import { createNote } from '../../../../../src/features/workspace/model/notes';
import { ICON_CATEGORIES, ITEM_ICONS, ITEM_ICON_IDS, filterItemIcons, isItemIconId } from '../../../../../src/features/workspace/icons/item-icons';
import { createNotebook, migrateWorkspace, setItemIcon, type Workspace } from '../../../../../src/features/workspace/model/workspace';
const fixture=():Workspace=>{const notebook=createNotebook('Proyectos');return {version:4,notebooks:[notebook],notes:[createNote(notebook.id)]};};
describe('custom item icons',()=>{
 it('offers unique icons in each category',()=>{expect(ITEM_ICONS.length).toBeGreaterThan(100);expect(new Set(ITEM_ICON_IDS).size).toBe(ITEM_ICONS.length);for(const category of Object.keys(ICON_CATEGORIES))expect(ITEM_ICONS.some(icon=>icon.category===category)).toBe(true);});
 it('searches labels and identifiers without accents/case',()=>{expect(filterItemIcons('CÁMARA').some(icon=>icon.id==='camera')).toBe(true);expect(filterItemIcons('programacion').map(icon=>icon.id)).toContain('code');expect(filterItemIcons('   ')).toHaveLength(ITEM_ICONS.length);});
 it('validates icon identifiers',()=>{expect(isItemIconId('book')).toBe(true);for(const value of [undefined,null,'unknown','<svg>',{}])expect(isItemIconId(value)).toBe(false);});
 it('updates the selected notebook icon and migrates safely',()=>{const w=fixture();const book=w.notebooks[0];const next=setItemIcon(w,{kind:'notebook',id:book.id},'work');expect(next.notebooks[0].icon).toBe('work');expect(migrateWorkspace(next)).toEqual(next);});
});
