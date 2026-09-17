<script lang="ts">
  import type { Snippet } from "svelte";
  import { onMount } from "svelte";
  import type { DropdownAnchor } from "../../types.js";
  import { DROPDOWN_EDGE_TRANSFORM_ORIGIN, Z_INDEX_OVERLAY } from "../../constants.js";
  import { cn } from "../../utils/cn.js";
  import { suppressMenuEvent } from "../../utils/suppress-menu-event.js";
  import { createAnchoredDropdown } from "../../utils/create-anchored-dropdown.js";
  import { registerOverlayDismiss } from "../../utils/register-overlay-dismiss.js";

  interface Props {
    position: DropdownAnchor | null;
    dataAttribute: "data-point-to-svelte-toolbar-menu" | "data-point-to-svelte-hierarchy-menu";
    onDismiss?: () => void;
    interactive?: boolean;
    children: Snippet;
  }

  let { position, dataAttribute, onDismiss, interactive = true, children }: Props = $props();

  let containerRef = $state<HTMLDivElement>();

  const dropdown = createAnchoredDropdown(
    () => containerRef,
    () => position,
  );

  onMount(() => {
    dropdown.measure();
    const unregisterOverlayDismiss = onDismiss
      ? registerOverlayDismiss({
          isOpen: () => Boolean(position),
          onDismiss,
        })
      : undefined;

    return () => {
      dropdown.clearAnimationHandles();
      unregisterOverlayDismiss?.();
    };
  });

  const surfaceStyle = $derived.by(() => {
    const displayPosition = dropdown.displayPosition();
    const isAnimatedIn = dropdown.isAnimatedIn();
    return [
      `top: ${displayPosition.top}px`,
      `left: ${displayPosition.left}px`,
      `z-index: ${Z_INDEX_OVERLAY}`,
      `pointer-events: ${interactive && isAnimatedIn ? "auto" : "none"}`,
      `transform-origin: ${DROPDOWN_EDGE_TRANSFORM_ORIGIN[dropdown.lastAnchorEdge()]}`,
      `opacity: ${isAnimatedIn ? "1" : "0"}`,
      `transform: ${isAnimatedIn ? "scale(1)" : "scale(0.92)"}`,
    ].join("; ");
  });
</script>

{#if dropdown.shouldMount()}
  <div
    bind:this={containerRef}
    data-point-to-svelte-ignore-events
    {...{ [dataAttribute]: "" }}
    class={cn(
      "fixed font-sans text-[13px] antialiased [filter:var(--sg-drop-shadow)] select-none will-change-[opacity,transform]",
      dropdown.isAnimatedIn()
        ? "transition-[opacity,transform] duration-220 ease-spring"
        : "transition-[opacity,transform] duration-120 ease-drawer",
    )}
    style={surfaceStyle}
    onpointerdown={suppressMenuEvent}
    onmousedown={suppressMenuEvent}
    onclick={suppressMenuEvent}
    oncontextmenu={suppressMenuEvent}
  >
    {@render children()}
  </div>
{/if}
