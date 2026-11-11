import type { SVGProps } from "react";
import {
  ArrowLeft as ArrowLeftIcon,
  Check as CheckIcon,
  WarningCircle as WarningCircleIcon,
  Download as DownloadIcon,
  MoreHoriz as MoreHorizIcon,
  Refresh as RefreshIcon,
  Plus as PlusIcon,
  Search as SearchIcon,
  Star as StarIcon,
  Trash as TrashIcon,
  Xmark as XmarkIcon,
  NavArrowDown as NavArrowDownIcon,
  NavArrowRight as NavArrowRightIcon,
  Page as PageIcon,
  Folder as FolderIcon,
  FolderPlus as FolderPlusIcon,
  EditPencil as EditPencilIcon,
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  TextSize as TextSizeIcon,
  List as ListIcon,
  NumberedListLeft as NumberedListLeftIcon,
  TaskList as TaskListIcon,
  Quote as QuoteIcon,
  Code as CodeIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
} from "iconoir-react";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & {
  size?: number;
};

// Keep sizing and accessibility consistent for decorative interface icons.
function icon(Component: typeof ArrowLeftIcon) {
  return function Icon({ size = 18, ...props }: IconProps) {
    return (
      <Component
        width={size}
        height={size}
        strokeWidth={1.5}
        aria-hidden="true"
        focusable="false"
        {...props}
      />
    );
  };
}
export type IconComponent = ReturnType<typeof icon>;
export const ArrowLeft = icon(ArrowLeftIcon);
export const Check = icon(CheckIcon);
export const WarningCircle = icon(WarningCircleIcon);
export const Download = icon(DownloadIcon);
export const MoreHoriz = icon(MoreHorizIcon);
export const Refresh = icon(RefreshIcon);
export const Plus = icon(PlusIcon);
export const Search = icon(SearchIcon);
export const Star = icon(StarIcon);
export const Trash = icon(TrashIcon);
export const Xmark = icon(XmarkIcon);
export const NavArrowDown = icon(NavArrowDownIcon);
export const NavArrowRight = icon(NavArrowRightIcon);
export const Page = icon(PageIcon);
export const Folder = icon(FolderIcon);
export const FolderPlus = icon(FolderPlusIcon);
export const EditPencil = icon(EditPencilIcon);
export const Bold = icon(BoldIcon);
export const Italic = icon(ItalicIcon);
export const Underline = icon(UnderlineIcon);
export const TextSize = icon(TextSizeIcon);
export const List = icon(ListIcon);
export const NumberedListLeft = icon(NumberedListLeftIcon);
export const TaskList = icon(TaskListIcon);
export const Quote = icon(QuoteIcon);
export const Code = icon(CodeIcon);
export const Undo = icon(UndoIcon);
export const Redo = icon(RedoIcon);
