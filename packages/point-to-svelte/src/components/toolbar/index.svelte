<script lang="ts">
  import {
    createEffect,
    createSignal,
    on,
    onCleanup,
    onMount,
  } from "../../reactivity.svelte";
  import type { Position } from "../../types.js";
  import { cn } from "../../utils/cn.js";
  import {
    loadToolbarState,
    saveToolbarState,
    type SnapEdge,
    type ToolbarState,
  } from "./state.js";
  import IconSelect from "../icons/icon-select.svelte";
  import ToolbarActionButton from "./toolbar-action-button.svelte";
  import {
    TOOLBAR_SNAP_MARGIN_PX,
    TOOLBAR_FADE_IN_DELAY_MS,
    TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS,
    TOOLBAR_DEFAULT_WIDTH_PX,
    TOOLBAR_DEFAULT_HEIGHT_PX,
    TOOLBAR_DEFAULT_POSITION_RATIO,
    Z_INDEX_OVERLAY,
    SELECT_ICON_NATURAL_POINT_ANGLE_DEG,
    SELECT_ICON_POINT_MIN_DISTANCE_PX,
    DEFAULT_ACTION_ID,
  } from "../../constants.js";
  import { freezeUpdates } from "../../utils/freeze-updates.js";
  import {
    freezeGlobalInteractions,
    unfreezeGlobalInteractions,
  } from "../../utils/freeze-global-interactions.js";
  import ToolbarContent from "./toolbar-content.svelte";
  import { getVisualViewport } from "../../utils/get-visual-viewport.js";
  import { getScopeContainer, ignoreRealInput } from "../../utils/runtime-mode.js";
  import {
    nativeCancelAnimationFrame,
    nativeRequestAnimationFrame,
  } from "../../utils/native-raf.js";
  import {
    calculateExpandedPositionFromCollapsed,
    getCollapsedDimsForEdge,
    getCollapsedPosition,
    getPositionFromEdgeAndRatio,
    getRatioFromPosition,
    isHorizontalEdge,
  } from "../../utils/toolbar-position.js";
  import { createToolbarDrag } from "../../utils/create-toolbar-drag.js";
  import { accumulateRotationDeg } from "../../utils/accumulate-rotation.js";

  interface ToolbarProps {
    isActive?: boolean;
    isContextMenuOpen?: boolean;
    onToggle?: () => void;
    activeActionId?: string | null;
    defaultActionId?: string;
    defaultActionLabel?: string;
    enabled?: boolean;
    shakeCount?: number;
    onStateChange?: (state: ToolbarState) => void;
    onSubscribeToStateChanges?: (callback: (state: ToolbarState) => void) => () => void;
    onSelectHoverChange?: (isHovered: boolean) => void;
    onContainerRef?: (element: HTMLDivElement) => void;
    onToggleToolbarMenu?: () => void;
  }

  let props: ToolbarProps = $props();

  let containerRef = $state<HTMLDivElement>();
  let selectButtonRef: HTMLButtonElement | undefined;
  let unfreezeUpdatesCallback: (() => void) | null = null;

  const savedState = loadToolbarState();

  const [isVisible, setIsVisible] = createSignal(false);
  const [isCollapsed, setIsCollapsed] = createSignal(false);
  const [isResizing, setIsResizing] = createSignal(false);
  const [snapEdge, setSnapEdge] = createSignal<SnapEdge>(savedState?.edge ?? "bottom");
  const [positionRatio, setPositionRatio] = createSignal(
    savedState?.ratio ?? TOOLBAR_DEFAULT_POSITION_RATIO,
  );
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  const [isShaking, setIsShaking] = createSignal(false);
  const [isCollapseAnimating, setIsCollapseAnimating] = createSignal(false);
  const [isChevronPressed, setIsChevronPressed] = createSignal(false);
  const [isToolbarHovered, setIsToolbarHovered] = createSignal(false);
  const [selectIconRotationDeg, setSelectIconRotationDeg] = createSignal(0);
  const [hoveredActionId, setHoveredActionId] = createSignal<string | null>(null);

  const releaseInteractionFreeze = () => {
    unfreezeUpdatesCallback?.();
    unfreezeUpdatesCallback = null;
    if (!props.isActive) unfreezeGlobalInteractions();
  };

  const drag = createToolbarDrag({
    getContainerRef: () => containerRef,
    isCollapsed,
    getExpandedDimensions: () => expandedDimensions,
    onDragStart: () => {
      setHoveredActionId(null);
      if (unfreezeUpdatesCallback) releaseInteractionFreeze();
    },
    onPositionUpdate: (newPosition) => setPosition(newPosition),
    onSnapEdgeChange: (edge, ratio) => {
      syncCollapsedDimensionsToEdge(snapEdge(), edge);
      setSnapEdge(edge);
      setPositionRatio(ratio);
    },
    onSnapComplete: (result) => {
      expandedDimensions = result.expandedDimensions;
      setPosition(result.position);
      saveAndNotify({
        edge: result.edge,
        ratio: result.ratio,
        collapsed: isCollapsed(),
        enabled: !isCollapsed(),
      });
    },
  });

  const isVertical = () => !isHorizontalEdge(snapEdge());

  const buttonSpacingClass = () => (isVertical() ? "mb-1.5" : "mr-1.5");

  const currentActionId = () => props.defaultActionId ?? DEFAULT_ACTION_ID;
  const currentActionLabel = () => props.defaultActionLabel ?? "Copy";
  const isCurrentActionActive = () =>
    Boolean(props.isActive) && (props.activeActionId ?? DEFAULT_ACTION_ID) === currentActionId();

  const isTooltipVisible = (actionId: string) =>
    hoveredActionId() === actionId &&
    !props.isActive &&
    !isCollapsed() &&
    !drag.isDragging() &&
    !drag.isSnapping() &&
    !props.isContextMenuOpen;
  const tooltipPosition = (): "top" | "bottom" | "left" | "right" => {
    switch (snapEdge()) {
      case "top":
        return "bottom";
      case "bottom":
        return "top";
      case "left":
        return "right";
      case "right":
        return "left";
      default:
        return "top";
    }
  };

  const stopEventPropagation = (event: Event) => {
    event.stopImmediatePropagation();
  };

  const createFreezeHandlers = (getActionId: () => string) => ({
    onMouseEnter: (event: MouseEvent) => {
      if (drag.isDragging()) return;
      setHoveredActionId(getActionId());
      if (!unfreezeUpdatesCallback) {
        unfreezeUpdatesCallback = freezeUpdates();
        freezeGlobalInteractions(event.clientX, event.clientY);
      }
    },
    onMouseLeave: () => {
      const actionId = getActionId();
      setHoveredActionId((current) => (current === actionId ? null : current));
      if (!props.isActive && !props.isContextMenuOpen) {
        releaseInteractionFreeze();
      }
    },
  });

  createEffect(
    on(
      () => props.shakeCount,
      (count) => {
        if (count && !props.enabled) {
          setIsShaking(true);
        }
      },
    ),
  );

  createEffect(
    on(
      () => [props.isActive, props.isContextMenuOpen] as const,
      ([isActive, isContextMenuOpen]) => {
        if (!isActive && !isContextMenuOpen && unfreezeUpdatesCallback) {
          releaseInteractionFreeze();
        }
      },
    ),
  );

  createEffect(
    on(
      () => isCurrentActionActive(),
      (didCurrentActionBecomeActive) => {
        if (!didCurrentActionBecomeActive) {
          setSelectIconRotationDeg((previousRotationDeg) =>
            accumulateRotationDeg(previousRotationDeg, 0),
          );
          return;
        }

        let pointerFrameId: number | null = null;
        let latestPointerX = 0;
        let latestPointerY = 0;
        const updateSelectIconRotation = () => {
          pointerFrameId = null;
          if (!selectButtonRef) return;
          const rect = selectButtonRef.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const deltaX = latestPointerX - centerX;
          const deltaY = latestPointerY - centerY;
          if (Math.hypot(deltaX, deltaY) < SELECT_ICON_POINT_MIN_DISTANCE_PX) return;
          const targetAngleDeg = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
          const desiredRotationDeg = targetAngleDeg - SELECT_ICON_NATURAL_POINT_ANGLE_DEG;
          setSelectIconRotationDeg((previousRotationDeg) =>
            accumulateRotationDeg(previousRotationDeg, desiredRotationDeg),
          );
        };

        const handlePointerMove = ignoreRealInput((event: PointerEvent | MouseEvent) => {
          latestPointerX = event.clientX;
          latestPointerY = event.clientY;
          if (pointerFrameId !== null) return;
          pointerFrameId = nativeRequestAnimationFrame(updateSelectIconRotation);
        });

        window.addEventListener("pointermove", handlePointerMove, { passive: true });
        onCleanup(() => {
          window.removeEventListener("pointermove", handlePointerMove);
          if (pointerFrameId !== null) nativeCancelAnimationFrame(pointerFrameId);
        });
      },
    ),
  );

  let expandedDimensions = {
    width: TOOLBAR_DEFAULT_WIDTH_PX,
    height: TOOLBAR_DEFAULT_HEIGHT_PX,
  };
  const [collapsedDimensions, setCollapsedDimensions] = createSignal(
    getCollapsedDimsForEdge(snapEdge()),
  );

  const syncCollapsedDimensionsToEdge = (oldEdge: SnapEdge, newEdge: SnapEdge): void => {
    if (isHorizontalEdge(oldEdge) === isHorizontalEdge(newEdge)) return;
    setCollapsedDimensions(getCollapsedDimsForEdge(newEdge));
  };

  const getExpandedFromCollapsed = (
    collapsedPosition: Position,
    edge: SnapEdge,
  ): { position: Position; ratio: number } => {
    const actualRect = containerRef?.getBoundingClientRect();
    const fallback = getCollapsedDimsForEdge(edge);
    return calculateExpandedPositionFromCollapsed(
      collapsedPosition,
      edge,
      expandedDimensions,
      actualRect?.width ?? fallback.width,
      actualRect?.height ?? fallback.height,
    );
  };

  const recalculatePosition = () => {
    const newPosition = getPositionFromEdgeAndRatio(
      snapEdge(),
      positionRatio(),
      expandedDimensions.width,
      expandedDimensions.height,
    );
    setPosition(newPosition);
  };

  const handleToggle = drag.createDragAwareHandler(() => props.onToggle?.());
  const actionButtonClass =
    "group contain-layout flex items-center justify-center cursor-pointer interactive-scale a11y-hitbox";
  const actionButtonWrapperClass = () =>
    cn("relative contain-layout flex items-center justify-center", buttonSpacingClass());
  const actionIconClass = (isActive: boolean) =>
    isActive
      ? "text-[var(--sg-text-primary)]"
      : "text-[var(--sg-text-secondary)] group-hover:text-[var(--sg-text-primary)]";

  const handleToggleCollapse = drag.createDragAwareHandler(() => {
    if (isCollapsed()) {
      expandToolbarFromCollapsed();
      return;
    }

    const rect = containerRef?.getBoundingClientRect();
    const currentRatio = positionRatio();
    if (rect) {
      expandedDimensions = { width: rect.width, height: rect.height };
    }

    setIsCollapseAnimating(true);
    setIsCollapsed(true);

    saveAndNotify({
      edge: snapEdge(),
      ratio: currentRatio,
      collapsed: true,
      enabled: false,
    });

    scheduleCollapseAnimationEnd();
  });

  const computeCollapsedPosition = (): Position =>
    getCollapsedPosition(snapEdge(), position(), expandedDimensions, collapsedDimensions());

  let resizeTimeout: ReturnType<typeof setTimeout> | undefined;
  let collapseAnimationTimeout: ReturnType<typeof setTimeout> | undefined;

  let lastObservedExpandedSize: { width: number; height: number } | null = null;

  const captureDimensionsAfterAnimation = () => {
    const finalRect = containerRef?.getBoundingClientRect();
    if (!finalRect || finalRect.width === 0 || finalRect.height === 0) return;
    if (isCollapsed()) {
      setCollapsedDimensions({ width: finalRect.width, height: finalRect.height });
    } else {
      expandedDimensions = { width: finalRect.width, height: finalRect.height };
      lastObservedExpandedSize = { width: finalRect.width, height: finalRect.height };
    }
  };

  const scheduleCollapseAnimationEnd = (): void => {
    if (collapseAnimationTimeout) {
      clearTimeout(collapseAnimationTimeout);
    }
    collapseAnimationTimeout = setTimeout(() => {
      setIsCollapseAnimating(false);
      captureDimensionsAfterAnimation();
    }, TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS);
  };

  const expandToolbarFromCollapsed = (): void => {
    const { position: expandedPosition, ratio: newRatio } = getExpandedFromCollapsed(
      currentPosition(),
      snapEdge(),
    );
    setPosition(expandedPosition);
    setPositionRatio(newRatio);
    setIsCollapseAnimating(true);
    setIsCollapsed(false);
    saveAndNotify({
      edge: snapEdge(),
      ratio: newRatio,
      collapsed: false,
      enabled: true,
    });
    scheduleCollapseAnimationEnd();
  };

  const handleObservedSizeChange = (newWidth: number, newHeight: number) => {
    if (newWidth === 0 || newHeight === 0) return;
    if (drag.isDragging() || drag.isSnapping()) return;
    if (isCollapseAnimating()) return;

    if (isCollapsed()) {
      const currentCollapsed = collapsedDimensions();
      if (currentCollapsed.width === newWidth && currentCollapsed.height === newHeight) return;
      setCollapsedDimensions({ width: newWidth, height: newHeight });
      return;
    }

    if (
      lastObservedExpandedSize &&
      lastObservedExpandedSize.width === newWidth &&
      lastObservedExpandedSize.height === newHeight
    ) {
      return;
    }
    lastObservedExpandedSize = { width: newWidth, height: newHeight };
    expandedDimensions = { width: newWidth, height: newHeight };
    setPosition(getPositionFromEdgeAndRatio(snapEdge(), positionRatio(), newWidth, newHeight));
  };

  let scopedScrollFrameId: number | null = null;
  const handleScopedScroll = () => {
    if (drag.isDragging() || drag.isSnapping()) return;
    if (scopedScrollFrameId !== null) return;
    scopedScrollFrameId = nativeRequestAnimationFrame(() => {
      scopedScrollFrameId = null;
      recalculatePosition();
    });
  };

  const handleResize = () => {
    if (drag.isDragging()) return;

    setIsResizing(true);
    recalculatePosition();

    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }

    resizeTimeout = setTimeout(() => {
      setIsResizing(false);

      const newRatio = getRatioFromPosition(
        snapEdge(),
        position().x,
        position().y,
        expandedDimensions.width,
        expandedDimensions.height,
      );
      setPositionRatio(newRatio);
      saveAndNotify({
        edge: snapEdge(),
        ratio: newRatio,
        collapsed: isCollapsed(),
        enabled: !isCollapsed(),
      });
    }, TOOLBAR_FADE_IN_DELAY_MS);
  };

  const saveAndNotify = (state: ToolbarState) => {
    const stateWithDefaultAction: ToolbarState = {
      ...state,
      defaultAction: currentActionId(),
    };
    saveToolbarState(stateWithDefaultAction);
    props.onStateChange?.(stateWithDefaultAction);
  };

  onMount(() => {
    if (containerRef) {
      props.onContainerRef?.(containerRef);
    }

    const rect = containerRef?.getBoundingClientRect();
    const viewport = getVisualViewport();
    const hasMeasurableRect = Boolean(rect && rect.width > 0 && rect.height > 0);

    if (savedState) {
      if (hasMeasurableRect && rect) {
        expandedDimensions = { width: rect.width, height: rect.height };
      }
      setIsCollapsed(savedState.collapsed);
      const newPosition = getPositionFromEdgeAndRatio(
        savedState.edge,
        savedState.ratio,
        expandedDimensions.width,
        expandedDimensions.height,
      );
      setPosition(newPosition);
    } else if (hasMeasurableRect && rect) {
      expandedDimensions = { width: rect.width, height: rect.height };
      setPosition({
        x: viewport.offsetLeft + (viewport.width - rect.width) / 2,
        y: viewport.offsetTop + viewport.height - rect.height - TOOLBAR_SNAP_MARGIN_PX,
      });
      setPositionRatio(TOOLBAR_DEFAULT_POSITION_RATIO);
    } else {
      const defaultPosition = getPositionFromEdgeAndRatio(
        "bottom",
        TOOLBAR_DEFAULT_POSITION_RATIO,
        expandedDimensions.width,
        expandedDimensions.height,
      );
      setPosition(defaultPosition);
      setPositionRatio(TOOLBAR_DEFAULT_POSITION_RATIO);
    }

    if (props.onSubscribeToStateChanges) {
      const unsubscribe = props.onSubscribeToStateChanges((state: ToolbarState) => {
        if (isCollapseAnimating()) return;

        const rect = containerRef?.getBoundingClientRect();
        if (!rect) return;

        const didCollapsedChange = isCollapsed() !== state.collapsed;

        syncCollapsedDimensionsToEdge(snapEdge(), state.edge);
        setSnapEdge(state.edge);

        if (didCollapsedChange && !state.collapsed) {
          const collapsedPos = currentPosition();
          setIsCollapseAnimating(true);
          setIsCollapsed(state.collapsed);
          const { position: expandedPosition, ratio: newRatio } = getExpandedFromCollapsed(
            collapsedPos,
            state.edge,
          );
          setPosition(expandedPosition);
          setPositionRatio(newRatio);
          scheduleCollapseAnimationEnd();
        } else {
          if (didCollapsedChange) {
            setIsCollapseAnimating(true);
            scheduleCollapseAnimationEnd();
          }
          setIsCollapsed(state.collapsed);
          const newPosition = getPositionFromEdgeAndRatio(
            state.edge,
            state.ratio,
            expandedDimensions.width,
            expandedDimensions.height,
          );
          setPosition(newPosition);
          setPositionRatio(state.ratio);
        }
      });

      onCleanup(unsubscribe);
    }

    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("scroll", handleResize);
    const scopeContainer = getScopeContainer();
    if (scopeContainer) {
      window.addEventListener("scroll", handleScopedScroll, { passive: true, capture: true });
      if (typeof ResizeObserver !== "undefined") {
        const scopeResizeObserver = new ResizeObserver(handleScopedScroll);
        scopeResizeObserver.observe(scopeContainer);
        onCleanup(() => scopeResizeObserver.disconnect());
      }
    }

    if (typeof ResizeObserver !== "undefined" && containerRef) {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const borderBox = entry.borderBoxSize?.[0];
        let width: number;
        let height: number;
        if (borderBox) {
          width = borderBox.inlineSize;
          height = borderBox.blockSize;
        } else {
          const rect = containerRef?.getBoundingClientRect();
          if (!rect) return;
          width = rect.width;
          height = rect.height;
        }
        handleObservedSizeChange(width, height);
      });
      observer.observe(containerRef);
      onCleanup(() => observer.disconnect());
    }

    const fadeInTimeout = setTimeout(() => {
      setIsVisible(true);
    }, TOOLBAR_FADE_IN_DELAY_MS);

    onCleanup(() => {
      clearTimeout(fadeInTimeout);
    });
  });

  onCleanup(() => {
    window.removeEventListener("resize", handleResize);
    window.visualViewport?.removeEventListener("resize", handleResize);
    window.visualViewport?.removeEventListener("scroll", handleResize);
    window.removeEventListener("scroll", handleScopedScroll, { capture: true });
    if (scopedScrollFrameId !== null) nativeCancelAnimationFrame(scopedScrollFrameId);
    clearTimeout(resizeTimeout);
    clearTimeout(collapseAnimationTimeout);

    if (unfreezeUpdatesCallback) releaseInteractionFreeze();
  });

  const currentPosition = () => {
    const collapsed = isCollapsed();
    return collapsed ? computeCollapsedPosition() : position();
  };

  const getCursorClass = (): string => {
    if (isCollapsed()) {
      return "cursor-pointer";
    }
    if (drag.isDragging()) {
      return "cursor-grabbing";
    }
    return "cursor-grab";
  };

  const isInteracting = (): boolean =>
    isToolbarHovered() ||
    Boolean(props.isContextMenuOpen) ||
    drag.isDragging() ||
    drag.isSnapping() ||
    isCollapseAnimating() ||
    isChevronPressed();

  const shouldDim = (): boolean => Boolean(props.isActive) && !isInteracting();

  const getTransitionClass = (): string => {
    if (isResizing() || drag.isDragging()) {
      return "";
    }
    if (drag.isSnapping()) {
      return "transition-[transform,opacity] duration-300 ease-out";
    }
    if (isCollapseAnimating()) {
      const duration = isCollapsed() ? "duration-140" : "duration-220";
      return `transition-[transform,opacity] ${duration} ease-drawer`;
    }
    return "transition-[transform,opacity] duration-400 ease-drawer";
  };

  const getTransformOrigin = (): string => {
    const edge = snapEdge();
    switch (edge) {
      case "top":
        return "center top";
      case "bottom":
        return "center bottom";
      case "left":
        return "left center";
      case "right":
        return "right center";
      default:
        return "center center";
    }
  };

  const containerStyle = () => {
    const resolvedPosition = currentPosition();
    return [
      `z-index: ${Z_INDEX_OVERLAY}`,
      `transform: translate(${resolvedPosition.x}px, ${resolvedPosition.y}px) scale(${shouldDim() ? 0.97 : 1})`,
      `transform-origin: ${getTransformOrigin()}`,
      `opacity: ${!isVisible() ? 0 : shouldDim() ? 0.55 : 1}`,
    ].join("; ");
  };
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions, a11y_no_noninteractive_element_interactions -->
<div
  bind:this={containerRef}
  data-point-to-svelte-ignore-events
  data-point-to-svelte-toolbar
  class={cn(
    "fixed left-0 top-0 font-sans text-[13px] antialiased select-none",
    getCursorClass(),
    getTransitionClass(),
    isVisible() ? "pointer-events-auto" : "pointer-events-none",
  )}
  style={containerStyle()}
  onpointerdown={(event) => {
    stopEventPropagation(event);
    drag.handlePointerDown(event);
  }}
  onmousedown={stopEventPropagation}
  onmouseenter={() => {
    setIsToolbarHovered(true);
    if (!isCollapsed()) props.onSelectHoverChange?.(true);
  }}
  onmouseleave={() => {
    setIsToolbarHovered(false);
    props.onSelectHoverChange?.(false);
  }}
>
  <ToolbarContent
    isCollapsed={isCollapsed()}
    snapEdge={snapEdge()}
    isShaking={isShaking()}
    isChevronPressed={isChevronPressed()}
    transformOrigin={getTransformOrigin()}
    onAnimationEnd={() => setIsShaking(false)}
    onCollapseClick={handleToggleCollapse}
    onCollapsePointerDown={() => setIsChevronPressed(true)}
    onCollapsePointerUp={() => setIsChevronPressed(false)}
    onCollapsePointerLeave={() => setIsChevronPressed(false)}
    onPanelClick={(event) => {
      if (isCollapsed()) {
        event.stopPropagation();
        expandToolbarFromCollapsed();
      }
    }}
  >
    {#snippet actionButtons()}
      <ToolbarActionButton
        actionId={currentActionId()}
        isToggle
        ref={(element) => (selectButtonRef = element)}
        label={isCurrentActionActive()
          ? "Stop selecting element"
          : `${currentActionLabel()} element`}
        isActive={isCurrentActionActive()}
        class={actionButtonClass}
        wrapperClass={actionButtonWrapperClass()}
        onClick={handleToggle}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setHoveredActionId(null);
          props.onToggleToolbarMenu?.();
        }}
        {...createFreezeHandlers(currentActionId)}
        tooltipVisible={isTooltipVisible(currentActionId())}
        tooltipPosition={tooltipPosition()}
        tooltip={currentActionLabel()}
      >
        {#snippet icon()}
          <IconSelect
            size={14}
            rotationDeg={selectIconRotationDeg()}
            class={actionIconClass(isCurrentActionActive())}
          />
        {/snippet}
      </ToolbarActionButton>
    {/snippet}
  </ToolbarContent>
</div>
