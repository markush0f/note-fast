import type { ComponentProps } from "react";

const focus =
  "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-500 disabled:cursor-default disabled:opacity-30";
export const iconButtonClass = `inline-flex size-7.5 shrink-0 items-center justify-center rounded bg-transparent text-muted hover:bg-hover hover:text-ink aria-pressed:bg-hover aria-pressed:text-ink ${focus}`;
const variants = {
  icon: iconButtonClass,
  primary: `inline-flex items-center justify-center gap-2 rounded bg-stone-800 px-3.5 py-2.5 text-xs text-white hover:bg-stone-950 ${focus}`,
  secondary: `inline-flex items-center justify-center gap-2 rounded bg-stone-100 px-3.5 py-2.5 text-xs text-stone-600 hover:bg-stone-200 ${focus}`,
  danger: `inline-flex items-center justify-center gap-2 rounded bg-red-800 px-3.5 py-2.5 text-xs text-white hover:bg-red-900 ${focus}`,
  text: `bg-transparent p-0 text-xs underline underline-offset-3 ${focus}`,
  menu: `flex w-full items-center gap-2 rounded px-2.5 py-2.5 text-left text-xs text-stone-600 hover:bg-stone-50 ${focus}`,
  menuDanger: `flex w-full items-center gap-2 rounded px-2.5 py-2.5 text-left text-xs text-red-800 hover:bg-red-50 ${focus}`,
};

export function Button({
  variant = "secondary",
  className = "",
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof variants }) {
  return (
    <button
      type={type}
      className={`${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function MenuItems({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`absolute top-9 right-0 z-20 w-50 rounded-md border border-line bg-white p-1 shadow-lg shadow-black/5 ${className}`}
      {...props}
    />
  );
}
