import fs from "node:fs";
import { defineConfig, type UserConfig } from "vite";
import { solidBabelPlugin, solidWebBrowserPlugin } from "./solid-babel-plugin.js";

const packageJson = JSON.parse(fs.readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  version: string;
};

const licenseBanner = `/**
 * @license MIT
 *
 * Based on React Grab, Copyright (c) 2025 Aiden Bai
 * Modified for point-to-svelte, Copyright (c) 2026 point-to-svelte contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */`;

const define = {
  "process.env.VERSION": JSON.stringify(packageJson.version),
};

// Solid is an implementation detail of the overlay: it is always bundled so
// consumers never need it installed, and so only one copy of the runtime is
// ever evaluated inside the overlay's shadow root.
const browserPlugins = () => [solidWebBrowserPlugin(), solidBabelPlugin()];

// Module build: the importable library (index, core, primitives).
const createBrowserModuleConfig = (): UserConfig => ({
  build: {
    emptyOutDir: false,
    minify: true,
    sourcemap: false,
    lib: {
      entry: {
        index: "src/index.ts",
        "core/index": "src/core/index.tsx",
        primitives: "src/primitives.ts",
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      output: { banner: licenseBanner },
    },
  },
  define,
  plugins: browserPlugins(),
});

// Global build: the <script src=".../index.global.js"> drop-in for apps that
// cannot import a module (plain HTML, server-rendered shells, CDNs).
const createBrowserGlobalConfig = (): UserConfig => ({
  build: {
    emptyOutDir: false,
    minify: true,
    sourcemap: false,
    lib: {
      entry: "src/index.ts",
      formats: ["iife"],
      name: "SvelteGrab",
      fileName: () => "index.global.js",
    },
    rollupOptions: {
      output: { banner: licenseBanner },
    },
  },
  define,
  plugins: browserPlugins(),
});

// Node build: the Vite plugin. Node dependencies stay external so the plugin
// uses the host's own Vite instance and the host's launch-editor.
const createNodeConfig = (): UserConfig => ({
  build: {
    emptyOutDir: false,
    minify: false,
    target: "node20",
    lib: {
      entry: "src/vite.ts",
      formats: ["es"],
      fileName: () => "vite.js",
    },
    rollupOptions: {
      external: ["vite", "launch-editor"],
      output: { banner: licenseBanner },
    },
  },
  plugins: [],
});

export default defineConfig(({ mode }) => {
  if (mode === "global") return createBrowserGlobalConfig();
  if (mode === "node") return createNodeConfig();
  return createBrowserModuleConfig();
});
