const SVELTE_GRAB_HOST_ATTRIBUTES = ["data-point-to-svelte"];

export const isSvelteGrabHost = (element: Element): boolean =>
  SVELTE_GRAB_HOST_ATTRIBUTES.some((attributeName) => element.hasAttribute(attributeName));
