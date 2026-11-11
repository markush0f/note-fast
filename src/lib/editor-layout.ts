export const TOOLBAR_POSITIONS = [
  { id: "top-left", label: "Arriba a la izquierda" },
  { id: "top-right", label: "Arriba a la derecha" },
  { id: "bottom-left", label: "Abajo a la izquierda" },
  { id: "bottom-right", label: "Abajo a la derecha" },
] as const;

export type ToolbarPosition = (typeof TOOLBAR_POSITIONS)[number]["id"];
export const DEFAULT_TOOLBAR_POSITION: ToolbarPosition = "top-right";

// Coordinates are ratios of the available travel area, so resizing never loses the bar.
export interface ToolbarPoint {
  x: number;
  y: number;
}
export type ToolbarPlacement = ToolbarPosition | ToolbarPoint;

export function isToolbarPlacement(value: unknown): value is ToolbarPlacement {
  if (isToolbarPosition(value)) return true;
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<ToolbarPoint>;
  return (
    typeof point.x === "number" &&
    Number.isFinite(point.x) &&
    point.x >= 0 &&
    point.x <= 1 &&
    typeof point.y === "number" &&
    Number.isFinite(point.y) &&
    point.y >= 0 &&
    point.y <= 1
  );
}

export function getToolbarPlacementCorner(
  placement: ToolbarPlacement,
): ToolbarPosition {
  if (typeof placement === "string") return placement;
  return `${placement.y < 0.5 ? "top" : "bottom"}-${placement.x < 0.5 ? "left" : "right"}`;
}

function travelArea(
  bounds: Pick<ToolbarBounds, "width" | "height">,
  toolbar: Pick<ToolbarBounds, "width" | "height">,
) {
  const left = Math.min(12, Math.max(0, (bounds.width - toolbar.width) / 2));
  const top = Math.min(12, Math.max(0, (bounds.height - toolbar.height) / 2));
  return {
    left,
    top,
    width: Math.max(0, bounds.width - toolbar.width - left * 2),
    height: Math.max(0, bounds.height - toolbar.height - top * 2),
  };
}

export function getToolbarCoordinates(
  placement: ToolbarPlacement,
  bounds: Pick<ToolbarBounds, "width" | "height">,
  toolbar: Pick<ToolbarBounds, "width" | "height">,
): ToolbarPoint {
  const point =
    typeof placement === "string"
      ? {
          x: placement.endsWith("right") ? 1 : 0,
          y: placement.startsWith("bottom") ? 1 : 0,
        }
      : placement;
  const area = travelArea(bounds, toolbar);
  return {
    x: area.left + point.x * area.width,
    y: area.top + point.y * area.height,
  };
}

export function getToolbarPoint(
  x: number,
  y: number,
  bounds: Pick<ToolbarBounds, "width" | "height">,
  toolbar: Pick<ToolbarBounds, "width" | "height">,
): ToolbarPoint {
  const area = travelArea(bounds, toolbar);
  const ratio = (value: number, start: number, range: number) =>
    range ? Math.max(0, Math.min(1, (value - start) / range)) : 0;
  return {
    x: ratio(x, area.left, area.width),
    y: ratio(y, area.top, area.height),
  };
}

export function isToolbarPosition(value: unknown): value is ToolbarPosition {
  return TOOLBAR_POSITIONS.some((position) => position.id === value);
}

export interface ToolbarBounds {
  left: number;
  top: number;
  width: number;
  height: number;
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
