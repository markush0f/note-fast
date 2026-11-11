// @vitest-environment jsdom
import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Tooltip from "./Tooltip";
import { Button } from "./ui";

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.useFakeTimers();
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});
const popup = () => document.querySelector('[role="tooltip"]');
function pointer(button: HTMLElement, type: string, pointerType = "mouse") {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  button.dispatchEvent(event);
}

describe("toolbar tooltips", () => {
  it("shows the command on focus and combines accessible descriptions and refs", () => {
    const ref = createRef<HTMLButtonElement>();
    act(() =>
      root.render(
        <Tooltip label="Negrita" shortcut="Ctrl+B">
          <Button ref={ref} aria-describedby="instructions">
            B
          </Button>
        </Tooltip>,
      ),
    );
    act(() => ref.current!.focus());
    expect(popup()?.textContent).toBe("NegritaCtrl+B");
    expect(ref.current?.getAttribute("aria-describedby")).toContain(
      "instructions",
    );
    expect(ref.current?.getAttribute("aria-describedby")).toContain(
      popup()!.id,
    );
    act(() =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    expect(popup()).toBeNull();
    expect(ref.current?.getAttribute("aria-describedby")).toBe("instructions");
  });
  it("shows on hover after a short delay and hides on leaving", () => {
    act(() =>
      root.render(
        <Tooltip label="Lista" shortcut="Ctrl+Shift+8">
          <button>Lista</button>
        </Tooltip>,
      ),
    );
    const button = container.querySelector("button")!;
    act(() => pointer(button, "pointerover"));
    expect(popup()).toBeNull();
    act(() => vi.advanceTimersByTime(200));
    expect(popup()?.textContent).toContain("Ctrl+Shift+8");
    act(() => pointer(button, "pointerout"));
    expect(popup()).toBeNull();
  });
  it("preserves click handlers and does not leave a tooltip open after an action", () => {
    const click = vi.fn();
    act(() =>
      root.render(
        <Tooltip label="Acción">
          <button onClick={click}>Acción</button>
        </Tooltip>,
      ),
    );
    const button = container.querySelector("button")!;
    act(() => button.focus());
    expect(popup()).not.toBeNull();
    act(() => button.click());
    expect(click).toHaveBeenCalledOnce();
    expect(popup()).toBeNull();
  });
  it("does not open during drag or a touch hover", () => {
    act(() =>
      root.render(
        <Tooltip label="Mover" disabled>
          <button>Mover</button>
        </Tooltip>,
      ),
    );
    let button = container.querySelector("button")!;
    act(() => {
      button.focus();
      pointer(button, "pointerover");
      vi.advanceTimersByTime(500);
    });
    expect(popup()).toBeNull();
    act(() =>
      root.render(
        <Tooltip label="Mover">
          <button>Mover</button>
        </Tooltip>,
      ),
    );
    button = container.querySelector("button")!;
    act(() => {
      button.blur();
      pointer(button, "pointerover", "touch");
      vi.advanceTimersByTime(500);
    });
    expect(popup()).toBeNull();
  });
});
