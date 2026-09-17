import { OpenFileError } from "../errors.js";
import { normalizeFilePath } from "./normalize-file-path.js";

const OPEN_FILE_ENDPOINT = "/__open-in-editor";
const DEFAULT_EDITOR_SCHEME = "vscode";
const ABSOLUTE_PATH_REGEX = /^(?:[a-zA-Z]:[\\/]|\/)/;

const toAbsolutePath = (filePath: string): string =>
  ABSOLUTE_PATH_REGEX.test(filePath) ? filePath : `/${filePath}`;

// `vscode://file/<path>:<line>:<column>` is understood by VS Code, Cursor,
// VSCodium and most forks, so it is the fallback when no editor endpoint is
// available (no Vite dev server, e.g. a production build or a static preview).
const createEditorProtocolUrl = (
  filePath: string,
  lineNumber: number | undefined,
  editorScheme: string,
): string => {
  const absolutePath = toAbsolutePath(filePath);
  const lineSuffix = lineNumber ? `:${lineNumber}:1` : "";
  return `${editorScheme}://file${encodeURI(absolutePath)}${lineSuffix}`;
};

const tryDevServerOpen = async (
  filePath: string,
  lineNumber: number | undefined,
): Promise<boolean> => {
  const params = new URLSearchParams({ file: filePath });
  if (lineNumber) params.set("line", String(lineNumber));
  params.set("column", "1");

  const response = await fetch(`${OPEN_FILE_ENDPOINT}?${params}`);
  return response.ok;
};

export interface OpenFileOptions {
  editorScheme?: string;
}

export const requestOpenFile = async (
  filePath: string,
  lineNumber: number | undefined,
  transformUrl?: (url: string, filePath: string, lineNumber?: number) => string,
  options: OpenFileOptions = {},
): Promise<void> => {
  try {
    const normalizedFilePath = normalizeFilePath(filePath);

    const wasOpenedByDevServer = await tryDevServerOpen(normalizedFilePath, lineNumber).catch(
      () => false,
    );
    if (wasOpenedByDevServer) return;

    const rawUrl = createEditorProtocolUrl(
      normalizedFilePath,
      lineNumber,
      options.editorScheme ?? DEFAULT_EDITOR_SCHEME,
    );
    const url = transformUrl ? transformUrl(rawUrl, normalizedFilePath, lineNumber) : rawUrl;
    window.open(url, "_blank", "noopener,noreferrer");
  } catch (error) {
    if (error instanceof OpenFileError) throw error;
    throw new OpenFileError(filePath, lineNumber, error);
  }
};
