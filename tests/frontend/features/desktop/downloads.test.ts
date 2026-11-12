import { describe, expect, it } from "vitest";
import { desktopDownloadURL, desktopDownloads, desktopPlatform } from "../../../../src/features/desktop/downloads";

describe("desktop downloads", () => {
  it("uses the published installer names", () => {
    expect(desktopDownloads.map((item) => item.file)).toEqual([
      "ntbk-linux-amd64.deb",
      "ntbk-linux-amd64.AppImage",
      "ntbk-windows-x64-setup.exe",
      "ntbk-darwin-aarch64.dmg",
      "ntbk-darwin-x64.dmg",
    ]);
    expect(desktopDownloadURL("ntbk-linux-amd64.deb")).toBe(
      "https://github.com/markush0f/note-fast/releases/latest/download/ntbk-linux-amd64.deb",
    );
  });

  it("detects the current operating system", () => {
    expect(desktopPlatform("Mozilla/5.0 (X11; Linux x86_64)")).toBe("linux");
    expect(desktopPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("windows");
    expect(desktopPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe("mac");
    expect(desktopPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("other");
  });
});
