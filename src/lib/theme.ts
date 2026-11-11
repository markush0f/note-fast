export const THEMES = [
  { id: "light", label: "Claro" },
  { id: "dark", label: "Oscuro" },
] as const;
export type Theme = (typeof THEMES)[number]["id"];
export const THEME_CACHE_KEY = "ntbk:theme";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

export function getInitialTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_CACHE_KEY);
    return isTheme(value) ? value : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#1d1e20" : "#ffffff");
  try {
    localStorage.setItem(THEME_CACHE_KEY, theme);
  } catch {
    /* Storage may be unavailable; the workspace remains the source of truth. */
  }
}
