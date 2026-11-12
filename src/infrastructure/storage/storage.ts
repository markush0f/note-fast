import { isTauri } from "@tauri-apps/api/core";
import { get, set } from "idb-keyval";
import { migrateWorkspace, type Workspace } from "../../features/workspace/model/workspace";

const KEY = "ntbk:workspace:v1";
const CLOUD_IMPORT_KEY = "ntbk:cloud-imported:v1";
export const storageLabel = isTauri() ? "SQLite" : "IndexedDB";

// One atomic snapshot keeps creation, deletion and edits consistent in both backends.
async function backend() {
  if (!isTauri()) {
    return {
      load: async (): Promise<unknown> => get(KEY),
      save: async (workspace: Workspace) => set(KEY, workspace),
    };
  }
  const { default: Database } = await import("@tauri-apps/plugin-sql");
  const db = await Database.load("sqlite:ntbk.db");
  return {
    load: async (): Promise<unknown> => {
      const rows = await db.select<{ payload: string }[]>(
        "SELECT payload FROM workspace WHERE id = 1",
      );
      return rows.length ? (JSON.parse(rows[0].payload) as unknown) : undefined;
    },
    save: async (workspace: Workspace) => {
      await db.execute(
        "INSERT INTO workspace (id, payload) VALUES (1, $1) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload",
        [JSON.stringify(workspace)],
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

export async function hasImportedWorkspaceToCloud(): Promise<boolean> {
  if (isTauri()) return true;
  return Boolean(await get(CLOUD_IMPORT_KEY));
}

export async function markWorkspaceImportedToCloud(): Promise<void> {
  if (!isTauri()) await set(CLOUD_IMPORT_KEY, true);
}

export async function loadWorkspace(): Promise<Workspace | undefined> {
  return migrateWorkspace(await (await connect()).load());
}

export function saveWorkspace(workspace: Workspace): Promise<void> {
  // Serialize writes so an older snapshot never overwrites a newer one.
  writes = writes
    .catch(() => {})
    .then(async () => {
      await (await connect()).save(workspace);
    });
  return writes;
}
