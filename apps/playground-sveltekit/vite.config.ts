import { sveltekit } from "@sveltejs/kit/vite";
import { svelteGrab } from "point-to-svelte/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    sveltekit(),
    // SvelteKit renders its own HTML shell, so the client is loaded from
    // `src/hooks.client.ts` instead of being injected into an index.html. The
    // plugin still provides the `/__open-in-editor` endpoint used by the
    // "Open" action.
    svelteGrab({ inject: false }),
  ],
  server: {
    port: 5199,
    strictPort: true,
  },
  preview: {
    port: 4199,
    strictPort: true,
  },
});
