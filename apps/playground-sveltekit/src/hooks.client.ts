import { dev } from "$app/environment";

// `hooks.client.ts` runs once on the client only, so the overlay (which owns
// DOM, clipboard and shadow-root access) never touches the SSR bundle. The
// `dev` guard keeps it out of production builds entirely.
if (dev) {
  await import("point-to-svelte");
}
