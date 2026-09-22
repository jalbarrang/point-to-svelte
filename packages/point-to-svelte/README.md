# point-to-svelte

Select UI elements in a running Svelte or SvelteKit dev server and copy their source context for a
coding agent.

Full documentation lives in the [repository README](../../README.md).

```bash
npm install -D point-to-svelte
```

```ts
// src/hooks.client.ts (SvelteKit)
import { dev } from "$app/environment";

if (dev) {
  await import("point-to-svelte");
}
```

Or use the Vite plugin, which injects the client into the dev HTML and serves the
`/__open-in-editor` endpoint used by the "Open" action:

```ts
import { svelteGrab } from "point-to-svelte/vite";
```

Entry points:

- `point-to-svelte` — the auto-initializing client (overlay, toolbar, clipboard payload).
- `point-to-svelte/primitives` — the selection engine without the overlay
  (`getElementContext`, `getElementAtPoint`, `freeze`, `openFile`, …).
- `point-to-svelte/core` — the core module for advanced integrations.
- `point-to-svelte/vite` — the Vite/SvelteKit plugin.
- `point-to-svelte/styles.css` — the compiled overlay stylesheet. The client already carries it
  and injects it into the overlay's shadow root, so it does not need importing; loading it into
  the host page would pull a second Tailwind preflight and theme into the app's own cascade.

Requires Svelte 5.35+ and a development build (`vite dev` sets the compiler's `dev` flag, which is
what attaches the `__svelte_meta` source locations).

MIT licensed, based on [React Grab](https://github.com/aidenybai/react-grab).
