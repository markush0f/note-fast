export const DESKTOP_RELEASES_URL = "https://github.com/markush0f/note-fast/releases/latest";

const DOWNLOAD_BASE = `${DESKTOP_RELEASES_URL}/download`;

export type DesktopPlatform = "linux" | "windows" | "mac" | "other";

export interface DesktopDownloadLink {
  platform: Exclude<DesktopPlatform, "other">;
  label: string;
  file: string;
}

// Names must match releaseAssetNamePattern in .github/workflows/desktop-release.yml.
export const desktopDownloads: readonly DesktopDownloadLink[] = [
  { platform: "linux", label: "Linux (.deb)", file: "ntbk-linux-amd64.deb" },
  { platform: "linux", label: "Linux (AppImage)", file: "ntbk-linux-amd64.AppImage" },
  { platform: "windows", label: "Windows", file: "ntbk-windows-x64-setup.exe" },
  { platform: "mac", label: "macOS (Apple Silicon)", file: "ntbk-darwin-aarch64.dmg" },
  { platform: "mac", label: "macOS (Intel)", file: "ntbk-darwin-x64.dmg" },
];

export function desktopDownloadURL(file: string): string {
  return `${DOWNLOAD_BASE}/${file}`;
}

export function desktopPlatform(userAgent: string): DesktopPlatform {
  if (/Windows/i.test(userAgent)) return "windows";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "other";
  if (/Macintosh|Mac OS X/i.test(userAgent)) return "mac";
  if (/Linux/i.test(userAgent)) return "linux";
  return "other";
}
