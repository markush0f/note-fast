import { migrateWorkspace, type Workspace } from "./workspace";

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(path, { ...init, credentials: "include" });
  if (response.status === 401) throw new Error("unauthorized");
  if (!response.ok) throw new Error("No se pudo comunicar con el servidor.");
  return response;
}

export async function currentUser(): Promise<{ id: string; name: string; email: string }> {
  const response = await request("/api/me");
  return (await response.json()).user;
}

export async function signIn(email: string, password: string): Promise<void> {
  await request("/api/auth/sign-in/email", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function signUp(name: string, email: string, password: string): Promise<void> {
  await request("/api/auth/sign-up/email", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
}

export async function signOut(): Promise<void> {
  await request("/api/auth/sign-out", { method: "POST" });
}

export async function loadCloudWorkspace(): Promise<Workspace | undefined> {
  const response = await request("/api/workspace");
  const { workspace } = await response.json();
  if (workspace === null) return undefined;
  const migrated = migrateWorkspace(workspace);
  if (!migrated) throw new Error("El cuaderno guardado no es válido.");
  return migrated;
}

let writes = Promise.resolve();
export function saveCloudWorkspace(workspace: Workspace): Promise<void> {
  writes = writes.catch(() => {}).then(async () => {
    await request("/api/workspace", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workspace),
    });
  });
  return writes;
}
