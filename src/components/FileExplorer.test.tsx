// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import FileExplorer from "./FileExplorer";
import { createNote } from "../lib/notes";
import { createFolder } from "../lib/workspace";
import type { ItemTarget } from "../lib/item-icons";

const parent = createFolder("Proyectos");
const child = createFolder("Ideas", parent.id);
const folders = [parent, child];
const nestedNote = { ...createNote(child.id), title: "Plan" };
const rootNote = { ...createNote(), title: "Otra" };
const notes = [nestedNote, rootNote];
const noop = () => {};

function Harness({ query = "" }: { query?: string }) {
  const [selection, setSelection] = useState<ItemTarget | null>({
    kind: "note",
    id: nestedNote.id,
  });
  const [activeFolderId, setActiveFolderId] = useState<string | null>(child.id);
  return (
    <FileExplorer
      notes={notes}
      folders={folders}
      selection={selection}
      activeFolderId={activeFolderId}
      query={query}
      favorites={false}
      onSelect={(note) => {
        setSelection({ kind: "note", id: note.id });
        setActiveFolderId(note.folderId);
      }}
      onSelectFolder={(id) => {
        setSelection(id === null ? null : { kind: "folder", id });
        setActiveFolderId(id);
      }}
      onNewNote={noop}
      onNewFolder={noop}
      onRenameFolder={noop}
      onChangeFolderIcon={noop}
      onDeleteFolder={noop}
      onMoveNote={noop}
    />
  );
}

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
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
});
const current = () =>
  Array.from(container.querySelectorAll('[aria-current="true"]')).map((item) =>
    item.getAttribute("aria-label"),
  );
const click = (label: string) =>
  act(() => {
    container
      .querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!
      .click();
  });

describe("single explorer selection", () => {
  it("highlights only the note while keeping its ancestors expanded", () => {
    act(() => root.render(<Harness />));
    expect(current()).toEqual(["Abrir Plan"]);
    for (const name of ["Proyectos", "Ideas"]) {
      const row = container.querySelector(
        `[aria-label="Seleccionar carpeta ${name}"]`,
      )!.parentElement!;
      expect(row.classList.contains("bg-transparent")).toBe(true);
      expect(row.classList.contains("bg-selection")).toBe(false);
    }
    expect(
      container
        .querySelector('[aria-label="Cuaderno (raíz)"]')!
        .classList.contains("bg-transparent"),
    ).toBe(true);
    expect(
      container.querySelector('[aria-label="Contraer Proyectos"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[aria-label="Contraer Ideas"]'),
    ).not.toBeNull();
    click("Abrir Otra");
    expect(current()).toEqual(["Abrir Otra"]);
  });
  it("replaces the note highlight when a folder or root is clicked", () => {
    act(() => root.render(<Harness />));
    click("Seleccionar carpeta Ideas");
    expect(current()).toEqual(["Seleccionar carpeta Ideas"]);
    click("Seleccionar carpeta Proyectos");
    expect(current()).toEqual(["Seleccionar carpeta Proyectos"]);
    click("Cuaderno (raíz)");
    expect(current()).toEqual(["Cuaderno (raíz)"]);
    click("Abrir Plan");
    expect(current()).toEqual(["Abrir Plan"]);
  });
  it("does not select the root alongside a note in search results", () => {
    act(() => root.render(<Harness query="Plan" />));
    expect(current()).toEqual(["Abrir Plan"]);
    click("Cuaderno (raíz)");
    expect(current()).toEqual(["Cuaderno (raíz)"]);
    click("Abrir Plan");
    expect(current()).toEqual(["Abrir Plan"]);
  });
});
