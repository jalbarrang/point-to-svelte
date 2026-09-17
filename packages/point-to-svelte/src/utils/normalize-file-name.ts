const ANONYMOUS_FILE_NAMES = new Set(["<anonymous>", "eval", ""]);

const SCHEME_PREFIXES: readonly string[] = [
  "rsc://",
  "file:///",
  "webpack-internal://",
  "webpack://",
  "node:",
  "turbopack://",
  "metro://",
];

const SCHEME_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
const WINDOWS_DRIVE_PATH_REGEX = /^[a-zA-Z]:[\\/]/;
const QUERY_PARAMETER_PATTERN = /^\?[\w~.-]+(?:=[^&#]*)?(?:&[\w~.-]+(?:=[^&#]*)?)*$/;

// Svelte's dev-only `__svelte_meta.loc.file` is the compiler `filename`, which is
// whatever the bundler passed in: usually an absolute path with Windows
// separators. Normalizing to a forward-slash path keeps the copied context
// portable and lets segment-based heuristics (shared UI, generated bundles) work
// on it unchanged.
export const normalizeFileName = (fileName: string): string => {
  if (!fileName || ANONYMOUS_FILE_NAMES.has(fileName)) return "";

  let normalizedFileName = fileName.replace(/\\/g, "/");
  const isWindowsDrivePath = WINDOWS_DRIVE_PATH_REGEX.test(fileName);

  let didStripPrefix = true;
  while (didStripPrefix) {
    didStripPrefix = false;
    for (const prefix of SCHEME_PREFIXES) {
      if (!normalizedFileName.startsWith(prefix)) continue;
      normalizedFileName = normalizedFileName.slice(prefix.length);
      if (prefix === "file:///") {
        normalizedFileName = `/${normalizedFileName.replace(/^\/+/, "")}`;
      }
      didStripPrefix = true;
      break;
    }
  }

  if (!isWindowsDrivePath) {
    const schemeMatch = normalizedFileName.match(SCHEME_REGEX);
    if (schemeMatch) normalizedFileName = normalizedFileName.slice(schemeMatch[0].length);
  }

  const queryParameterIndex = normalizedFileName.indexOf("?");
  if (queryParameterIndex !== -1) {
    const potentialQueryParameters = normalizedFileName.slice(queryParameterIndex);
    if (QUERY_PARAMETER_PATTERN.test(potentialQueryParameters)) {
      normalizedFileName = normalizedFileName.slice(0, queryParameterIndex);
    }
  }

  return normalizedFileName;
};
