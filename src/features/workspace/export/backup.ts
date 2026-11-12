import { migrateWorkspace, type Workspace } from "../model/workspace";
import { attachmentIds, attachmentDataURL, storeAttachment, FILE_TYPES, FILE_LIMIT } from '../../../infrastructure/storage/attachments';

export function serializeWorkspace(workspace: Workspace): string {
  return JSON.stringify(workspace);
}

export function parseBackup(text: string): Workspace {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("El archivo no es un JSON válido.");
  }
  try {
    const workspace = migrateWorkspace(value);
    if (!workspace) throw new Error("El archivo no contiene un cuaderno.");
    return workspace;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("El archivo"))
      throw error;
    throw new Error("El archivo no es una copia de ntbk.");
  }
}

export async function importBackup(text: string): Promise<Workspace> {
  const workspace = parseBackup(text);
  if (new Blob([serializeWorkspace(workspace)]).size > 5 * 1024 * 1024) throw new Error('El cuaderno supera el límite de 5 MiB, sin contar sus adjuntos.');
  const files: unknown = (JSON.parse(text) as { files?: unknown }).files;
  if (files === undefined) {
    if (workspace.notes.some(note => attachmentIds(note.content).length)) throw new Error('Esta copia no incluye los archivos adjuntos. Expórtala de nuevo desde el dispositivo original.');
    return workspace;
  }
  if (!Array.isArray(files) || files.length > 50_000) throw new Error('Adjuntos de la copia no válidos.');
  const replacements = new Map<string, string>();
  let total = 0;
  for (const file of files) {
    if (!file || typeof file.id !== 'string' || typeof file.name !== 'string' || typeof file.data !== 'string') throw new Error('Adjunto de la copia no válido.');
    if (replacements.has(file.id)) throw new Error('Identificadores de adjuntos duplicados en la copia.');
    const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/.exec(file.data);
    if (!match || !FILE_TYPES.includes(match[1]) || match[2].length > Math.ceil(FILE_LIMIT / 3) * 4) throw new Error('Adjunto no compatible o demasiado grande.');
    const bytes = Uint8Array.from(atob(match[2]), character => character.charCodeAt(0));
    total += bytes.length;
    if (total > 100 * 1024 * 1024) throw new Error('La copia supera 100 MiB de adjuntos.');
    const stored = await storeAttachment(new File([bytes], file.name, { type: match[1] }));
    replacements.set(file.id, stored.id);
  }
  return { ...workspace, notes: workspace.notes.map(note => {
    const doc = new DOMParser().parseFromString(note.content, 'text/html');
    for (const element of doc.querySelectorAll('[data-attachment-id]')) {
      const id = replacements.get(element.getAttribute('data-attachment-id')!);
      if (!id) throw new Error('Falta un adjunto en la copia.');
      element.setAttribute('data-attachment-id', id);
    }
    return { ...note, content: doc.body.innerHTML };
  }) };
}

export async function downloadWorkspace(workspace: Workspace): Promise<void> {
  const files = [];
  const seen = new Set<string>();
  for (const note of workspace.notes) {
    const doc = new DOMParser().parseFromString(note.content, 'text/html');
    for (const id of attachmentIds(note.content)) {
      if (seen.has(id)) continue;
      seen.add(id);
      const element = [...doc.querySelectorAll('[data-attachment-id]')].find(el => el.getAttribute('data-attachment-id') === id);
      files.push({ id, name: element?.getAttribute('data-name') || 'Adjunto', data: await attachmentDataURL(id) });
    }
  }
  const blob = new Blob([JSON.stringify({ ...workspace, files })], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const day = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `ntbk-${day}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
