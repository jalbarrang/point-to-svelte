// Identifies the shadow host and overlay elements. Kept as a single constant so
// every query that must distinguish overlay DOM from page content shares one
// source of truth.
export const SVELTE_GRAB_ATTRIBUTE_NAME = "data-point-to-svelte";
