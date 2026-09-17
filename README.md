# point-to-svelte

Point your coding agent at the actual source behind any Svelte component.

point-to-svelte is a fork of [React Grab](https://github.com/aidenybai/react-grab) that swaps
React's fiber walking for Svelte's dev-mode `__svelte_meta`. Hover any element in a running dev
server, grab it, and paste the result into your agent:

```txt
[<span class="todo-text">Buy oat milk</span> in TodoItem (at src/lib/components/todo-item.svelte:15:5)
 in TodoItem (at src/lib/components/todo-list.svelte:39:7)
 in TodoList (at src/routes/+page.svelte:58:3)]
```

Because Svelte records the exact position of every element it compiles, the file, line **and
column** are precise — no source maps, no bundle fetches, no network round trip.

## Why the fork exists

React Grab's selection engine, overlay, toolbar, menus, hit testing, drag selection and clipboard
payload are framework-agnostic, so they are reused almost verbatim (the overlay UI is SolidJS and is
bundled). Only the "which component owns this element" layer differs:

| React Grab | point-to-svelte |
| --- | --- |
| `bippy` fiber walk (`getFiberFromHostInstance`, `getOwnerStack`) | `__svelte_meta.loc` + the `parent` dev-stack chain |
| `_debugSource` (dev only, Vite line numbers unreliable) | `loc.file` / `loc.line` / `loc.column`, exact |
| Patches React's dispatcher to pause re-renders | No-op: Svelte 5 has no public render pause |
| Next.js server frame symbolication | Not needed — locations are already source locations |
| react-three-fiber selection | Detached; the element-adapter seam is kept for WebGL renderers |

## Install

```bash
pnpm add -D point-to-svelte
```

Then load the client in development. The recommended place in SvelteKit is `src/hooks.client.ts`,
which is client-only and therefore never touches the SSR bundle:

```ts
// src/hooks.client.ts
import { dev } from "$app/environment";

if (dev) {
  await import("point-to-svelte");
}
```

For plain Vite + Svelte, either import it at the top of `src/main.ts` behind `import.meta.env.DEV`,
or add the Vite plugin and let it inject the client:

```ts
// vite.config.ts
import { svelteGrab } from "point-to-svelte/vite";

export default defineConfig({
  plugins: [svelte(), svelteGrab()],
});
```

You can also drop in the prebuilt global bundle without a bundler:

```html
<script src="//unpkg.com/point-to-svelte/dist/index.global.js"></script>
```

## Use it

- Hover any element and press **⌘C** / **Ctrl+C**, or
- click the toolbar toggle, hover, and click the element.
- Grabbed boxes flash on every element you copy; **Escape** deactivates.

The copied context contains the element's HTML preview, its own `.svelte` file with `:line:column`,
and the component stack that renders it.

Add `data-point-to-svelte-ignore` to any subtree that should never be grabbable (map canvases,
third-party widgets, your own dev chrome).

## Requirements

- Svelte **5.35+** for the `parent` chain inside `__svelte_meta` (earlier 5.x gives you the element's
  own location and a name from the file, but not the ancestor stack).
- Development mode (`dev: true`, which `vite dev` enables for you). In production builds Svelte
  strips the metadata, so grabbing falls back to the selector and HTML preview.
- TypeScript/`vitePreprocess` is fine; line numbers come from the preprocessed source.

## Caveats

- **App state is not frozen.** React Grab pauses React's renderer while picking; Svelte 5 exposes no
  equivalent, so timers, sockets and animations that change state keep running. Pointer events,
  CSS/JS animations, animation-frame loops and pseudo-states *are* still frozen. Apps that need more
  can pause their own stores in the `onActivate` plugin hook.
- **Don't statically import it from a component.** The client mounts an overlay into `<body>` and
  reads the DOM; importing it from `hooks.client.ts` (or another client-only module) keeps it out of
  SSR, where only the guarded no-op entry should run.
- **Early DOM work in a SvelteKit component can trip hydration.** Writing to the app's DOM (or
  updating state) while SvelteKit is still hydrating nested route nodes is reported as
  `hydration_mismatch`. That is a SvelteKit behaviour, not a point-to-svelte one, but it is worth
  knowing while building dev tooling.

## Build your own

The selection engine is available without the overlay:

```ts
import { getElementContext, getElementAtPoint, freeze, openFile } from "point-to-svelte/primitives";

const context = await getElementContext(document.querySelector(".card")!);
context.snippet;       // text identical to what a grab copies
context.componentName; // "TodoItem"
context.filePath;      // "/abs/src/lib/components/todo-item.svelte"
context.lineNumber;    // 15
```

## Repository layout

```
packages/point-to-svelte/        the library (source, build, Vite plugin)
apps/playground-sveltekit/       SvelteKit playground with a live diagnostics panel
```

## Development

```bash
pnpm install
pnpm build          # builds packages/point-to-svelte (esm + iife + types + css)
pnpm playground     # builds the library, then runs the playground on :5199
```

The playground's diagnostics panel at the bottom of the page resolves live DOM nodes with
`getElementContext()`, drives an activation + copy through synthetic pointer events, and shows the
payload captured by the `onCopySuccess` plugin hook.

## License

MIT. Based on [React Grab](https://github.com/aidenybai/react-grab), copyright Aiden Bai. See
`LICENSE`.
