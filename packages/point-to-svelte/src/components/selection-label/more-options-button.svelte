<script lang="ts">
  import { cn } from "../../utils/cn.js";
  import { buttonVariants } from "../ui/button-variants.js";
  import IconEllipsis from "../icons/icon-ellipsis.svelte";

  interface Props {
    onClick: () => void;
  }

  let { onClick }: Props = $props();
</script>

<button
  type="button"
  data-point-to-svelte-ignore-events
  data-point-to-svelte-more-options
  aria-label="More options"
  class={cn(
    buttonVariants({ variant: "ghost" }),
    "group size-4 text-[var(--sg-text-secondary)] hover:text-[var(--sg-text-primary)]",
  )}
  onpointerdown={(event) => {
    event.stopImmediatePropagation();
  }}
  onclick={(event) => {
    event.stopImmediatePropagation();
    onClick();
  }}
>
  <IconEllipsis
    size={14}
    aria-hidden="true"
    class="opacity-50 group-hover:opacity-100 transition-opacity"
  />
</button>
