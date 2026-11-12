// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyTheme, getInitialTheme, isTheme, THEME_CACHE_KEY } from "./theme";
import { createNote } from "./notes";
import { DEFAULT_NOTEBOOK_ID, DEFAULT_NOTEBOOK_NAME, migrateWorkspace } from "./workspace";
import { JSDOM } from 'jsdom';
const storageWindow = new JSDOM('', { url: 'http://localhost' }).window;

beforeEach(() => {
  // Node 25 also exposes a native localStorage; use the jsdom implementation.
  vi.stubGlobal('localStorage', storageWindow.localStorage);
  vi.stubGlobal('Storage', storageWindow.Storage);
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.restoreAllMocks();
});

describe("appearance preference", () => {
  it("defaults to light and recognizes only supported themes", () => {
    expect(getInitialTheme()).toBe("light");
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
    for (const value of [undefined, null, "system", {}, 1])
      expect(isTheme(value)).toBe(false);
    localStorage.setItem(THEME_CACHE_KEY, "unsupported");
    expect(getInitialTheme()).toBe("light");
  });
  it("applies and caches each appearance", () => {
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(getInitialTheme()).toBe("dark");
    applyTheme("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(getInitialTheme()).toBe("light");
  });
  it("still changes the appearance if the first-paint cache is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(getInitialTheme()).toBe("light");
    expect(() => applyTheme("dark")).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
  it("loads saved appearance without changing existing notes or toolbar preferences", () => {
    const workspace = {
      version: 4 as const,
      notes: [createNote()],
      notebooks: [{ id: DEFAULT_NOTEBOOK_ID, name: DEFAULT_NOTEBOOK_NAME, description: '' }],
      toolbarPosition: "bottom-left" as const,
    };
    expect(migrateWorkspace(workspace)).toEqual(workspace);
    for (const theme of ["light", "dark"])
      expect(migrateWorkspace({ ...workspace, theme })).toEqual({
        ...workspace,
        theme,
      });
    expect(migrateWorkspace({ ...workspace, theme: "unsupported" })).toEqual(
      workspace,
    );
  });
});
