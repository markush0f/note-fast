export const TOOLBAR_POSITIONS = [
  { id: "top-left", label: "Arriba a la izquierda" },
  { id: "top-right", label: "Arriba a la derecha" },
  { id: "bottom-left", label: "Abajo a la izquierda" },
  { id: "bottom-right", label: "Abajo a la derecha" },
] as const;

export type ToolbarPosition = (typeof TOOLBAR_POSITIONS)[number]["id"];
export const DEFAULT_TOOLBAR_POSITION: ToolbarPosition = "top-right";

export function isToolbarPosition(value: unknown): value is ToolbarPosition {
  return TOOLBAR_POSITIONS.some((position) => position.id === value);
}

export interface ToolbarBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function getToolbarDropPosition(
  x: number,
  y: number,
  bounds: ToolbarBounds,
): ToolbarPosition {
  const vertical = y < bounds.top + bounds.height / 2 ? "top" : "bottom";
  const horizontal = x < bounds.left + bounds.width / 2 ? "left" : "right";
  return `${vertical}-${horizontal}`;
}

export function getToolbarDragOffset(
  toolbar: ToolbarBounds,
  bounds: ToolbarBounds,
  dx: number,
  dy: number,
) {
  const paddingX = Math.min(
    12,
    Math.max(0, (bounds.width - toolbar.width) / 2),
  );
  const paddingY = Math.min(
    12,
    Math.max(0, (bounds.height - toolbar.height) / 2),
  );
  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(value, max));
  return {
    x:
      clamp(
        toolbar.left + dx,
        bounds.left + paddingX,
        bounds.left + bounds.width - toolbar.width - paddingX,
      ) - toolbar.left,
    y:
      clamp(
        toolbar.top + dy,
        bounds.top + paddingY,
        bounds.top + bounds.height - toolbar.height - paddingY,
      ) - toolbar.top,
  };
}
