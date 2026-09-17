<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "../../utils/cn.js";
  import { createVariants } from "../../utils/create-variants.js";

  const surfaceVariants = createVariants(
    "contain-layout antialiased [font-synthesis:none] bg-[var(--sg-panel-bg)]",
    {
      variants: {
        shape: {
          panel: "rounded-[14px] [corner-shape:superellipse(1.25)]",
          pill: "rounded-full",
        },
      },
      defaultVariants: { shape: "panel" },
    },
  );

  interface Props {
    shape?: "panel" | "pill";
    class?: string;
    ref?: (element: HTMLDivElement) => void;
    children?: Snippet;
    [key: string]: unknown;
  }

  let { shape, class: className, ref: onRef, children, ...rest }: Props = $props();

  let element = $state<HTMLDivElement>();

  $effect(() => {
    if (element) onRef?.(element);
  });
</script>

<div bind:this={element} class={cn(surfaceVariants({ shape }), className)} {...rest}>
  {@render children?.()}
</div>
