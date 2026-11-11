import { useState, type FormEvent } from "react";
import { signIn, signUp } from "../lib/cloud";
import { Button } from "./ui";

export default function AuthScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [register, setRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (register) await signUp(name, email, password);
      else await signIn(email, password);
      onAuthenticated();
    } catch {
      setError(register ? "No se pudo crear la cuenta. Comprueba los datos; la contraseña debe tener al menos 12 caracteres." : "Correo o contraseña incorrectos, o servidor no disponible.");
    } finally {
      setBusy(false);
    }
  };

  return <main className="grid min-h-dvh place-items-center bg-subtle p-5 text-ink">
    <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-line bg-surface p-7 shadow-sm">
      <h1 className="mb-2 text-xl font-semibold">Notas</h1>
      <p className="mb-6 text-sm text-muted">{register ? "Crea una cuenta para guardar tus notas de forma segura." : "Inicia sesión para acceder a tus notas."}</p>
      {register && <label className="mb-4 block text-sm">Nombre<input required autoComplete="name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full rounded border border-line bg-subtle px-3 py-2" /></label>}
      <label className="mb-4 block text-sm">Correo electrónico<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full rounded border border-line bg-subtle px-3 py-2" /></label>
      <label className="mb-4 block text-sm">Contraseña<input required type="password" minLength={register ? 12 : undefined} maxLength={128} autoComplete={register ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full rounded border border-line bg-subtle px-3 py-2" /></label>
      {error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}
      <Button type="submit" variant="primary" disabled={busy} className="w-full justify-center">{busy ? "Un momento…" : register ? "Crear cuenta" : "Iniciar sesión"}</Button>
      <button type="button" className="mt-4 w-full text-sm text-muted underline" onClick={() => { setRegister(!register); setError(""); }}> {register ? "Ya tengo cuenta: iniciar sesión" : "Crear una cuenta"}</button>
    </form>
  </main>;
}
