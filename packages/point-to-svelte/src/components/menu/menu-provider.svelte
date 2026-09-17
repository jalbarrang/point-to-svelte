<script lang="ts">
  import type { Snippet } from "svelte";
  import { setMenuStore, type MenuStore } from "./menu-context.js";

  interface Props {
    store: MenuStore;
    children: Snippet;
  }

  let { store, children }: Props = $props();
  // svelte-ignore state_referenced_locally
  setMenuStore(store);
</script>

{@render children()}
