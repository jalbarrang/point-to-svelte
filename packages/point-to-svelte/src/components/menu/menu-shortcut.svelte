<script lang="ts">
  import { cn } from "../../utils/cn.js";
  import ShortcutHint from "../shortcut-hint.svelte";

  interface Props {
    shortcut: string;
    modifier?: boolean;
    class?: string;
  }

  let { shortcut, modifier, class: className }: Props = $props();
</script>

<ShortcutHint
  {shortcut}
  {modifier}
  class={cn("text-[11px] font-sans text-[var(--sg-text-secondary)] ml-4", className)}
/>
