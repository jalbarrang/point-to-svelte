import launchEditor from "launch-editor";
import type { Plugin } from "vite";

const CLIENT_MODULE_ID = "point-to-svelte";
const OPEN_IN_EDITOR_ENDPOINT = "/__open-in-editor";
// launch-editor reports a missing editor through an async callback, so the
// response is held briefly: a success answers 200 (the client stops there), and
// an error answers 500 so the client falls back to an editor protocol URL.
const EDITOR_LAUNCH_ERROR_TIMEOUT_MS = 250;

export interface SvelteGrabPluginOptions {
  /**
   * Inject the client into the dev HTML for plain Vite apps. SvelteKit renders
   * its own HTML, so there the client is imported from `src/hooks.client.ts`.
   * @default true
   */
  inject?: boolean;
  /** Editor command for launch-editor. Defaults to launch-editor's own detection. */
  editor?: string;
}

interface OpenInEditorRequest {
  filePath: string;
  lineNumber?: number;
  columnNumber?: number;
}

const readNumber = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
};

const splitLocationSuffix = (
  rawFilePath: string,
): { filePath: string; lineNumber?: number; columnNumber?: number } => {
  const columnMatch = rawFilePath.match(/^(.*):(\d+):(\d+)$/);
  if (columnMatch) {
    return {
      filePath: columnMatch[1],
      lineNumber: Number(columnMatch[2]),
      columnNumber: Number(columnMatch[3]),
    };
  }

  const lineMatch = rawFilePath.match(/^(.*):(\d+)$/);
  if (lineMatch) return { filePath: lineMatch[1], lineNumber: Number(lineMatch[2]) };

  return { filePath: rawFilePath };
};

const parseOpenInEditorRequest = (requestUrl: string): OpenInEditorRequest | null => {
  const queryStart = requestUrl.indexOf("?");
  if (queryStart === -1) return null;

  const params = new URLSearchParams(requestUrl.slice(queryStart + 1));
  const rawFilePath = params.get("file");
  if (!rawFilePath) return null;

  const explicitLine = readNumber(params.get("line"));
  const explicitColumn = readNumber(params.get("column"));
  if (explicitLine !== undefined) {
    return { filePath: rawFilePath, lineNumber: explicitLine, columnNumber: explicitColumn };
  }

  return splitLocationSuffix(rawFilePath);
};

const launchFileInEditor = (
  request: OpenInEditorRequest,
  editor: string | undefined,
): Promise<boolean> =>
  new Promise((resolve) => {
    const location = request.lineNumber
      ? `${request.filePath}:${request.lineNumber}:${request.columnNumber ?? 1}`
      : request.filePath;

    const timeoutId = setTimeout(() => resolve(true), EDITOR_LAUNCH_ERROR_TIMEOUT_MS);

    launchEditor(location, editor, () => {
      clearTimeout(timeoutId);
      resolve(false);
    });
  });

export const svelteGrab = (options: SvelteGrabPluginOptions = {}): Plugin => {
  const shouldInjectClient = options.inject ?? true;

  return {
    name: "point-to-svelte",
    apply: "serve",
    transformIndexHtml() {
      if (!shouldInjectClient) return;
      return [
        {
          tag: "script",
          attrs: { type: "module" },
          children: `import "${CLIENT_MODULE_ID}";`,
          injectTo: "head",
        },
      ];
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!request.url?.startsWith(OPEN_IN_EDITOR_ENDPOINT)) {
          next();
          return;
        }

        const openRequest = parseOpenInEditorRequest(request.url);
        if (!openRequest) {
          next();
          return;
        }

        void launchFileInEditor(openRequest, options.editor).then((didLaunch) => {
          response.statusCode = didLaunch ? 200 : 500;
          response.end();
        });
      });
    },
  };
};

export default svelteGrab;
