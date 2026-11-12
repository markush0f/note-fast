import { isTauri } from "@tauri-apps/api/core";
import {
  desktopDownloadURL,
  desktopDownloads,
  desktopPlatform,
  DESKTOP_RELEASES_URL,
} from "./downloads";

export default function DesktopDownload() {
  if (isTauri()) return null;
  const platform = desktopPlatform(navigator.userAgent);
  const downloads = [...desktopDownloads].sort(
    (left, right) => Number(right.platform === platform) - Number(left.platform === platform),
  );
  return (
    <section className="mt-6 text-xs text-muted" aria-label="Aplicación de escritorio">
      <h2 className="mb-2 font-medium text-secondary">Aplicación de escritorio</h2>
      <p>
        El programa guarda el cuaderno en este equipo. No inicia sesión ni sincroniza con la cuenta web.
        macOS y Windows pueden mostrar un aviso porque la aplicación no está firmada.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {downloads.map((item) => (
          <li key={item.file}>
            <a className="underline underline-offset-3" href={desktopDownloadURL(item.file)}>
              Descargar {item.label}
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-2">
        <a className="underline underline-offset-3" href={DESKTOP_RELEASES_URL}>
          Ver todas las versiones
        </a>
      </p>
    </section>
  );
}
