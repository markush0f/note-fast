import { THEMES, type Theme } from "../lib/theme";
import Dialog from "./Dialog";
import { HalfMoon, SunLight } from "./icons";
import { Button } from "./ui";

interface Props {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onClose: () => void;
}

export default function SettingsDialog({
  theme,
  onThemeChange,
  onClose,
}: Props) {
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
      <div className="mt-6 flex justify-end">
        <Button onClick={onClose}>Cerrar</Button>
      </div>
    </Dialog>
  );
}
