import { isTauri } from "@tauri-apps/api/core";
import { get, set } from "idb-keyval";
import type { Note } from "./notes";

const KEY = "ntbk:workspace:v1";
export const storageLabel = isTauri() ? "SQLite" : "IndexedDB";

// One atomic snapshot keeps creation, deletion and edits consistent in both backends.
async function backend() {
  if (!isTauri()) {
    return {
      load: async (): Promise<Note[] | undefined> => get<Note[]>(KEY),
      save: async (notes: Note[]) => set(KEY, notes),
    };
  }
  const { default: Database } = await import("@tauri-apps/plugin-sql");
  const db = await Database.load("sqlite:ntbk.db");
  return {
    load: async (): Promise<Note[] | undefined> => {
      const rows = await db.select<{ payload: string }[]>(
        "SELECT payload FROM workspace WHERE id = 1",
      );
      return rows.length ? (JSON.parse(rows[0].payload) as Note[]) : undefined;
    },
    save: async (notes: Note[]) => {
      await db.execute(
        "INSERT INTO workspace (id, payload) VALUES (1, $1) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload",
        [JSON.stringify(notes)],
      );
    },
  };
}

let connection: ReturnType<typeof backend> | undefined;
const connect = () =>
  (connection ??= backend().catch((error: unknown) => {
    connection = undefined;
    throw error;
  }));
let writes = Promise.resolve();

export async function loadNotes(): Promise<Note[] | undefined> {
  return (await connect()).load();
}

export function saveNotes(notes: Note[]): Promise<void> {
  // Serialize writes so an older snapshot never overwrites a newer one.
  writes = writes
    .catch(() => {})
    .then(async () => {
      await (await connect()).save(notes);
    });
  return writes;
}
