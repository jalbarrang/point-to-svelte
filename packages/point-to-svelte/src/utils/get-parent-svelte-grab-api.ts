import type { SvelteGrabAPI } from "../types.js";

export const getParentSvelteGrabApi = (): SvelteGrabAPI | null => {
  if (typeof window === "undefined" || window.parent === window) return null;

  try {
    return window.parent.__POINT_TO_SVELTE__ ?? null;
  } catch {
    return null;
  }
};
