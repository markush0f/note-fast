import { describe, expect, it } from "vitest";
import { formatShortcut } from "../../../../src/shared/lib/shortcuts";

describe("tool shortcut labels", () => {
  it("uses Ctrl on Windows and Linux, and Cmd on Apple platforms", () => {
    expect(formatShortcut("Mod+Shift+8", "Win32")).toBe("Ctrl+Shift+8");
    expect(formatShortcut("Mod+Alt+2", "Linux x86_64")).toBe("Ctrl+Alt+2");
    expect(formatShortcut("Mod+B", "MacIntel")).toBe("Cmd+B");
    expect(formatShortcut("Mod+Z", "iPad")).toBe("Cmd+Z");
  });
});
