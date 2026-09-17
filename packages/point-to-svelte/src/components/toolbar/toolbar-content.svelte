<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "../../utils/cn.js";
  import { isHorizontalEdge } from "../../utils/toolbar-position.js";
  import IconChevron from "../icons/icon-chevron.svelte";

  interface Props {
    isCollapsed?: boolean;
    snapEdge?: "top" | "bottom" | "left" | "right";
    isShaking?: boolean;
    isChevronPressed?: boolean;
    onAnimationEnd?: () => void;
    onPanelClick?: (event: MouseEvent) => void;
    onCollapseClick?: (event: MouseEvent) => void;
    onCollapsePointerDown?: (event: PointerEvent) => void;
    onCollapsePointerUp?: (event: PointerEvent) => void;
    onCollapsePointerLeave?: (event: PointerEvent) => void;
    actionButtons?: Snippet;
    transformOrigin?: string;
  }

  let {
    isCollapsed = false,
    snapEdge = "bottom",
    isShaking = false,
    isChevronPressed = false,
    onAnimationEnd,
    onPanelClick,
    onCollapseClick,
    onCollapsePointerDown,
    onCollapsePointerUp,
    onCollapsePointerLeave,
    actionButtons,
    transformOrigin,
  }: Props = $props();

  const isVertical = $derived(!isHorizontalEdge(snapEdge));
  const sizeDurationClass = $derived(isCollapsed ? "duration-140" : "duration-220");
  const opacityEnterClass = "transition-opacity duration-180 ease-drawer delay-[80ms]";
  const opacityExitClass = "transition-opacity duration-100 ease-drawer";

  const gridSizeTransitionClass = $derived(
    isVertical
      ? `transition-[grid-template-rows] ${sizeDurationClass} ease-drawer`
      : `transition-[grid-template-columns] ${sizeDurationClass} ease-drawer`,
  );

  const minDimensionClass = $derived(isVertical ? "min-h-0" : "min-w-0");

  const collapsedEdgeClasses = $derived.by(() => {
    if (!isCollapsed) return "";
    const roundedClass = {
      top: "rounded-t-none rounded-b-[10px]",
      bottom: "rounded-b-none rounded-t-[10px]",
      left: "rounded-l-none rounded-r-[10px]",
      right: "rounded-r-none rounded-l-[10px]",
    }[snapEdge];
    const paddingClass = isVertical ? "px-0.25 py-2" : "px-2 py-0.25";
    return `${roundedClass} ${paddingClass}`;
  });

  const chevronRotation = $derived.by(() => {
    switch (snapEdge) {
      case "top":
        return isCollapsed ? "rotate-90" : "-rotate-90";
      case "bottom":
        return isCollapsed ? "-rotate-90" : "rotate-90";
      case "left":
        return isCollapsed ? "rotate-0" : "rotate-180";
      case "right":
        return isCollapsed ? "rotate-180" : "rotate-0";
      default:
        return "-rotate-90";
    }
  });

  const pressSquishTransform = $derived.by((): string | undefined => {
    if (!isChevronPressed) return undefined;
    return isVertical ? "scale(0.97, 1)" : "scale(1, 0.97)";
  });

  const outerTransitionClass = $derived(
    isChevronPressed
      ? `transition-[padding,border-radius,transform] duration-60 ease-[cubic-bezier(0,0,0.2,1)]`
      : `transition-[padding,border-radius,transform] ${sizeDurationClass} ease-drawer`,
  );

  const panelStyle = $derived(
    `transform-origin: ${transformOrigin ?? "center center"}; transform: ${pressSquishTransform ?? "none"}`,
  );
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions, a11y_no_noninteractive_element_interactions -->
<div
  data-point-to-svelte-toolbar-panel
  class={cn(
    "flex items-center justify-center rounded-[13px] antialiased relative overflow-visible [font-synthesis:none]",
    outerTransitionClass,
    isVertical && "flex-col",
    "bg-[var(--sg-panel-bg)] [box-shadow:var(--sg-shadow)]",
    !isCollapsed && (isVertical ? "px-1.5 gap-0 py-2" : "py-1.5 gap-0 px-2"),
    collapsedEdgeClasses,
    isShaking && (isVertical ? "animate-shake-vertical" : "animate-shake"),
  )}
  style={panelStyle}
  onanimationend={onAnimationEnd}
  onclick={onPanelClick}
>
  <div
    class={cn(
      "grid relative overflow-visible",
      gridSizeTransitionClass,
      isCollapsed
        ? isVertical
          ? "grid-rows-[0fr] pointer-events-none"
          : "grid-cols-[0fr] pointer-events-none"
        : isVertical
          ? "grid-rows-[1fr]"
          : "grid-cols-[1fr]",
    )}
  >
    <div
      class={cn(
        "flex",
        isVertical ? "flex-col items-center min-h-0" : "items-center min-w-0",
        isCollapsed ? "opacity-0" : "opacity-100",
        isCollapsed ? opacityExitClass : opacityEnterClass,
      )}
    >
      <div
        class={cn(
          "relative overflow-visible flex",
          isVertical ? "flex-col items-center" : "items-center",
          minDimensionClass,
        )}
      >
        {@render actionButtons?.()}
      </div>
    </div>
  </div>
  <button
    data-point-to-svelte-ignore-events
    data-point-to-svelte-toolbar-collapse
    aria-label={isCollapsed ? "Expand toolbar" : "Collapse toolbar"}
    aria-expanded={!isCollapsed}
    type="button"
    class="group contain-layout shrink-0 flex items-center justify-center cursor-pointer interactive-scale a11y-hitbox"
    onclick={onCollapseClick}
    onpointerdown={onCollapsePointerDown}
    onpointerup={onCollapsePointerUp}
    onpointerleave={onCollapsePointerLeave}
    onpointercancel={onCollapsePointerLeave}
  >
    <IconChevron
      size={18}
      class={cn(
        "text-[var(--sg-text-secondary)] group-hover:text-[var(--sg-text-primary)] transition-[transform,color] duration-150 ease-drawer -m-0.5",
        chevronRotation,
      )}
    />
  </button>
</div>
