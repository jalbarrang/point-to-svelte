import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, type Plugin, type UserConfig } from "vite";

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

// The overlay UI is compiled from .svelte components and .svelte.ts rune
// modules. In the module build the host app's own Svelte runtime is reused so a
// second copy is never evaluated inside the shadow root; the global build
// bundles the runtime because it is a standalone <script> drop-in.
const svelteExternal = ["svelte", /^svelte\//];

const packageRoot = fileURLToPath(new URL(".", import.meta.url));

// The rune module is imported without an extension so TypeScript can resolve it
// under bundler resolution. Vite's own resolver does not map `.svelte` to
// `.svelte.ts`, and the Svelte plugin claims any specifier ending in `.svelte`
// as a component, so the alias is resolved here first. Vite also only maps a
// relative `.js` specifier to its `.ts` source when the importer is itself a
// TypeScript file, which excludes compiled `.svelte` modules; the same plugin
// restores that mapping for them.
const resolveReactivityModule = (): Plugin => ({
  name: "point-to-svelte-resolve-reactivity",
  enforce: "pre",
  resolveId(source, importer) {
    if (source.endsWith("/reactivity.svelte")) {
      return path.resolve(packageRoot, "src/reactivity.svelte.ts");
    }
    const importerPath = importer?.split("?")[0];
    if (importerPath && source.startsWith(".") && source.endsWith(".js")) {
      const candidate = path.resolve(path.dirname(importerPath), source.replace(/\.js$/, ".ts"));
      if (fs.existsSync(candidate)) return candidate;
    }
    return undefined;
  },
});

const createBrowserModuleConfig = (): UserConfig => ({
  build: {
    emptyOutDir: false,
    minify: true,
    sourcemap: false,
    lib: {
      entry: {
        index: "src/index.ts",
        "core/index": "src/core/index.ts",
        primitives: "src/primitives.ts",
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: svelteExternal,
      output: { banner: licenseBanner },
    },
  },
  define,
  plugins: [resolveReactivityModule(), svelte()],
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
  plugins: [resolveReactivityModule(), svelte()],
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
