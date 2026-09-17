import { isElementWithinContainer } from "./is-element-within-container.js";

// Scope and mode for the active point-to-svelte instance, held as a singleton so
// utilities outside the init closure (hit-testing, viewport math) can read them
// without threading them through every call.
//
// - Scope container confines point-to-svelte to one element instead of the whole
//   page: hit-testing is filtered to the container's subtree and the toolbar
//   treats the container's box as its viewport. A live DOM element, so set at
//   runtime; init owns its lifecycle (set after the single-init guard, cleared
//   on cleanup).
// - Demo mode is always off in this fork. React Grab used it for the hosted
//   showcase build; the branches are kept so the port stays close to upstream,
//   and fold away at build time.

let scopeContainer: HTMLElement | null = null;

export const setScopeContainer = (container: HTMLElement | null): void => {
  scopeContainer = container;
};

export const getScopeContainer = (): HTMLElement | null => scopeContainer;

export const isWithinScope = (element: Element | null): boolean => {
  if (!scopeContainer) return true;
  return element ? isElementWithinContainer(element, scopeContainer) : false;
};

export const IS_DEMO = false;

// Input-event listeners are registered through this helper so a future
// display-only build can gate real user input in one place. In this fork it
// returns the handler unchanged, so hot event paths pay nothing.
export const ignoreRealInput = <EventType extends Event>(
  handler: (event: EventType) => void,
): ((event: EventType) => void) => handler;
