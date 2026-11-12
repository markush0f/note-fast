export function formatShortcut(
  shortcut: string,
  platform = typeof navigator === "undefined" ? "" : navigator.platform,
): string {
  return shortcut.replace(
    /\bMod\b/g,
    /Mac|iPhone|iPad/i.test(platform) ? "Cmd" : "Ctrl",
  );
}
