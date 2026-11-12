export const TEXT_COLORS = [
  { id: "#b91c1c", label: "Rojo" },
  { id: "#b45309", label: "Ámbar" },
  { id: "#15803d", label: "Verde" },
  { id: "#1d4ed8", label: "Azul" },
  { id: "#7e22ce", label: "Violeta" },
] as const;

export function isTextColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export function parseLink(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol === "http:" || url.protocol === "https:") {
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  }
  if (url.protocol === "mailto:") {
    return url.pathname.includes("@") ? url.toString() : null;
  }
  return null;
}
