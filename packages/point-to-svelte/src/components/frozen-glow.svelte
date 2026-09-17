<script lang="ts">
  import { onMount } from "svelte";
  import {
    FADE_DURATION_MS,
    FROZEN_GLOW_COLOR,
    FROZEN_GLOW_EDGE_PX,
    Z_INDEX_OVERLAY_CANVAS,
  } from "../constants.js";
  import { getScopeContainer } from "../utils/runtime-mode.js";

  interface Props {
    visible: boolean;
  }

  let { visible }: Props = $props();

  const scopeContainer = getScopeContainer();
  const scopeBorderRadius = scopeContainer ? getComputedStyle(scopeContainer).borderRadius : "0px";

  const measureRect = (): DOMRect | null => scopeContainer?.getBoundingClientRect() ?? null;
  let scopeRect = $state<DOMRect | null>(measureRect());

  const handleViewportChange = () => {
    scopeRect = measureRect();
  };

  if (scopeContainer) {
    const observedContainer = scopeContainer;
    onMount(() => {
      const resizeObserver = new ResizeObserver(handleViewportChange);
      resizeObserver.observe(observedContainer);
      window.addEventListener("scroll", handleViewportChange, { capture: true, passive: true });
      window.addEventListener("resize", handleViewportChange);
      return () => {
        resizeObserver.disconnect();
        window.removeEventListener("scroll", handleViewportChange, { capture: true });
        window.removeEventListener("resize", handleViewportChange);
      };
    });

    $effect(() => {
      if (visible) handleViewportChange();
    });
  }

  const glowStyle = $derived.by(() => {
    const rect = scopeRect;
    return [
      "position: fixed",
      `top: ${rect ? `${rect.top}px` : "0"}`,
      `left: ${rect ? `${rect.left}px` : "0"}`,
      `width: ${rect ? `${rect.width}px` : "100%"}`,
      `height: ${rect ? `${rect.height}px` : "100%"}`,
      `border-radius: ${scopeBorderRadius}`,
      "pointer-events: none",
      `z-index: ${Z_INDEX_OVERLAY_CANVAS}`,
      `opacity: ${visible ? 1 : 0}`,
      `transition: opacity ${FADE_DURATION_MS}ms ease-out`,
      "will-change: opacity",
      "contain: strict",
      "transform: translateZ(0)",
      `box-shadow: inset 0 0 ${FROZEN_GLOW_EDGE_PX}px ${FROZEN_GLOW_COLOR}`,
    ].join("; ");
  });
</script>

<div style={glowStyle}></div>
