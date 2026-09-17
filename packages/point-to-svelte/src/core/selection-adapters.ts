import { getElementAdapter } from "./element-adapter.js";

export const resolveAdapterElementAtPoint = (
  element: Element,
  clientX: number,
  clientY: number,
): Element => {
  const adapter = getElementAdapter(element);
  if (!adapter?.resolveElementAtPoint) return element;
  try {
    return adapter.resolveElementAtPoint(clientX, clientY) ?? element;
  } catch {
    return element;
  }
};

export const getAdapterSelectionElements = (
  element: Element,
  endpointElement: Element,
): Element[] => {
  const adapter = getElementAdapter(element);
  if (!adapter?.getSelectionElements) return [];
  try {
    return adapter.getSelectionElements(endpointElement);
  } catch {
    return [];
  }
};
