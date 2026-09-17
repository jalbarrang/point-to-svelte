<script lang="ts">
  import { onMount } from "svelte";
  import type { OverlayBounds, SelectionLabelInstance } from "../types.js";
  import { lerp } from "../utils/lerp.js";
  import {
    SELECTION_LERP_FACTOR,
    FADE_DURATION_MS,
    FEEDBACK_DURATION_MS,
    DRAG_LERP_FACTOR,
    LERP_CONVERGENCE_THRESHOLD_PX,
    MIN_DEVICE_PIXEL_RATIO,
    Z_INDEX_OVERLAY_CANVAS,
    OVERLAY_BORDER_COLOR_DRAG,
    OVERLAY_FILL_COLOR_DRAG,
    OPACITY_CONVERGENCE_THRESHOLD,
    OVERLAY_BORDER_COLOR_DEFAULT,
    OVERLAY_FILL_COLOR_DEFAULT,
    BASELINE_FRAME_DURATION_MS,
  } from "../constants.js";
  import { nativeCancelAnimationFrame, nativeRequestAnimationFrame } from "../utils/native-raf.js";
  import { supportsDisplayP3 } from "../utils/supports-display-p3.js";
  import { adjustLerpForFrameDuration } from "../utils/adjust-lerp-for-frame-duration.js";

  const DEFAULT_LAYER_STYLE = {
    borderColor: OVERLAY_BORDER_COLOR_DEFAULT,
    fillColor: OVERLAY_FILL_COLOR_DEFAULT,
    lerpFactor: SELECTION_LERP_FACTOR,
  } as const;

  const LAYER_STYLES = {
    drag: {
      borderColor: OVERLAY_BORDER_COLOR_DRAG,
      fillColor: OVERLAY_FILL_COLOR_DRAG,
      lerpFactor: DRAG_LERP_FACTOR,
    },
    selection: DEFAULT_LAYER_STYLE,
    grabbed: DEFAULT_LAYER_STYLE,
  } as const;

  interface AnimatedBounds {
    id: string;
    current: { x: number; y: number; width: number; height: number };
    target: { x: number; y: number; width: number; height: number };
    borderRadius: number;
    opacity: number;
    targetOpacity: number;
    createdAt?: number;
    fadeStartTimestamp: number | null;
    isInitialized: boolean;
  }

  interface Props {
    selectionVisible?: boolean;
    selectionBounds?: OverlayBounds;
    selectionBoundsMultiple?: OverlayBounds[];
    selectionShouldSnap?: boolean;
    dragVisible?: boolean;
    dragBounds?: OverlayBounds;
    grabbedBoxes?: Array<{
      id: string;
      bounds: OverlayBounds;
      createdAt: number;
    }>;
    labelInstances?: SelectionLabelInstance[];
  }

  let {
    selectionVisible,
    selectionBounds,
    selectionBoundsMultiple,
    selectionShouldSnap,
    dragVisible,
    dragBounds,
    grabbedBoxes,
    labelInstances,
  }: Props = $props();

  let canvasElement: HTMLCanvasElement | undefined;
  let mainContext: CanvasRenderingContext2D | null = null;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let devicePixelRatio = 1;
  let animationFrameId: number | null = null;
  let fadeWakeTimeoutId: number | null = null;
  let previousFrameTimestamp: number | null = null;

  let selectionAnimations: AnimatedBounds[] = [];
  let dragAnimation: AnimatedBounds | null = null;
  let grabbedAnimations: AnimatedBounds[] = [];

  const canvasColorSpace: PredefinedColorSpace = supportsDisplayP3() ? "display-p3" : "srgb";

  const initializeCanvas = () => {
    if (!canvasElement) return;

    devicePixelRatio = Math.max(window.devicePixelRatio || 1, MIN_DEVICE_PIXEL_RATIO);
    canvasWidth = document.documentElement.clientWidth || window.innerWidth;
    canvasHeight = document.documentElement.clientHeight || window.innerHeight;

    canvasElement.width = canvasWidth * devicePixelRatio;
    canvasElement.height = canvasHeight * devicePixelRatio;
    canvasElement.style.width = `${canvasWidth}px`;
    canvasElement.style.height = `${canvasHeight}px`;

    mainContext = canvasElement.getContext("2d", { colorSpace: canvasColorSpace });
    if (mainContext) {
      mainContext.scale(devicePixelRatio, devicePixelRatio);
    }
  };

  const parseBorderRadiusValue = (borderRadius: string): number => {
    if (!borderRadius) return 0;
    const match = borderRadius.match(/^(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const createAnimatedBounds = (
    id: string,
    bounds: OverlayBounds,
    options?: { createdAt?: number; opacity?: number; targetOpacity?: number },
  ): AnimatedBounds => ({
    id,
    current: {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    },
    target: {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    },
    borderRadius: parseBorderRadiusValue(bounds.borderRadius),
    opacity: options?.opacity ?? 1,
    targetOpacity: options?.targetOpacity ?? options?.opacity ?? 1,
    createdAt: options?.createdAt,
    fadeStartTimestamp: null,
    isInitialized: true,
  });

  const updateAnimationTarget = (
    animation: AnimatedBounds,
    bounds: OverlayBounds,
    targetOpacity?: number,
  ) => {
    const target = animation.target;
    target.x = bounds.x;
    target.y = bounds.y;
    target.width = bounds.width;
    target.height = bounds.height;
    animation.borderRadius = parseBorderRadiusValue(bounds.borderRadius);
    if (targetOpacity !== undefined) {
      if (targetOpacity > animation.targetOpacity) {
        animation.opacity = targetOpacity;
      }
      animation.targetOpacity = targetOpacity;
    }
  };

  const resolveBoundsArray = (instance: SelectionLabelInstance): OverlayBounds[] =>
    instance.boundsMultiple ?? [instance.bounds];

  const drawRoundedRectangle = (
    context: CanvasRenderingContext2D,
    rectX: number,
    rectY: number,
    rectWidth: number,
    rectHeight: number,
    cornerRadius: number,
    fillColor: string,
    strokeColor: string,
    opacity: number = 1,
  ) => {
    if (rectWidth <= 0 || rectHeight <= 0) return;

    const maxCornerRadius = Math.min(rectWidth / 2, rectHeight / 2);
    const clampedCornerRadius = Math.min(cornerRadius, maxCornerRadius);

    const shouldSetGlobalAlpha = opacity !== 1;
    if (shouldSetGlobalAlpha) context.globalAlpha = opacity;
    context.beginPath();
    if (clampedCornerRadius > 0) {
      context.roundRect(rectX, rectY, rectWidth, rectHeight, clampedCornerRadius);
    } else {
      context.rect(rectX, rectY, rectWidth, rectHeight);
    }
    context.fillStyle = fillColor;
    context.fill();
    context.strokeStyle = strokeColor;
    context.lineWidth = 1;
    context.stroke();
    if (shouldSetGlobalAlpha) context.globalAlpha = 1;
  };

  const renderDragLayer = () => {
    if (!mainContext || !dragVisible || !dragAnimation) return;

    const style = LAYER_STYLES.drag;
    drawRoundedRectangle(
      mainContext,
      dragAnimation.current.x,
      dragAnimation.current.y,
      dragAnimation.current.width,
      dragAnimation.current.height,
      dragAnimation.borderRadius,
      style.fillColor,
      style.borderColor,
    );
  };

  const renderSelectionLayer = () => {
    if (!mainContext || !selectionVisible) return;

    const style = LAYER_STYLES.selection;

    for (const animation of selectionAnimations) {
      drawRoundedRectangle(
        mainContext,
        animation.current.x,
        animation.current.y,
        animation.current.width,
        animation.current.height,
        animation.borderRadius,
        style.fillColor,
        style.borderColor,
        animation.opacity,
      );
    }
  };

  const renderBoundsLayer = (animations: AnimatedBounds[]) => {
    if (!mainContext) return;

    const style = LAYER_STYLES.grabbed;

    for (const animation of animations) {
      drawRoundedRectangle(
        mainContext,
        animation.current.x,
        animation.current.y,
        animation.current.width,
        animation.current.height,
        animation.borderRadius,
        style.fillColor,
        style.borderColor,
        animation.opacity,
      );
    }
  };

  const compositeAllLayers = () => {
    if (!mainContext || !canvasElement) return;
    if (canvasWidth <= 0 || canvasHeight <= 0) return;

    mainContext.setTransform(1, 0, 0, 1, 0, 0);
    mainContext.clearRect(0, 0, canvasElement.width, canvasElement.height);
    mainContext.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    renderDragLayer();
    renderSelectionLayer();
    renderBoundsLayer(grabbedAnimations);
  };

  const interpolateBounds = (
    animation: AnimatedBounds,
    lerpFactor: number,
    options?: { interpolateOpacity?: boolean },
  ): boolean => {
    const lerpedX = lerp(animation.current.x, animation.target.x, lerpFactor);
    const lerpedY = lerp(animation.current.y, animation.target.y, lerpFactor);
    const lerpedWidth = lerp(animation.current.width, animation.target.width, lerpFactor);
    const lerpedHeight = lerp(animation.current.height, animation.target.height, lerpFactor);

    const hasBoundsConverged =
      Math.abs(lerpedX - animation.target.x) < LERP_CONVERGENCE_THRESHOLD_PX &&
      Math.abs(lerpedY - animation.target.y) < LERP_CONVERGENCE_THRESHOLD_PX &&
      Math.abs(lerpedWidth - animation.target.width) < LERP_CONVERGENCE_THRESHOLD_PX &&
      Math.abs(lerpedHeight - animation.target.height) < LERP_CONVERGENCE_THRESHOLD_PX;

    animation.current.x = hasBoundsConverged ? animation.target.x : lerpedX;
    animation.current.y = hasBoundsConverged ? animation.target.y : lerpedY;
    animation.current.width = hasBoundsConverged ? animation.target.width : lerpedWidth;
    animation.current.height = hasBoundsConverged ? animation.target.height : lerpedHeight;

    let hasOpacityConverged = true;
    if (options?.interpolateOpacity) {
      const lerpedOpacity = lerp(animation.opacity, animation.targetOpacity, lerpFactor);
      hasOpacityConverged =
        Math.abs(lerpedOpacity - animation.targetOpacity) < OPACITY_CONVERGENCE_THRESHOLD;
      animation.opacity = hasOpacityConverged ? animation.targetOpacity : lerpedOpacity;
    }

    return !hasBoundsConverged || !hasOpacityConverged;
  };

  const scheduleAnimationFrame = () => {
    if (fadeWakeTimeoutId !== null) {
      window.clearTimeout(fadeWakeTimeoutId);
      fadeWakeTimeoutId = null;
    }
    if (animationFrameId !== null) return;
    animationFrameId = nativeRequestAnimationFrame(runAnimationFrame);
  };

  const runAnimationFrame = () => {
    const currentFrameTimestamp = performance.now();
    const frameDurationMs =
      previousFrameTimestamp !== null
        ? currentFrameTimestamp - previousFrameTimestamp
        : BASELINE_FRAME_DURATION_MS;
    previousFrameTimestamp = currentFrameTimestamp;

    const dragLerpForFrame = adjustLerpForFrameDuration(
      LAYER_STYLES.drag.lerpFactor,
      frameDurationMs,
    );
    const selectionLerpForFrame = adjustLerpForFrameDuration(
      LAYER_STYLES.selection.lerpFactor,
      frameDurationMs,
    );
    const grabbedLerpForFrame = adjustLerpForFrameDuration(
      LAYER_STYLES.grabbed.lerpFactor,
      frameDurationMs,
    );

    let shouldContinueAnimating = false;
    let nextFadeDelayMs: number | null = null;

    if (dragAnimation?.isInitialized) {
      if (interpolateBounds(dragAnimation, dragLerpForFrame)) {
        shouldContinueAnimating = true;
      }
    }

    for (const animation of selectionAnimations) {
      if (animation.isInitialized) {
        if (interpolateBounds(animation, selectionLerpForFrame)) {
          shouldContinueAnimating = true;
        }
      }
    }

    const currentTimestamp = Date.now();
    grabbedAnimations = grabbedAnimations.filter((animation) => {
      const isLabelAnimation = animation.id.startsWith("label-");

      if (animation.isInitialized) {
        const isStillAnimating = interpolateBounds(animation, grabbedLerpForFrame);
        if (isStillAnimating) {
          shouldContinueAnimating = true;
        }
      }

      if (isLabelAnimation && animation.targetOpacity === 0) {
        if (animation.fadeStartTimestamp === null) {
          animation.fadeStartTimestamp = currentFrameTimestamp;
        }
        const labelElapsed = currentFrameTimestamp - animation.fadeStartTimestamp;
        const labelProgress = Math.min(1, labelElapsed / FADE_DURATION_MS);
        const labelEaseOut = 1 - (1 - labelProgress) * (1 - labelProgress);
        animation.opacity = Math.max(0, 1 - labelEaseOut);
        if (labelProgress >= 1) return false;
        shouldContinueAnimating = true;
        return true;
      } else if (isLabelAnimation) {
        animation.fadeStartTimestamp = null;
      }

      if (animation.createdAt !== undefined) {
        const elapsed = currentTimestamp - animation.createdAt;
        const fadeOutDeadline = FEEDBACK_DURATION_MS + FADE_DURATION_MS;

        if (elapsed >= fadeOutDeadline) {
          return false;
        }

        if (elapsed > FEEDBACK_DURATION_MS) {
          const fadeProgress = Math.min(1, (elapsed - FEEDBACK_DURATION_MS) / FADE_DURATION_MS);
          const easeOut = 1 - (1 - fadeProgress) * (1 - fadeProgress);
          animation.opacity = 1 - easeOut;
          shouldContinueAnimating = true;
        } else {
          const fadeDelayMs = FEEDBACK_DURATION_MS - elapsed;
          nextFadeDelayMs =
            nextFadeDelayMs === null ? fadeDelayMs : Math.min(nextFadeDelayMs, fadeDelayMs);
        }

        return true;
      }

      if (isLabelAnimation) {
        return true;
      }

      return animation.opacity > 0;
    });

    compositeAllLayers();

    if (shouldContinueAnimating) {
      animationFrameId = nativeRequestAnimationFrame(runAnimationFrame);
    } else {
      animationFrameId = null;
      previousFrameTimestamp = null;
      if (nextFadeDelayMs !== null) {
        fadeWakeTimeoutId = window.setTimeout(
          () => {
            fadeWakeTimeoutId = null;
            scheduleAnimationFrame();
          },
          Math.max(0, nextFadeDelayMs),
        );
      }
    }
  };

  const handleWindowResize = () => {
    initializeCanvas();
    scheduleAnimationFrame();
  };

  $effect(() => {
    const isVisible = selectionVisible;
    const singleBounds = selectionBounds;
    const multipleBounds = selectionBoundsMultiple;
    const shouldSnap = selectionShouldSnap;

    if (!isVisible || (!singleBounds && (!multipleBounds || multipleBounds.length === 0))) {
      selectionAnimations = [];
      scheduleAnimationFrame();
      return;
    }

    let boundsToRender: readonly OverlayBounds[];
    if (multipleBounds && multipleBounds.length > 0) {
      boundsToRender = multipleBounds;
    } else if (singleBounds) {
      boundsToRender = [singleBounds];
    } else {
      boundsToRender = [];
    }

    const existingSelectionById = new Map<string, AnimatedBounds>();
    for (const animation of selectionAnimations) {
      existingSelectionById.set(animation.id, animation);
    }

    selectionAnimations = boundsToRender.map((bounds, index) => {
      const animationId = `selection-${index}`;
      const existingAnimation = existingSelectionById.get(animationId);

      if (existingAnimation) {
        updateAnimationTarget(existingAnimation, bounds);
        if (shouldSnap) {
          existingAnimation.current.x = existingAnimation.target.x;
          existingAnimation.current.y = existingAnimation.target.y;
          existingAnimation.current.width = existingAnimation.target.width;
          existingAnimation.current.height = existingAnimation.target.height;
        }
        return existingAnimation;
      }

      return createAnimatedBounds(animationId, bounds);
    });

    scheduleAnimationFrame();
  });

  $effect(() => {
    const isVisible = dragVisible;
    const bounds = dragBounds;

    if (!isVisible || !bounds) {
      dragAnimation = null;
      scheduleAnimationFrame();
      return;
    }

    if (dragAnimation) {
      updateAnimationTarget(dragAnimation, bounds);
    } else {
      dragAnimation = createAnimatedBounds("drag", bounds);
    }

    scheduleAnimationFrame();
  });

  $effect(() => {
    const boxesToProcess = grabbedBoxes ?? [];
    const instancesToProcess = labelInstances ?? [];

    const boxesById = new Map<string, (typeof boxesToProcess)[number]>();
    for (const box of boxesToProcess) {
      boxesById.set(box.id, box);
    }

    const animationsById = new Map<string, AnimatedBounds>();
    for (const animation of grabbedAnimations) {
      animationsById.set(animation.id, animation);
    }

    for (const box of boxesToProcess) {
      if (!animationsById.has(box.id)) {
        const newAnimation = createAnimatedBounds(box.id, box.bounds, {
          createdAt: box.createdAt,
        });
        grabbedAnimations.push(newAnimation);
        animationsById.set(box.id, newAnimation);
      }
    }

    for (const animation of grabbedAnimations) {
      const matchingBox = boxesById.get(animation.id);
      if (matchingBox) {
        updateAnimationTarget(animation, matchingBox.bounds);
      }
    }

    const activeLabelIds = new Set<string>();
    for (const instance of instancesToProcess) {
      const boundsToRender = resolveBoundsArray(instance);
      const targetOpacity = instance.status === "fading" ? 0 : 1;

      for (let index = 0; index < boundsToRender.length; index++) {
        const bounds = boundsToRender[index];
        const animationId = `label-${instance.id}-${index}`;
        activeLabelIds.add(animationId);

        const existingAnimation = animationsById.get(animationId);
        if (existingAnimation) {
          updateAnimationTarget(existingAnimation, bounds, targetOpacity);
        } else {
          const newAnimation = createAnimatedBounds(animationId, bounds, {
            opacity: 1,
            targetOpacity,
          });
          grabbedAnimations.push(newAnimation);
          animationsById.set(animationId, newAnimation);
        }
      }
    }

    grabbedAnimations = grabbedAnimations.filter((animation) => {
      if (animation.id.startsWith("label-")) {
        return activeLabelIds.has(animation.id);
      }
      return boxesById.has(animation.id);
    });

    scheduleAnimationFrame();
  });

  onMount(() => {
    initializeCanvas();
    scheduleAnimationFrame();

    window.addEventListener("resize", handleWindowResize);

    let currentDprMediaQuery: MediaQueryList | null = null;

    const handleDevicePixelRatioChange = () => {
      const newDevicePixelRatio = Math.max(window.devicePixelRatio || 1, MIN_DEVICE_PIXEL_RATIO);
      if (newDevicePixelRatio !== devicePixelRatio) {
        handleWindowResize();
        setupDprMediaQuery();
      }
    };

    const setupDprMediaQuery = () => {
      if (currentDprMediaQuery) {
        currentDprMediaQuery.removeEventListener("change", handleDevicePixelRatioChange);
      }
      currentDprMediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      currentDprMediaQuery.addEventListener("change", handleDevicePixelRatioChange);
    };

    setupDprMediaQuery();

    return () => {
      window.removeEventListener("resize", handleWindowResize);
      if (currentDprMediaQuery) {
        currentDprMediaQuery.removeEventListener("change", handleDevicePixelRatioChange);
      }
      if (animationFrameId !== null) {
        nativeCancelAnimationFrame(animationFrameId);
      }
      if (fadeWakeTimeoutId !== null) {
        window.clearTimeout(fadeWakeTimeoutId);
      }
    };
  });
</script>

<canvas
  bind:this={canvasElement}
  data-point-to-svelte-overlay-canvas
  style="position: fixed; top: 0; left: 0; pointer-events: none; z-index: {Z_INDEX_OVERLAY_CANVAS}"
></canvas>
