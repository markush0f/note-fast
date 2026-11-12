import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ITEM_ICON_IDS } from "../lib/item-icons";
import ItemIcon from "./ItemIcon";

describe("Iconoir catalogue rendering", () => {
  it("renders every catalogue entry as an SVG", () => {
    for (const id of ITEM_ICON_IDS) {
      const markup = renderToStaticMarkup(
        <ItemIcon icon={id} kind="note" size={24} />,
      );
      expect(markup).toContain("<svg");
      expect(markup).toContain(`data-item-icon="${id}"`);
      expect(markup).toContain('width="24"');
      expect(markup).toContain('aria-hidden="true"');
    }
  });
  it("keeps the default note and notebook icons", () => {
    expect(renderToStaticMarkup(<ItemIcon kind="note" />)).toContain(
      'data-item-icon="page"',
    );
    expect(renderToStaticMarkup(<ItemIcon kind="notebook" />)).toContain(
      'data-item-icon="book"',
    );
  });
});
