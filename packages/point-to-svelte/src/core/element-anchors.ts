import { indexInParent } from "../utils/index-in-parent.js";
import { isShadowRoot } from "../utils/is-shadow-root.js";

interface ElementAnchorPathStep {
  childIndex: number;
  isShadowChild: boolean;
}

// Svelte re-creates a DOM node whenever a block re-renders (a keyed `{#each}`
// reorder, an `{#if}` branch swap, a transition swapping the subtree), so a
// captured Element detaches while the overlay still refers to it. Svelte has no
// node identity we can follow across that swap, so we record the element's
// position in the tree instead and re-walk it: the anchor is the nearest
// ancestor that survived, plus the child-index path down to the replacement.
interface ElementAnchor {
  anchorElement: Element;
  domPath: ElementAnchorPathStep[];
  targetTagName: string;
}

const anchorByElement = new WeakMap<Element, ElementAnchor>();

const followDomPath = (root: Element, domPath: ElementAnchorPathStep[]): Element | null => {
  let node: Element = root;
  for (const pathStep of domPath) {
    const childCollection = pathStep.isShadowChild ? node.shadowRoot?.children : node.children;
    const child = childCollection?.[pathStep.childIndex];
    if (!child) return null;
    node = child;
  }
  return node;
};

// Walks up until it reaches an ancestor whose own child-index path is unlikely
// to shift: the document body, a shadow root host, or an element with a stable
// id. Everything below that anchor is recoverable by index.
const findAnchor = (element: Element): ElementAnchor | null => {
  const domPath: ElementAnchorPathStep[] = [];
  let anchorElement: Element | null = element;
  let currentElement: Element | null = element;

  while (currentElement) {
    const parentElement: Element | null = currentElement.parentElement;
    if (parentElement) {
      if (parentElement === document.body || parentElement.id) break;
      domPath.unshift({ childIndex: indexInParent(currentElement), isShadowChild: false });
      currentElement = parentElement;
      anchorElement = parentElement;
      continue;
    }

    const rootNode = currentElement.getRootNode();
    if (!isShadowRoot(rootNode)) break;
    domPath.unshift({ childIndex: indexInParent(currentElement), isShadowChild: true });
    currentElement = rootNode.host;
    anchorElement = rootNode.host;
  }

  if (!anchorElement) return null;
  return { anchorElement, domPath, targetTagName: element.tagName };
};

const isAnchorFresh = (anchor: ElementAnchor, element: Element): boolean =>
  anchor.anchorElement.isConnected &&
  followDomPath(anchor.anchorElement, anchor.domPath) === element;

export const trackElementAnchor = (element: Element): void => {
  if (!element.isConnected) return;
  const existingAnchor = anchorByElement.get(element);
  if (existingAnchor && isAnchorFresh(existingAnchor, element)) return;
  const anchor = findAnchor(element);
  if (anchor) anchorByElement.set(element, anchor);
};

export const resolveLiveElement = (element: Element): Element | null => {
  if (element.isConnected) return element;

  const anchor = anchorByElement.get(element);
  if (!anchor) return null;

  if (!anchor.anchorElement.isConnected) {
    // The anchor itself was replaced. Re-anchor on the nearest surviving
    // ancestor of its recorded position so a full subtree swap still recovers.
    const parentAnchor = anchorByElement.get(anchor.anchorElement);
    if (!parentAnchor) return null;
    const liveParentAnchor = resolveLiveElement(anchor.anchorElement);
    if (!liveParentAnchor) return null;
    const recovered = followDomPath(liveParentAnchor, anchor.domPath);
    return recovered && recovered.tagName === anchor.targetTagName ? recovered : null;
  }

  const recovered = followDomPath(anchor.anchorElement, anchor.domPath);
  if (recovered && recovered.isConnected && recovered.tagName === anchor.targetTagName) {
    return recovered;
  }
  return null;
};
