// Separate from the legacy notebook: all new records are scoped to an account.
const DB = 'ntbk-offline';
export async function offlineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('state');
      request.result.createObjectStore('files');
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
export async function dbGet<T>(store: string, key: string): Promise<T | undefined> {
  const db = await offlineDB();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(store);
      const request = tx.objectStore(store).get(key);
      tx.oncomplete = () => resolve(request.result as T | undefined);
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
export async function dbPut(store: string, key: string, value: unknown): Promise<void> {
  const db = await offlineDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
export async function dbDelete(store: string, key: string): Promise<void> {
  const db = await offlineDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
