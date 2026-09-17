import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const IGNORED_WARNING_CODES = new Set([
  "a11y_click_events_have_key_events",
  "a11y_no_noninteractive_element_interactions",
  "a11y_no_static_element_interactions",
]);

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    dev: false,
  },
  onwarn(warning, handler) {
    if (warning.code && IGNORED_WARNING_CODES.has(warning.code)) return;
    handler(warning);
  },
};
