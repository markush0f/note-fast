import { useState } from "react";
import {
  ICON_CATEGORIES,
  ITEM_ICONS,
  filterItemIcons,
  type IconCategory,
  type ItemIconId,
} from "../lib/item-icons";
import Dialog from "./Dialog";
import ItemIcon from "./ItemIcon";
import { Search, Xmark } from "./icons";
import { Button } from "./ui";

interface Props {
  name: string;
  value?: ItemIconId;
  onSelect: (icon: ItemIconId | null) => void;
  onClose: () => void;
}

export default function IconPicker({ name, value, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<IconCategory | "all">("all");
  const results = filterItemIcons(query, category);
  return (
    <Dialog title="Cambiar icono" description={name} onClose={onClose}>
      <div className="mt-4 flex h-9 items-center gap-2 rounded border border-line px-2 text-muted focus-within:border-stone-400">
        <Search size={15} />
        <input
          className="min-w-0 flex-1 bg-transparent text-xs text-ink outline-none placeholder:text-muted"
          aria-label="Buscar iconos"
          placeholder="Buscar iconos…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <Button
            variant="icon"
            aria-label="Limpiar búsqueda de iconos"
            onClick={() => setQuery("")}
          >
            <Xmark size={14} />
          </Button>
        )}
      </div>
      <div className="my-3 flex items-center justify-between gap-2">
        <select
          className="max-w-45 rounded border border-line bg-white px-2 py-1.5 text-xs text-stone-600 outline-none focus:border-stone-400"
          aria-label="Categoría de iconos"
          value={category}
          onChange={(event) =>
            setCategory(event.target.value as IconCategory | "all")
          }
        >
          <option value="all">Todas las categorías</option>
          {Object.entries(ICON_CATEGORIES).map(([id, label]) => (
            <option value={id} key={id}>
              {label}
            </option>
          ))}
        </select>
        <span className="text-[10px] text-muted" role="status">
          {results.length} de {ITEM_ICONS.length}
        </span>
      </div>
      <div
        className="max-h-[min(320px,40dvh)] overflow-y-auto overscroll-contain p-1 [scrollbar-width:thin]"
        role="group"
        aria-label="Iconos disponibles"
      >
        {results.length ? (
          <div className="grid grid-cols-5 gap-1.5">
            {results.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-label={label}
                title={label}
                aria-pressed={value === id}
                className="flex aspect-square w-full cursor-pointer items-center justify-center rounded-md border border-transparent text-stone-600 hover:bg-hover aria-pressed:border-stone-400 aria-pressed:bg-selection aria-pressed:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-500"
                onClick={() => onSelect(id)}
              >
                <ItemIcon icon={id} kind="note" size={24} />
              </button>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-xs text-muted">
            No hay iconos que coincidan.
          </p>
        )}
      </div>
      <div className="mt-5 flex justify-between gap-2">
        <Button variant="text" onClick={() => onSelect(null)}>
          Restaurar predeterminado
        </Button>
        <Button onClick={onClose}>Cancelar</Button>
      </div>
    </Dialog>
  );
}
