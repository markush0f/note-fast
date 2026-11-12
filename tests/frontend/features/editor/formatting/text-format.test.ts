import { describe, expect, it } from "vitest";
import { isTextColor, parseLink } from "../../../../../src/features/editor/formatting/text-format";

describe("text format values", () => {
  it("accepts web and mail links and rejects other protocols", () => {
    expect(parseLink("https://ejemplo.es/notas")).toBe(
      "https://ejemplo.es/notas",
    );
    expect(parseLink("ejemplo.es")).toBe("https://ejemplo.es/");
    expect(parseLink("mailto:hola@ejemplo.es")).toBe("mailto:hola@ejemplo.es");
    for (const value of [
      "",
      "nota",
      "javascript:alert(1)",
      "data:text/html,hola",
      "https://",
      "mailto:",
      "file:///tmp/notas",
    ])
      expect(parseLink(value)).toBeNull();
  });

  it("only accepts full hex colors", () => {
    expect(isTextColor("#1d4ed8")).toBe(true);
    expect(isTextColor("#1D4ED8")).toBe(true);
    for (const value of ["red", "#fff", "#1d4ed8ff", "rgb(0,0,0)", ""])
      expect(isTextColor(value)).toBe(false);
  });
});
