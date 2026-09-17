const NON_COMPONENT_PREFIXES = new Set(["_", "$"]);

// Svelte's own special elements are not user components. Their dev-stack entries
// either omit `componentTag` or carry one of these names, so they must never
// become the displayed component name.
const SVELTE_INTERNAL_COMPONENT_NAMES = new Set([
  "SvelteBody",
  "SvelteBoundary",
  "SvelteComponent",
  "SvelteDocument",
  "SvelteElement",
  "SvelteFragment",
  "SvelteHead",
  "SvelteOptions",
  "SvelteSelf",
  "SvelteWindow",
]);

const PLACEHOLDER_COMPONENT_NAMES = new Set([
  "<anonymous>",
  "<unknown>",
  "Anonymous",
  "Unknown",
  "Component",
]);

const LIBRARY_INTERNAL_COMPONENT_NAMES = new Set(["Slot", "SlotClone"]);
const LIBRARY_INTERNAL_COMPONENT_SUFFIXES = [".Slot", ".SlotClone", "ProviderProvider"];

export const isInternalComponentName = (name: string): boolean => {
  if (PLACEHOLDER_COMPONENT_NAMES.has(name)) return true;
  if (SVELTE_INTERNAL_COMPONENT_NAMES.has(name)) return true;
  if (LIBRARY_INTERNAL_COMPONENT_NAMES.has(name)) return true;
  for (const suffix of LIBRARY_INTERNAL_COMPONENT_SUFFIXES) {
    if (name.endsWith(suffix)) return true;
  }
  for (const prefix of NON_COMPONENT_PREFIXES) {
    if (name.startsWith(prefix)) return true;
  }
  return false;
};

export const isUsefulComponentName = (name: string): boolean => {
  if (!name) return false;
  if (isInternalComponentName(name)) return false;
  return true;
};
