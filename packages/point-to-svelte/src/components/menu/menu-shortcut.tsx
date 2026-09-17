import type { Component } from "solid-js";
import { cn } from "../../utils/cn.js";
import { ShortcutHint } from "../shortcut-hint.js";

export interface MenuShortcutProps {
  shortcut: string;
  modifier?: boolean;
  class?: string;
}

export const MenuShortcut: Component<MenuShortcutProps> = (props) => (
  <ShortcutHint
    shortcut={props.shortcut}
    modifier={props.modifier}
    class={cn("text-[11px] font-sans text-[var(--sg-text-secondary)] ml-4", props.class)}
  />
);
