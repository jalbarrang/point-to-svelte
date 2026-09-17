export class SvelteGrabError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SvelteGrabError";
  }
}

export class RecoverableError extends SvelteGrabError {
  constructor(message: string, cause: unknown) {
    super(message, { cause });
    this.name = "RecoverableError";
  }
}

export class FreezeError extends SvelteGrabError {
  constructor(cause: unknown) {
    super("Failed to freeze page", { cause });
    this.name = "FreezeError";
  }
}

export class OpenFileError extends RecoverableError {
  readonly filePath: string;
  readonly lineNumber: number | undefined;

  constructor(filePath: string, lineNumber: number | undefined, cause: unknown) {
    super(`Failed to open source file "${filePath}"`, cause);
    this.name = "OpenFileError";
    this.filePath = filePath;
    this.lineNumber = lineNumber;
  }
}

export class PluginHookError extends RecoverableError {
  readonly pluginName: string;
  readonly hookName: string;

  constructor(pluginName: string, hookName: string, cause: unknown) {
    super(`Plugin hook "${hookName}" failed for "${pluginName}"`, cause);
    this.name = "PluginHookError";
    this.pluginName = pluginName;
    this.hookName = hookName;
  }
}

export class PluginCleanupError extends RecoverableError {
  readonly pluginName: string;

  constructor(pluginName: string, cause: unknown) {
    super(`Plugin cleanup failed for "${pluginName}"`, cause);
    this.name = "PluginCleanupError";
    this.pluginName = pluginName;
  }
}

export class PluginSetupError extends RecoverableError {
  readonly pluginName: string;

  constructor(pluginName: string, cause: unknown) {
    super(`Plugin setup failed for "${pluginName}"`, cause);
    this.name = "PluginSetupError";
    this.pluginName = pluginName;
  }
}

export class ContextMenuActionError extends RecoverableError {
  readonly actionId: string;

  constructor(actionId: string, cause: unknown) {
    super(`Action "${actionId}" failed`, cause);
    this.name = "ContextMenuActionError";
    this.actionId = actionId;
  }
}

export class ContextMenuActionEnabledError extends RecoverableError {
  readonly actionId: string;

  constructor(actionId: string, cause: unknown) {
    super(`Action "${actionId}" enabled check failed`, cause);
    this.name = "ContextMenuActionEnabledError";
    this.actionId = actionId;
  }
}

export class NonElementNodeError extends SvelteGrabError {
  constructor() {
    super("Can't generate CSS selector for non-element node type.");
    this.name = "NonElementNodeError";
  }
}

export class SelectorTimeoutError extends SvelteGrabError {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Timeout: Can't find a unique selector after ${timeoutMs}ms`);
    this.name = "SelectorTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export class SelectorNotFoundError extends SvelteGrabError {
  constructor() {
    super("Selector was not found.");
    this.name = "SelectorNotFoundError";
  }
}

export class CopyFailedError extends SvelteGrabError {
  constructor() {
    super("Failed to copy");
    this.name = "CopyFailedError";
  }
}
