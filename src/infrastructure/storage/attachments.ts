import { dbGet, dbPut } from './offline-db';

export const FILE_LIMIT = 10 * 1024 * 1024;
export const FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'];
export const FILE_ACCEPT = '.png,.jpg,.jpeg,.webp,.gif,.pdf';
export interface Attachment { id: string; name: string; type: string; size: number; }
interface StoredFile { blob: Blob; uploaded: boolean; }
let accountId: string | null = null;
export function setAttachmentAccount(id: string | null) { accountId = id; }
export function attachmentAccount() {
  if (!accountId) throw new Error('Inicia sesión para acceder a los adjuntos.');
  return accountId;
}
export function fileURL(id: string) { return `/api/files/${encodeURIComponent(id)}`; }
export function attachmentIds(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return [...new Set([...doc.querySelectorAll('[data-attachment-id]')].map(el => el.getAttribute('data-attachment-id')!).filter(id => /^[\da-f-]{36}$/i.test(id)))];
}
export async function storeAttachment(file: File): Promise<Attachment> {
  const owner = attachmentAccount();
  if (!FILE_TYPES.includes(file.type)) throw new Error('Admite imágenes PNG, JPEG, WebP, GIF y documentos PDF.');
  if (!file.size || file.size > FILE_LIMIT) throw new Error('Cada archivo debe ocupar entre 1 byte y 10 MiB.');
  const id = crypto.randomUUID();
  await dbPut('files', `${owner}:${id}`, { blob: file, uploaded: false } satisfies StoredFile);
  return { id, name: file.name.slice(0, 200), type: file.type, size: file.size };
}
export async function loadAttachment(id: string, owner = attachmentAccount()): Promise<Blob> {
  const stored = await dbGet<StoredFile>('files', `${owner}:${id}`);
  if (stored) return stored.blob;
  const response = await fetch(fileURL(id), { credentials: 'include', cache: 'no-store', headers: { 'X-Notebook-User': owner } });
  if (!response.ok) throw new Error(response.status === 401 ? 'Inicia sesión para descargar el adjunto.' : 'Adjunto no disponible sin conexión. Conéctate para descargarlo.');
  const blob = await response.blob();
  await dbPut('files', `${owner}:${id}`, { blob, uploaded: true } satisfies StoredFile);
  return blob;
}
export async function uploadAttachments(html: string, owner: string): Promise<void> {
  for (const id of attachmentIds(html)) {
    const key = `${owner}:${id}`;
    const stored = await dbGet<StoredFile>('files', key);
    if (!stored || stored.uploaded) continue;
    const response = await fetch(fileURL(id), { method: 'PUT', credentials: 'include', headers: { 'Content-Type': stored.blob.type, 'X-Notebook-User': owner }, body: stored.blob });
    if (!response.ok) throw new Error(response.status === 401 ? 'unauthorized' : response.status === 413 ? 'Se ha alcanzado el límite de adjuntos de la cuenta (100 MiB).' : 'No se pudo subir un adjunto. Se conserva en este dispositivo.');
    await dbPut('files', key, { ...stored, uploaded: true });
  }
}
export async function cacheAttachments(html: string, owner: string): Promise<void> {
  for (const id of attachmentIds(html)) await loadAttachment(id, owner);
}
export async function attachmentDataURL(id: string): Promise<string> {
  const blob = await loadAttachment(id);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
