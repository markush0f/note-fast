import { useState } from "react";
import { parseBackup } from "../lib/backup";
import { THEMES, type Theme } from "../lib/theme";
import type { Workspace } from "../lib/workspace";
import Dialog from "./Dialog";
import { Download, HalfMoon, SunLight } from "./icons";
import { Button } from "./ui";

interface Props {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onExport: () => void;
  onImport: (workspace: Workspace) => void;
  onClose: () => void;
}

export default function SettingsDialog({
  theme,
  onThemeChange,
  onExport,
  onImport,
  onClose,
}: Props) {
  const [pending, setPending] = useState<Workspace | null>(null);
  const [error, setError] = useState("");
  return (
    <Dialog title="Ajustes" onClose={onClose}>
      <fieldset className="mt-5">
        <legend className="mb-3 text-xs font-medium text-secondary">
          Apariencia
        </legend>
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map(({ id, label }) => {
            const Icon = id === "light" ? SunLight : HalfMoon;
            return (
              <label
                key={id}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-line bg-subtle p-3 text-sm text-secondary has-checked:border-strong has-checked:bg-selection focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-strong"
              >
                <input
                  type="radio"
                  name="theme"
                  value={id}
                  checked={theme === id}
                  onChange={() => onThemeChange(id)}
                  className="size-3.5 accent-primary"
                />
                <Icon size={19} />
                <span>{label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <fieldset className="mt-6">
        <legend className="mb-3 text-xs font-medium text-secondary">
          Copia de seguridad
        </legend>
        <p className="mb-3 text-xs text-muted">
          Un archivo JSON con notas, carpetas, papelera y apariencia. Importarlo
          sustituye el cuaderno de este dispositivo.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onExport}>
            <Download size={15} />
            Exportar cuaderno
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded bg-soft px-3.5 py-2.5 text-xs text-secondary hover:bg-selection">
            Importar cuaderno
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Importar cuaderno"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                try {
                  setPending(parseBackup(await file.text()));
                  setError("");
                } catch (caught) {
                  setPending(null);
                  setError(
                    caught instanceof Error
                      ? caught.message
                      : "No se pudo leer el archivo.",
                  );
                }
              }}
            />
          </label>
        </div>
        {error && (
          <p className="mt-2 text-xs text-danger" role="alert">
            {error}
          </p>
        )}
        {pending && (
          <div className="mt-3 rounded-md border border-line bg-subtle p-3">
            <p className="text-xs text-secondary">
              ¿Sustituir este cuaderno por la copia ({pending.notes.length}{" "}
              notas)?
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <Button onClick={() => setPending(null)}>Cancelar</Button>
              <Button
                variant="primary"
                onClick={() => {
                  onImport(pending);
                  setPending(null);
                }}
              >
                Sustituir cuaderno
              </Button>
            </div>
          </div>
        )}
      </fieldset>
      <div className="mt-6 flex justify-end">
        <Button onClick={onClose}>Cerrar</Button>
      </div>
    </Dialog>
  );
}
