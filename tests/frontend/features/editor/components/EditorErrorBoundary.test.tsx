// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import EditorErrorBoundary from "../../../../../src/features/editor/components/EditorErrorBoundary";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("editor loading recovery", () => {
  it("renders the editor when loading succeeds", () => {
    const host = document.createElement("div");
    const root = createRoot(host);
    try {
      act(() => root.render(<EditorErrorBoundary><div>Mi nota</div></EditorErrorBoundary>));
      expect(host.textContent).toBe("Mi nota");
    } finally { act(() => root.unmount()); }
  });
  it("keeps the rest of the app visible and offers recovery on an import failure", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const host = document.createElement("div");
    const root = createRoot(host);
    const BrokenEditor = (): never => { throw new Error("Outdated Optimize Dep"); };
    try {
      act(() => root.render(<><aside>Mis notas</aside><EditorErrorBoundary><BrokenEditor /></EditorErrorBoundary></>));
      expect(host.querySelector("aside")?.textContent).toBe("Mis notas");
      expect(host.querySelector('[role="alert"]')?.textContent).toContain("No se pudo cargar el editor");
      expect(host.querySelector("button")?.textContent).toBe("Recargar aplicación");
    } finally { act(() => root.unmount()); log.mockRestore(); }
  });
});
