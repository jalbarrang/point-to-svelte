import { PluginSetupError } from "./errors.js";
import type { Plugin, SvelteGrabAPI } from "./types.js";
import { reportRecoverableError } from "./utils/report-recoverable-error.js";

let globalApi: SvelteGrabAPI | null = null;
const pendingPlugins = new Map<string, Plugin>();

export const getGlobalApi = (): SvelteGrabAPI | null => {
  if (typeof window === "undefined") return globalApi;
  return window.__POINT_TO_SVELTE__ ?? globalApi ?? null;
};

export const setGlobalApi = (api: SvelteGrabAPI | null): void => {
  globalApi = api;
  if (typeof window !== "undefined") {
    if (api) {
      window.__POINT_TO_SVELTE__ = api;
    } else {
      delete window.__POINT_TO_SVELTE__;
    }
  }

  if (!api) return;

  for (const [pluginName, plugin] of pendingPlugins) {
    pendingPlugins.delete(pluginName);
    try {
      api.registerPlugin(plugin);
    } catch (error) {
      reportRecoverableError(
        error instanceof PluginSetupError ? error : new PluginSetupError(pluginName, error),
      );
    }
  }
};

export const clearGlobalApi = (api: SvelteGrabAPI): void => {
  if (globalApi === api) globalApi = null;
  if (typeof window !== "undefined" && window.__POINT_TO_SVELTE__ === api) {
    delete window.__POINT_TO_SVELTE__;
  }
};

export const registerPlugin = (plugin: Plugin): void => {
  const api = getGlobalApi();
  if (api) {
    api.registerPlugin(plugin);
    return;
  }
  pendingPlugins.set(plugin.name, plugin);
};

export const unregisterPlugin = (name: string): void => {
  const api = getGlobalApi();
  if (api) {
    api.unregisterPlugin(name);
    return;
  }
  pendingPlugins.delete(name);
};
