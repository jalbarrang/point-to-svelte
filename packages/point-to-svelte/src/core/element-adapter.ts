import type { OverlayBounds } from "../types.js";

// An adapter lets a renderer that has no real DOM element of its own (a WebGL
// canvas object, a shadow-DOM portal, a canvas-drawn widget) participate in grab
// selection. Adapters are registered against the host element the renderer does
// own — normally the <canvas> — and every DOM-facing helper (bounds, selector,
// preview, tag name, hit testing) routes through it.
export interface ElementAdapter {
  hostElement: Element;
  supportsDomEditing: boolean;
  getBounds: () => OverlayBounds;
  getPreview: () => string;
  getSelector: () => string;
  getTagName: () => string;
  isConnected: () => boolean;
  // Resolves the renderer's own object at a viewport point. Returning null falls
  // back to the host element, so an adapter can decline a hit.
  resolveElementAtPoint?: (clientX: number, clientY: number) => Element | null;
  // Extra elements a drag selection should treat as covered by this adapter,
  // given the element resolved at the drag's endpoint.
  getSelectionElements?: (endpointElement: Element) => Element[];
}

const elementAdapters = new WeakMap<Element, ElementAdapter>();

export const registerElementAdapter = (element: Element, adapter: ElementAdapter): void => {
  elementAdapters.set(element, adapter);
};

export const getElementAdapter = (element: Element): ElementAdapter | null =>
  elementAdapters.get(element) ?? null;
