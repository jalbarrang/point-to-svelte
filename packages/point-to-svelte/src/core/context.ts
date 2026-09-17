import { MAX_TRACE_CONTEXT_LINES } from "../constants.js";
import { resolveMaxContextLines } from "../utils/resolve-max-context-lines.js";
import { normalizeFilePath } from "../utils/normalize-file-path.js";
import {
  classifySourcePath,
  type SourcePathClassification,
} from "../utils/classify-source-path.js";
import { createElementSelectorDetails } from "../utils/create-element-selector.js";
import { createNearestSemanticElementSelectorDetails } from "../utils/create-nearest-semantic-element-selector-details.js";
import { findSelectorTarget } from "../utils/find-selector-target.js";
import { getComposedParentElement } from "../utils/get-composed-parent-element.js";
import { isGeneratedBundleSourcePath } from "../utils/is-generated-bundle-source-path.js";
import { isSharedUiSourcePath } from "../utils/is-shared-ui-source-path.js";
import { formatComponentNameLines } from "../utils/format-component-name-lines.js";
import { getHTMLPreview, getInlineHTMLPreview } from "./html-preview.js";
import { isInternalComponentName, isUsefulComponentName } from "../utils/is-useful-component-name.js";
import { shouldIncludeElementSelector } from "../utils/should-include-element-selector.js";
import type { SourceLocation } from "../types.js";

const SVELTE_META_PROPERTY = "__svelte_meta";
// Svelte's `loc.column` is 0-based; every editor and stack trace is 1-based.
const SVELTE_COLUMN_OFFSET = 1;
// SvelteKit renders route components through `$.component()`, which leaves
// `componentTag` unset, and a component's own frame only names itself when it
// was instantiated from a static `<Component />`. Falling back to the file name
// keeps the copied stack useful for those, and for plain `.svelte` files whose
// tag name differs from the file name.
const SVELTE_FILE_EXTENSION_REGEX = /\.svelte$/;
const COMPONENT_NAME_SEPARATOR_REGEX = /[-_.]/;

interface SvelteDevStackEntry {
  type?: string;
  file?: string;
  line?: number;
  column?: number;
  componentTag?: string;
  parent?: SvelteDevStackEntry | null;
}

interface SvelteDevLocation {
  file?: string;
  line?: number;
  column?: number;
}

interface SvelteDevMeta {
  loc?: SvelteDevLocation;
  parent?: SvelteDevStackEntry | null;
}

export interface StackFrame {
  functionName: string | null;
  fileName: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
  isServer: boolean;
  isSymbolicated: boolean;
}

const readSvelteMeta = (element: Element): SvelteDevMeta | null => {
  const meta: unknown = Reflect.get(element, SVELTE_META_PROPERTY);
  if (!meta || typeof meta !== "object") return null;
  return meta as SvelteDevMeta;
};

const findNearestSvelteMetaElement = (element: Element): Element | null => {
  let current: Element | null = element;
  while (current) {
    if (readSvelteMeta(current)) return current;
    current = getComposedParentElement(current);
  }
  return null;
};

const readMetaLocation = (meta: SvelteDevMeta): SourceLocation | null => {
  const location = meta.loc;
  if (!location || typeof location.file !== "string" || !location.file) return null;
  return {
    filePath: normalizeFilePath(location.file),
    lineNumber: typeof location.line === "number" ? location.line : null,
    columnNumber:
      typeof location.column === "number" ? location.column + SVELTE_COLUMN_OFFSET : null,
    componentName: null,
  };
};

const toComponentNameFromFile = (filePath: string | null | undefined): string | null => {
  if (!filePath) return null;
  const baseName = filePath.split("/").pop();
  if (!baseName) return null;

  const nameSegments = baseName
    .replace(SVELTE_FILE_EXTENSION_REGEX, "")
    .split(COMPONENT_NAME_SEPARATOR_REGEX)
    .filter(Boolean)
    .map((segment) => segment.replace(/^\+/, ""))
    .filter(Boolean);
  if (nameSegments.length === 0) return null;

  return nameSegments
    .map((segment) => `${segment[0].toUpperCase()}${segment.slice(1)}`)
    .join("");
};

// A dev-stack entry describes the place a component or block was created: `file`
// and `line` point at the `<Component />` tag (or block) in the enclosing file,
// while `componentTag` names the component being created. Tag-less entries are
// dynamic (`<svelte:component this={…}>`), where the tag name is only known at
// runtime; the location is still meaningful, so they are kept without a name.
const resolveFrameComponentName = (entry: SvelteDevStackEntry): string | null =>
  entry.componentTag ?? null;

// Blocks (`if`/`each`/`key`/`await`/`render`) also push dev-stack entries, but
// they are not components: they are skipped as frames so the trace stays a
// component stack, and only walked through to reach the next component.
const isComponentStackEntry = (entry: SvelteDevStackEntry): boolean =>
  entry.type === "component" || Boolean(entry.componentTag);

const isSourceComponentName = (name: string): boolean => {
  if (name.length <= 1) return false;
  if (isInternalComponentName(name)) return false;
  if (name[0] !== name[0].toUpperCase()) return false;
  return true;
};

const toSourceComponentName = (name: string | null | undefined): string | null =>
  name && isSourceComponentName(name) ? name : null;

const createStackFrame = (
  filePath: string | null,
  lineNumber: number | null,
  columnNumber: number | null,
  functionName: string | null,
): StackFrame => ({
  functionName: toSourceComponentName(functionName) ?? functionName,
  fileName: filePath,
  lineNumber,
  columnNumber,
  isServer: false,
  isSymbolicated: true,
});

const readElementStack = (element: Element): StackFrame[] => {
  const metaElement = findNearestSvelteMetaElement(element);
  const meta = metaElement ? readSvelteMeta(metaElement) : null;
  if (!meta) return [];

  const frames: StackFrame[] = [];
  const seenLocations = new Set<string>();

  const pushFrame = (frame: StackFrame): void => {
    if (!frame.fileName) return;
    const identity = `${frame.fileName}:${frame.lineNumber ?? ""}:${frame.columnNumber ?? ""}`;
    if (seenLocations.has(identity)) return;
    seenLocations.add(identity);
    frames.push(frame);
  };

  const location = readMetaLocation(meta);
  const enclosingEntry = meta.parent ?? null;
  if (location) {
    pushFrame(
      createStackFrame(
        location.filePath,
        location.lineNumber,
        location.columnNumber,
        enclosingEntry?.componentTag ?? toComponentNameFromFile(location.filePath),
      ),
    );
  }

  let entry = enclosingEntry;
  while (entry) {
    if (isComponentStackEntry(entry)) {
      pushFrame(
        createStackFrame(
          normalizeFilePath(entry.file ?? ""),
          typeof entry.line === "number" ? entry.line : null,
          typeof entry.column === "number" ? entry.column + SVELTE_COLUMN_OFFSET : null,
          resolveFrameComponentName(entry),
        ),
      );
    }
    entry = entry.parent ?? null;
  }

  return frames;
};

const readComponentNames = (
  element: Element,
  maxCount: number,
  shouldIncludeName: (componentName: string) => boolean = () => true,
): string[] => {
  const metaElement = findNearestSvelteMetaElement(element);
  const meta = metaElement ? readSvelteMeta(metaElement) : null;
  if (!meta) return [];

  const componentNames: string[] = [];
  const seenNames = new Set<string>();
  // Generated files (SvelteKit's `.svelte-kit/generated` root component) carry
  // compiler-internal names like `Pyramid_1`, which say nothing about the app.
  const addName = (name: string | null, sourceFilePath?: string | null): void => {
    if (!name || componentNames.length >= maxCount) return;
    if (sourceFilePath && classifySourcePath(sourceFilePath).origin === "unknown") return;
    if (seenNames.has(name)) return;
    if (!isUsefulComponentName(name) || !shouldIncludeName(name)) return;
    seenNames.add(name);
    componentNames.push(name);
  };

  const location = readMetaLocation(meta);
  const enclosingEntry = meta.parent ?? null;
  if (location) {
    addName(
      enclosingEntry?.componentTag ?? toComponentNameFromFile(location.filePath),
      location.filePath,
    );
  }

  let entry = enclosingEntry;
  while (entry) {
    if (isComponentStackEntry(entry)) addName(resolveFrameComponentName(entry), entry.file);
    entry = entry.parent ?? null;
  }

  if (componentNames.length === 0 && location) {
    addName(toComponentNameFromFile(location.filePath), location.filePath);
  }

  return componentNames;
};

export const isInstrumentationActive = (): boolean => true;

export const getStack = async (element: Element): Promise<StackFrame[]> => readElementStack(element);

export const getComponentDisplayName = (element: Element): string | null =>
  readComponentNames(element, 1)[0] ?? null;

export const getNearestComponentName = async (element: Element): Promise<string | null> =>
  readComponentNames(element, 1)[0] ?? null;

export interface ResolvedSource extends SourceLocation {
  origin: SourcePathClassification["origin"];
}

const toResolvedSource = (frame: StackFrame): ResolvedSource => ({
  filePath: frame.fileName ?? "",
  lineNumber: frame.lineNumber,
  columnNumber: frame.columnNumber,
  componentName: frame.functionName,
  origin: classifySourcePath(frame.fileName).origin,
});

// Package sources are never promoted to the leading line: surfacing
// node_modules paths is what this avoids. Unlike the framework-agnostic owner
// stack, the first frame here is the element's own declaration site, so it is
// the best answer whenever it is app-owned.
const resolveLeadingSource = (frames: StackFrame[]): ResolvedSource | null => {
  const leadingFrame = frames[0];
  if (!leadingFrame?.fileName) return null;
  const leadingSource = toResolvedSource(leadingFrame);
  return leadingSource.origin === "app" ? leadingSource : null;
};

const isTrustedAppSourcePath = (fileName: string | null | undefined): boolean =>
  Boolean(fileName) && !isSharedUiSourcePath(fileName) && !isGeneratedBundleSourcePath(fileName);

// Svelte's `loc.file` is the compiler `filename`, so it is absolute in every
// common setup. Trimming to the project-relative form (everything from the
// first `src`/`routes` segment) keeps the copied context short without giving up
// the path an agent needs.
const PROJECT_SOURCE_PATH_MARKERS = ["/src/", "/routes/"];

const formatContextFilePath = (filePath: string): string => {
  const normalizedPath = normalizeFilePath(filePath);
  const isAbsolutePath =
    normalizedPath.startsWith("/") || /^[a-zA-Z]:\//.test(normalizedPath);
  if (!isAbsolutePath) return normalizedPath;

  let earliestMarkerIndex = -1;
  for (const marker of PROJECT_SOURCE_PATH_MARKERS) {
    const markerIndex = normalizedPath.indexOf(marker);
    if (markerIndex === -1) continue;
    if (earliestMarkerIndex === -1 || markerIndex < earliestMarkerIndex) {
      earliestMarkerIndex = markerIndex;
    }
  }

  return earliestMarkerIndex === -1 ? normalizedPath : normalizedPath.slice(earliestMarkerIndex + 1);
};

const formatSourceContextLine = (source: SourceLocation): string => {
  const displayPath = formatContextFilePath(source.filePath);
  const location = source.lineNumber
    ? `${displayPath}:${source.lineNumber}${source.columnNumber ? `:${source.columnNumber}` : ""}`
    : displayPath;
  return source.componentName
    ? `\n  in ${source.componentName} (at ${location})`
    : `\n  in ${location}`;
};

interface StackFrameLine {
  text: string;
  // A real app-owned source file: suppresses the CSS selector-hint fallback.
  isAppSource: boolean;
  // High-signal app source that spends the line budget. Shared-UI frames are
  // app source but free, like package frames.
  consumesBudget: boolean;
}

const LOW_SIGNAL_FRAME: Pick<StackFrameLine, "isAppSource" | "consumesBudget"> = {
  isAppSource: false,
  consumesBudget: false,
};

const formatStackFrameLine = (
  frame: StackFrame,
  sourceClassification: SourcePathClassification,
  componentName: string | null,
): StackFrameLine | null => {
  // Generated code (SvelteKit's `.svelte-kit/generated` root component, bundler
  // chunks) classifies as `unknown`: it has no app path to show and no package
  // name to attribute, so the row would be pure noise in the copied context.
  if (sourceClassification.origin === "unknown") return null;

  const libraryPackage = sourceClassification.packageName;
  // Only app-owned frames contribute a file path; library frames render by
  // component name (e.g. "in Tabs (@bits-ui/core)") so node_modules paths never
  // compete with the resolved app source.
  const appSourceFilePath = sourceClassification.origin === "app" ? frame.fileName : null;

  if (!appSourceFilePath && componentName) {
    return {
      text: libraryPackage
        ? `\n  in ${componentName} (${libraryPackage})`
        : `\n  in ${componentName}`,
      ...LOW_SIGNAL_FRAME,
    };
  }

  if (libraryPackage) {
    return { text: `\n  in ${libraryPackage}`, ...LOW_SIGNAL_FRAME };
  }

  if (appSourceFilePath) {
    return {
      text: formatSourceContextLine({
        componentName,
        filePath: appSourceFilePath,
        lineNumber: frame.lineNumber ?? null,
        columnNumber: frame.columnNumber ?? null,
      }),
      isAppSource: true,
      consumesBudget: isTrustedAppSourcePath(appSourceFilePath),
    };
  }

  return null;
};

export interface StackContextOptions {
  maxLines?: number;
}

export interface TraceContextResult {
  text: string;
  shouldAppendSelectorHint: boolean;
  hasBudgetedStackFrame: boolean;
  renderedComponentNames: Set<string>;
  remainingHardLineCapacity: number;
}

export const formatStackContext = (
  stack: StackFrame[],
  options: StackContextOptions = {},
  leadingSource: ResolvedSource | null = null,
): TraceContextResult => {
  const maxLines = resolveMaxContextLines(options.maxLines);
  // max, not min: the extended cap must sit above the soft budget. A
  // caller-raised maxContextLines is allowed to lift the hard cap past
  // MAX_TRACE_CONTEXT_LINES on purpose (opting into a deeper trace); min would
  // collapse the cap onto maxLines and disable the free low-signal extension.
  const hardMaxLines = Math.max(maxLines, MAX_TRACE_CONTEXT_LINES);
  const lines: string[] = [];
  const renderedComponentNames = new Set<string>();
  let previousLibraryFrameKey: string | null = null;
  let didDedupeLeadingComponent = false;
  let hasTrustedSource = false;
  let hasBudgetedStackFrame = false;
  let budgetedLineCount = 0;

  const addComponentName = (componentName: string | null | undefined) => {
    if (componentName) renderedComponentNames.add(componentName);
  };

  if (leadingSource) {
    const leadingSourceConsumesBudget =
      leadingSource.origin === "app" && isTrustedAppSourcePath(leadingSource.filePath);
    hasTrustedSource = leadingSourceConsumesBudget;
    // A low-signal leading source means the user grabbed a primitive or a
    // design-system wrapper directly; keep its budget free so feature ancestors
    // can surface.
    if (leadingSourceConsumesBudget) budgetedLineCount += 1;
    addComponentName(leadingSource.componentName);
    lines.push(formatSourceContextLine(leadingSource));
  }

  for (const frame of stack) {
    // maxLines is the budget for high-signal app-source frames. Low-signal
    // lines (library frames and shared-UI/design-system app frames) are free:
    // they never consume the soft budget, only the hard cap, so wrapper noise
    // never crowds out the meaningful app source locations.
    if (!maxLines || lines.length >= hardMaxLines) break;

    const sourceClassification = classifySourcePath(frame.fileName);

    const componentName = toSourceComponentName(frame.functionName);
    const libraryFrameKey = sourceClassification.packageName
      ? `${sourceClassification.packageName}:${componentName ?? ""}`
      : null;
    if (libraryFrameKey && libraryFrameKey === previousLibraryFrameKey) continue;

    // The element's own frame already names the component its template belongs
    // to; drop that one duplicate and keep the rest.
    if (!didDedupeLeadingComponent && componentName && componentName === leadingSource?.componentName) {
      didDedupeLeadingComponent = true;
      continue;
    }

    const frameLine = formatStackFrameLine(frame, sourceClassification, componentName);
    if (frameLine === null) continue;
    if (frameLine.consumesBudget && budgetedLineCount >= maxLines) continue;

    // A single component file can emit the same line repeatedly (a recursive
    // component, or several distinct elements that share one location). Skip
    // consecutive duplicates so the trace stays readable.
    if (frameLine.text === lines[lines.length - 1]) continue;

    if (frameLine.isAppSource && frameLine.consumesBudget) hasTrustedSource = true;
    if (frameLine.consumesBudget) {
      budgetedLineCount += 1;
      hasBudgetedStackFrame = true;
    }
    addComponentName(componentName);
    lines.push(frameLine.text);
    previousLibraryFrameKey = libraryFrameKey;
  }

  return {
    text: lines.join(""),
    shouldAppendSelectorHint: !hasTrustedSource,
    hasBudgetedStackFrame,
    renderedComponentNames,
    remainingHardLineCapacity: Math.max(0, hardMaxLines - lines.length),
  };
};

// When the element's own frame is a library or generated source, the trace names
// the grabbed primitive but not the feature components rendering it. The meta
// parent chain still knows those ancestors, so surface their names.
const appendComponentAncestorNames = (
  element: Element,
  stackContext: TraceContextResult,
  maxAncestorCount: number,
): TraceContextResult => {
  const ancestorCount = Math.min(maxAncestorCount, stackContext.remainingHardLineCapacity);
  if (ancestorCount === 0) return stackContext;

  const missingAncestorNames = readComponentNames(
    element,
    ancestorCount,
    (ancestorName) =>
      isSourceComponentName(ancestorName) && !stackContext.renderedComponentNames.has(ancestorName),
  );
  if (missingAncestorNames.length === 0) return stackContext;

  return {
    ...stackContext,
    text: `${stackContext.text}${formatComponentNameLines(missingAncestorNames)}`,
    remainingHardLineCapacity: stackContext.remainingHardLineCapacity - missingAncestorNames.length,
  };
};

const createTraceContext = (
  element: Element,
  options: StackContextOptions,
  stack: StackFrame[],
): TraceContextResult => {
  const leadingSource = resolveLeadingSource(stack);
  const maxLines = resolveMaxContextLines(options.maxLines);
  const stackContext = formatStackContext(stack, options, leadingSource);
  if (stackContext.text) {
    if (stackContext.hasBudgetedStackFrame) return stackContext;
    return appendComponentAncestorNames(element, stackContext, maxLines);
  }

  const componentNames = readComponentNames(element, maxLines);
  const hardMaxLines = Math.max(maxLines, MAX_TRACE_CONTEXT_LINES);
  return {
    text: formatComponentNameLines(componentNames),
    shouldAppendSelectorHint: true,
    hasBudgetedStackFrame: false,
    renderedComponentNames: new Set(componentNames),
    remainingHardLineCapacity: Math.max(0, hardMaxLines - componentNames.length),
  };
};

const getTraceContext = (element: Element, options: StackContextOptions = {}): TraceContextResult =>
  createTraceContext(element, options, readElementStack(element));

export const getStackContext = async (
  element: Element,
  options: StackContextOptions = {},
): Promise<string> => getTraceContext(element, options).text;

export const resolveSource = async (element: Element): Promise<ResolvedSource | null> => {
  const frames = readElementStack(element);
  const leadingSource = resolveLeadingSource(frames);
  if (leadingSource) return leadingSource;
  const firstFrameWithName = frames.find((frame) => frame.fileName);
  return firstFrameWithName ? toResolvedSource(firstFrameWithName) : null;
};

interface ResolvedElementContextBase {
  componentName: string | null;
  source: ResolvedSource | null;
  stack: StackFrame[];
  stackContext: string;
}

export interface ResolvedElementContext extends ResolvedElementContextBase {
  elementInfo: string;
  selector: string | null;
}

export interface ResolvedElementReferenceContext extends ResolvedElementContextBase {
  referenceContext: string;
}

interface ComposedElementContext {
  selector: string | null;
  text: string;
}

const composeElementContext = (
  element: Element,
  traceContext: TraceContextResult,
): ComposedElementContext => {
  const selectorDetails = traceContext.shouldAppendSelectorHint
    ? createElementSelectorDetails(findSelectorTarget(element))
    : createNearestSemanticElementSelectorDetails(element);
  const selector =
    selectorDetails && shouldIncludeElementSelector(traceContext.shouldAppendSelectorHint, selectorDetails)
      ? selectorDetails.selector
      : null;
  const selectorHint = selector ? `\n  selector: ${selector}` : "";
  return {
    selector,
    text: `${traceContext.text}${selectorHint}`,
  };
};

export const formatElementInfo = async (
  element: Element,
  options: StackContextOptions = {},
): Promise<string> => {
  const nearestMetaElement = findNearestSvelteMetaElement(element) ?? element;
  const htmlPreview = getHTMLPreview(nearestMetaElement);
  const traceContext = getTraceContext(nearestMetaElement, options);
  return `${htmlPreview}${composeElementContext(nearestMetaElement, traceContext).text}`;
};

const createResolvedElementContextBase = (
  element: Element,
  traceContext: TraceContextResult,
  stack: StackFrame[],
): ResolvedElementContextBase => ({
  componentName: getComponentDisplayName(element),
  source: resolveLeadingSource(stack) ?? (stack[0] ? toResolvedSource(stack[0]) : null),
  stack,
  stackContext: traceContext.text,
});

const createResolvedElementContext = (
  element: Element,
  options: StackContextOptions,
): ResolvedElementContext => {
  const stack = readElementStack(element);
  const traceContext = createTraceContext(element, options, stack);
  const nearestMetaElement = findNearestSvelteMetaElement(element) ?? element;
  const composedContext = composeElementContext(nearestMetaElement, traceContext);
  return {
    ...createResolvedElementContextBase(element, traceContext, stack),
    elementInfo: `${getHTMLPreview(nearestMetaElement)}${composedContext.text}`,
    selector: composedContext.selector,
  };
};

const createResolvedElementReferenceContext = (
  element: Element,
  options: StackContextOptions,
): ResolvedElementReferenceContext => {
  const stack = readElementStack(element);
  const traceContext = createTraceContext(element, options, stack);
  const composedContext = composeElementContext(element, traceContext);
  return {
    ...createResolvedElementContextBase(element, traceContext, stack),
    referenceContext: `${getInlineHTMLPreview(element)}${composedContext.text.replace(/\n\s+/g, " ")}`,
  };
};

export const resolveElementContext = async (
  element: Element,
  options: StackContextOptions = {},
): Promise<ResolvedElementContext> => createResolvedElementContext(element, options);

export const resolveElementReferenceContext = async (
  element: Element,
  options: StackContextOptions = {},
): Promise<ResolvedElementReferenceContext> =>
  createResolvedElementReferenceContext(element, options);

export const selectResolvedSource = (
  frames: StackFrame[],
): ResolvedSource | null => resolveLeadingSource(frames);
