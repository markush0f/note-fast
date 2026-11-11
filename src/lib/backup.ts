import { migrateWorkspace, type Workspace } from "./workspace";

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

export function downloadWorkspace(workspace: Workspace): void {
  const blob = new Blob([serializeWorkspace(workspace)], {
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
