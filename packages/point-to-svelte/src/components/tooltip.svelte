<script lang="ts">
  import { untrack } from "svelte";
  import { cn } from "../utils/cn.js";
  import { TOOLTIP_DELAY_MS, TOOLTIP_GRACE_PERIOD_MS, Z_INDEX_OVERLAY } from "../constants.js";

  interface Props {
    visible: boolean;
    position: "top" | "bottom" | "left" | "right";
    textContent: string;
  }

  let { visible, position, textContent }: Props = $props();

  let lastCloseTimestamp = 0;

  let delayedVisible = $state(false);
  let shouldAnimate = $state(true);
  let delayTimeoutId: ReturnType<typeof setTimeout> | undefined;

  const wasTooltipRecentlyVisible = (): boolean =>
    Date.now() - lastCloseTimestamp < TOOLTIP_GRACE_PERIOD_MS;

  $effect(() => {
    const isVisible = visible;
    untrack(() => {
      if (delayTimeoutId !== undefined) {
        clearTimeout(delayTimeoutId);
        delayTimeoutId = undefined;
      }

      if (isVisible) {
        if (wasTooltipRecentlyVisible()) {
          shouldAnimate = false;
          delayedVisible = true;
        } else {
          shouldAnimate = true;
          delayTimeoutId = setTimeout(() => {
            delayedVisible = true;
          }, TOOLTIP_DELAY_MS);
        }
      } else {
        if (delayedVisible) {
          lastCloseTimestamp = Date.now();
        }
        delayedVisible = false;
      }
    });
  });

  $effect(() => {
    return () => {
      if (delayTimeoutId !== undefined) {
        clearTimeout(delayTimeoutId);
      }
      if (delayedVisible) {
        lastCloseTimestamp = Date.now();
      }
    };
  });

  const positionStyle = $derived.by((): string => {
    const isHorizontal = position === "top" || position === "bottom";
    if (isHorizontal) {
      return `left: 50%; translate: -50%; z-index: ${Z_INDEX_OVERLAY}`;
    }
    return `top: 50%; translate: 0 -50%; z-index: ${Z_INDEX_OVERLAY}`;
  });
</script>

{#if delayedVisible}
  <div
    class={cn(
      "absolute whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-sans font-medium leading-4 pointer-events-none",
      "bg-[var(--sg-panel-bg)] text-[var(--sg-text-primary)] [box-shadow:var(--sg-shadow)]",
      position === "top" && "bottom-full mb-2.5",
      position === "bottom" && "top-full mt-2.5",
      position === "left" && "right-full mr-2.5",
      position === "right" && "left-full ml-2.5",
      shouldAnimate && "animate-tooltip-fade-in",
    )}
    style={positionStyle}
  >
    {textContent}
  </div>
{/if}
