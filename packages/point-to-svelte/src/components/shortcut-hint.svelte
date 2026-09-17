<script lang="ts">
  import { isMac } from "../utils/is-mac.js";
  import IconCommand from "./icons/icon-command.svelte";
  import IconReturn from "./icons/icon-return.svelte";

  interface Props {
    shortcut: string;
    modifier?: boolean;
    class?: string;
  }

  let { shortcut, modifier, class: className }: Props = $props();

  const isEnter = $derived(shortcut === "Enter");
  const requiresModifier = $derived(modifier !== false);
  const isMacPlatform = isMac();
</script>

<span class={className} style="display: inline-flex; align-items: center; gap: 2px">
  {#if isEnter}
    <IconReturn size={8} />
  {:else if requiresModifier}
    {#if isMacPlatform}
      <IconCommand size={9} />
      <span>{shortcut}</span>
    {:else}
      <span>Ctrl+{shortcut}</span>
    {/if}
  {:else}
    <span>{shortcut}</span>
  {/if}
</span>
