export { init } from "./core/index.js";
export {
  getStack,
  formatElementInfo,
  isInstrumentationActive,
  DEFAULT_THEME,
} from "./core/index.js";
export { commentPlugin } from "./core/plugins/comment.js";
export { openPlugin } from "./core/plugins/open.js";
export { FreezeError } from "./errors.js";
export { OpenFileError } from "./errors.js";
export { generateSnippet } from "./utils/generate-snippet.js";
export { PluginSetupError, SvelteGrabError } from "./errors.js";
export type {
  Options,
  SvelteGrabAPI,
  SourceInfo,
  Theme,
  SvelteGrabState,
  ToolbarState,
  OverlayBounds,
  GrabbedBox,
  DragRect,
  Rect,
  Position,
  DeepPartial,
  ElementLabelVariant,
  PromptModeContext,
  ElementLabelContext,
  AgentContext,
  SettableOptions,
  ActivationMode,
  ContextMenuAction,
  ContextMenuActionContext,
  ActionContext,
  ActionContextHooks,
  OpenFileActionHooks,
  Plugin,
  PluginConfig,
  PluginHooks,
  SelectedElementPayload,
  ElementSelectedEventDetail,
} from "./types.js";

import { init } from "./core/index.js";
import { getGlobalApi, setGlobalApi } from "./global-api.js";
import type { SvelteGrabAPI } from "./types.js";
import { getParentSvelteGrabApi } from "./utils/get-parent-svelte-grab-api.js";

export { getGlobalApi, setGlobalApi, registerPlugin, unregisterPlugin } from "./global-api.js";

declare global {
  interface Window {
    __POINT_TO_SVELTE__?: SvelteGrabAPI;
    __POINT_TO_SVELTE_DISABLED__?: boolean;
  }
}

if (typeof window !== "undefined" && !window.__POINT_TO_SVELTE_DISABLED__) {
  const existingApi = window.__POINT_TO_SVELTE__ ?? getParentSvelteGrabApi();
  if (existingApi) {
    setGlobalApi(existingApi);
  } else {
    setGlobalApi(init());
  }
  window.dispatchEvent(new CustomEvent("point-to-svelte:init", { detail: getGlobalApi() }));
}
