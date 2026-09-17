<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "../../utils/cn.js";
  import { useMenuStore } from "./menu-context.js";

  interface Props {
    ref?: (element: HTMLDivElement) => void;
    class?: string;
    label?: string;
    children: Snippet;
  }

  let { ref: onRef, class: className, label, children }: Props = $props();
  const store = useMenuStore();

  let containerElement = $state<HTMLDivElement>();
  let railElement = $state<HTMLDivElement>();

  $effect(() => {
    if (!containerElement) return;
    store.setHighlightContainer(containerElement);
    onRef?.(containerElement);
  });

  $effect(() => {
    if (railElement) store.setHighlightRail(railElement);
  });
</script>

<div
  bind:this={containerElement}
  role="menu"
  aria-orientation="vertical"
  aria-label={label}
  aria-activedescendant={store.keyboardNavigation ? store.activeDescendantId() : undefined}
  tabindex={store.keyboardNavigation ? -1 : undefined}
  class={cn("relative flex flex-col", className)}
  onpointermove={() => store.notePointerMove()}
>
  <div
    bind:this={railElement}
    aria-hidden="true"
    class="pointer-events-none absolute opacity-0 transition-[top,left,width,height,opacity,border-radius] duration-75 ease-out bg-[var(--sg-surface-hover)]"
  ></div>
  {@render children()}
</div>
