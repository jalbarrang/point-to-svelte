import { getContext, setContext } from "svelte";
import type { Accessor } from "../../reactivity.svelte";

export interface MenuItemRegistration {
  value: string;
  domId: string;
  element: HTMLButtonElement;
  isEnabled: () => boolean;
  onSelect: () => void;
}

export interface MenuStore {
  keyboardNavigation: boolean;
  clearActiveOnPointerLeave: boolean;
  activeValue: Accessor<string | null>;
  activeDescendantId: Accessor<string | undefined>;
  setActiveItem: (value: string | null) => void;
  createItemId: () => string;
  canActivateOnHover: () => boolean;
  notePointerMove: () => void;
  resetPointerMove: () => void;
  registerItem: (registration: MenuItemRegistration) => void;
  unregisterItem: (value: string) => void;
  getActiveItem: () => MenuItemRegistration | undefined;
  selectFirst: () => void;
  selectLast: () => void;
  selectNext: () => void;
  selectPrevious: () => void;
  setHighlightContainer: (element: HTMLElement) => void;
  setHighlightRail: (element: HTMLElement) => void;
}

const MENU_STORE_CONTEXT = Symbol("point-to-svelte-menu-store");

export const setMenuStore = (store: MenuStore): void => {
  setContext(MENU_STORE_CONTEXT, store);
};

export const useMenuStore = (): MenuStore => {
  const store = getContext<MenuStore | undefined>(MENU_STORE_CONTEXT);
  if (!store) {
    throw new Error("Menu subcomponents must be rendered inside <Menu.Provider>");
  }
  return store;
};
