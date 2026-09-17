import { HIT_TEST_SHIELD_ATTRIBUTE } from "../constants.js";
import { isSvelteGrabHost } from "./is-svelte-grab-host.js";
import { isShadowRoot } from "./is-shadow-root.js";

export const isSvelteGrabElement = (element: Element): boolean => {
  if (isSvelteGrabHost(element)) return true;
  if (element.hasAttribute(HIT_TEST_SHIELD_ATTRIBUTE)) return true;

  const rootNode = element.getRootNode();
  return isShadowRoot(rootNode) && isSvelteGrabHost(rootNode.host);
};
