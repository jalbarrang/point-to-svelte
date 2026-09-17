import * as babel from "@babel/core";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

export const solidWebBrowserPlugin = () => {
  const require = createRequire(import.meta.url);
  const serverPath = require.resolve("solid-js/web");
  const distDir = dirname(serverPath);
  const browserPath = resolve(distDir, "web.js");
  return {
    name: "solid-web-browser",
    enforce: "pre" as const,
    resolveId(source: string) {
      if (source === "solid-js/web") return browserPath;
    },
  };
};

export interface SolidBabelPluginOptions {
  filter?: RegExp;
  plugins?: babel.PluginItem[];
}

export const solidBabelPlugin = (options: SolidBabelPluginOptions = {}) => ({
  name: "solid-babel",
  // Compiles JSX before Vite's own JSX/TS handling so the overlay's components
  // never pass through a second transformer.
  enforce: "pre" as const,
  transform(code: string, id: string) {
    const filter = options.filter ?? /\.(tsx|jsx)$/;
    if (!filter.test(id)) return;

    const result = babel.transformSync(code, {
      presets: [
        ["@babel/preset-typescript", { onlyRemoveTypeImports: true }],
        "babel-preset-solid",
      ],
      plugins: options.plugins,
      filename: id,
      sourceMaps: true,
      caller: { name: "solid-babel", supportsStaticESM: true },
    });

    if (!result?.code) return;
    return { code: result.code, map: result.map };
  },
});
