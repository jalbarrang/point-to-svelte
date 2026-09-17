import { normalizeFileName } from "./normalize-file-name.js";

const SOURCE_FILE_EXTENSION_REGEX = /\.(cjs|cts|js|jsx|mdx|mjs|mts|svelte|svx|ts|tsx)$/;

// `.svelte-kit` is SvelteKit's generated output directory: its files are real
// paths but never user-authored source, so they must not be promoted over the
// route/component file that a grabbed element actually lives in.
const BUNDLED_FILE_PATTERN_REGEX =
  /(\.min|bundle|chunk|vendor|vendors|runtime|polyfill|polyfills)\.(js|mjs|cjs)$|(chunk|bundle|vendor|vendors|runtime|polyfill|polyfills|framework|app|main|index)[-_.][A-Za-z0-9_-]{4,}\.(js|mjs|cjs)$|[\da-f]{8,}\.(js|mjs|cjs)$|[-_.][\da-f]{20,}\.(js|mjs|cjs)$|\/dist\/|\/build\/|(^|[/\\])\.svelte-kit[/\\]|\/node_modules\/|\.webpack\.|\.vite\.|\.turbopack\./i;

export const isSourceFile = (fileName: string): boolean => {
  const normalizedFileName = normalizeFileName(fileName);
  if (!normalizedFileName) return false;
  if (!SOURCE_FILE_EXTENSION_REGEX.test(normalizedFileName)) return false;
  if (BUNDLED_FILE_PATTERN_REGEX.test(normalizedFileName)) return false;
  return true;
};
