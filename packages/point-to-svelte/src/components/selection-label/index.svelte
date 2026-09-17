<script lang="ts">
  import type { ArrowPosition, SelectionLabelProps } from "../../types.js";
  import {
    FADE_DURATION_MS,
    PANEL_SHADOW,
    VIEWPORT_MARGIN_PX,
    ARROW_CENTER_PERCENT,
    ARROW_LABEL_MARGIN_PX,
    LABEL_GAP_PX,
    SELECTION_LABEL_OFFSCREEN_PX,
    TEXTAREA_MAX_HEIGHT_PX,
    Z_INDEX_OVERLAY,
  } from "../../constants.js";
  import { autoResizeTextarea } from "../../utils/auto-resize-textarea.js";
  import { focusInOverlay } from "../../utils/focus-in-overlay.js";
  import { getArrowSize } from "../../utils/get-arrow-size.js";
  import { getVisualViewport } from "../../utils/get-visual-viewport.js";
  import { isKeyboardEventComposing } from "../../utils/is-keyboard-event-composing.js";
  import { getScopeContainer } from "../../utils/runtime-mode.js";
  import { cn } from "../../utils/cn.js";
  import { getTagDisplay } from "../../utils/get-tag-display.js";
  import IconSubmit from "../icons/icon-submit.svelte";
  import IconLoader from "../icons/icon-loader.svelte";
  import Arrow from "./arrow.svelte";
  import TagBadge from "./tag-badge.svelte";
  import BottomSection from "./bottom-section.svelte";
  import Surface from "../ui/surface.svelte";
  import DiscardPrompt from "./discard-prompt.svelte";
  import ErrorView from "./error-view.svelte";
  import CompletionView from "./completion-view.svelte";

  interface LabelPosition {
    left: number;
    top: number;
    arrowLeftPercent: number;
    arrowLeftOffset: number;
    edgeOffsetX: number;
  }

  interface PositionResult {
    position: LabelPosition;
    computedArrowPosition: ArrowPosition | null;
    hadValidBounds: boolean;
    elementIdentity: string;
  }

  const DEFAULT_OFFSCREEN_POSITION: LabelPosition = {
    left: SELECTION_LABEL_OFFSCREEN_PX,
    top: SELECTION_LABEL_OFFSCREEN_PX,
    arrowLeftPercent: ARROW_CENTER_PERCENT,
    arrowLeftOffset: 0,
    edgeOffsetX: 0,
  };

  let {
    tagName,
    componentName,
    elementsCount,
    selectionBounds,
    mouseX,
    visible = true,
    isPromptMode = false,
    inputValue,
    status,
    statusText,
    filePath,
    onInputChange,
    onSubmit,
    onOpen,
    onDismiss,
    selectionLabelShakeCount,
    onConfirmDismiss,
    discardPrompt,
    error,
    onAcknowledgeError,
    onRetry,
    onShowContextMenu,
    onHoverChange,
    hideArrow = false,
  }: SelectionLabelProps = $props();

  let containerElement = $state<HTMLDivElement>();
  let panelElement = $state<HTMLDivElement>();
  let inputElement = $state<HTMLTextAreaElement>();

  let isTagCurrentlyHovered = false;

  let measuredWidth = $state(0);
  let measuredHeight = $state(0);
  let panelWidth = $state(0);
  let viewportVersion = $state(0);
  let isInternalFading = $state(false);
  let isShaking = $state(false);

  const canInteract = $derived(
    status !== "copying" && status !== "copied" && status !== "fading" && status !== "error",
  );
  const isCompletedStatus = $derived(status === "copied" || status === "fading");

  const shouldEnablePointerEvents = $derived.by((): boolean => {
    if (isPromptMode) return true;
    if (discardPrompt) return true;
    if (isCompletedStatus && (onDismiss || onShowContextMenu)) {
      return true;
    }
    if (status === "error" && (onAcknowledgeError || onRetry)) {
      return true;
    }
    return false;
  });

  const handleTagHoverChange = (hovered: boolean) => {
    isTagCurrentlyHovered = hovered;
  };

  const handleViewportChange = () => {
    viewportVersion += 1;
  };

  $effect(() => {
    const container = containerElement;
    const panel = panelElement;
    const scopeContainer = getScopeContainer();
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rect = entry.target.getBoundingClientRect();
        if (entry.target === container && !isTagCurrentlyHovered) {
          measuredWidth = rect.width;
          measuredHeight = rect.height;
        } else if (entry.target === panel) {
          panelWidth = rect.width;
        } else if (entry.target === scopeContainer) {
          handleViewportChange();
        }
      }
    });
    if (scopeContainer) resizeObserver.observe(scopeContainer);
    if (container) {
      const rect = container.getBoundingClientRect();
      measuredWidth = rect.width;
      measuredHeight = rect.height;
      resizeObserver.observe(container);
    }
    if (panel) {
      panelWidth = panel.getBoundingClientRect().width;
      resizeObserver.observe(panel);
    }
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
    };
  });

  $effect(() => {
    const input = inputElement;
    if (!input || !onSubmit) return;
    queueMicrotask(() => {
      focusInOverlay(input, { preventScroll: true });
      autoResizeTextarea(input, TEXTAREA_MAX_HEIGHT_PX);
    });
  });

  const elementIdentity = $derived(`${tagName ?? ""}:${componentName ?? ""}`);

  const tagDisplayResult = $derived(
    getTagDisplay({
      tagName,
      componentName,
      elementsCount,
    }),
  );

  let positionState: PositionResult = {
    position: DEFAULT_OFFSCREEN_POSITION,
    computedArrowPosition: null,
    hadValidBounds: false,
    elementIdentity: "",
  };

  const positionComputation = $derived.by((): PositionResult => {
    viewportVersion;
    const currentElementIdentity = elementIdentity;
    const didReset = currentElementIdentity !== positionState.elementIdentity;
    const cached: PositionResult = didReset
      ? {
          position: DEFAULT_OFFSCREEN_POSITION,
          computedArrowPosition: null,
          hadValidBounds: false,
          elementIdentity: currentElementIdentity,
        }
      : positionState;

    const bounds = selectionBounds;
    const labelWidth = measuredWidth;
    const labelHeight = measuredHeight;
    const hasMeasurements = labelWidth > 0 && labelHeight > 0;
    const hasValidBounds = bounds && bounds.width > 0 && bounds.height > 0;

    if (!hasMeasurements || !hasValidBounds) {
      positionState = {
        position: cached.hadValidBounds ? cached.position : DEFAULT_OFFSCREEN_POSITION,
        computedArrowPosition: cached.computedArrowPosition,
        hadValidBounds: cached.hadValidBounds,
        elementIdentity: currentElementIdentity,
      };
      return positionState;
    }

    const viewport = getVisualViewport();
    const viewportLeft = viewport.offsetLeft;
    const viewportTop = viewport.offsetTop;
    const viewportRight = viewportLeft + viewport.width;
    const viewportBottom = viewportTop + viewport.height;

    const isSelectionVisibleInViewport =
      bounds.x + bounds.width > viewportLeft &&
      bounds.x < viewportRight &&
      bounds.y + bounds.height > viewportTop &&
      bounds.y < viewportBottom;

    if (!isSelectionVisibleInViewport) {
      positionState = {
        position: DEFAULT_OFFSCREEN_POSITION,
        computedArrowPosition: cached.computedArrowPosition,
        hadValidBounds: cached.hadValidBounds,
        elementIdentity: currentElementIdentity,
      };
      return positionState;
    }

    const selectionCenterX = bounds.x + bounds.width / 2;
    const cursorX = mouseX ?? selectionCenterX;
    const selectionBottom = bounds.y + bounds.height;
    const selectionTop = bounds.y;

    const actualArrowHeight = hideArrow ? 0 : getArrowSize(panelWidth);

    const anchorX = cursorX;
    let edgeOffsetX = 0;
    let positionTop = selectionBottom + actualArrowHeight + LABEL_GAP_PX;

    const labelLeft = anchorX - labelWidth / 2;
    const labelRight = anchorX + labelWidth / 2;

    if (labelRight > viewportRight - VIEWPORT_MARGIN_PX) {
      edgeOffsetX = viewportRight - VIEWPORT_MARGIN_PX - labelRight;
    }
    if (labelLeft + edgeOffsetX < viewportLeft + VIEWPORT_MARGIN_PX) {
      edgeOffsetX = viewportLeft + VIEWPORT_MARGIN_PX - labelLeft;
    }

    const totalHeightNeeded = labelHeight + actualArrowHeight + LABEL_GAP_PX;
    const fitsBelow = positionTop + labelHeight <= viewportBottom - VIEWPORT_MARGIN_PX;

    if (!fitsBelow) {
      positionTop = selectionTop - totalHeightNeeded;
    }

    if (positionTop < viewportTop + VIEWPORT_MARGIN_PX) {
      positionTop = viewportTop + VIEWPORT_MARGIN_PX;
    }

    const labelHalfWidth = labelWidth / 2;
    const arrowCenterPx = labelHalfWidth - edgeOffsetX;
    const arrowMinPx = Math.min(ARROW_LABEL_MARGIN_PX, labelHalfWidth);
    const arrowMaxPx = Math.max(labelWidth - ARROW_LABEL_MARGIN_PX, labelHalfWidth);
    const clampedArrowCenterPx = Math.max(arrowMinPx, Math.min(arrowMaxPx, arrowCenterPx));
    const arrowLeftOffset = clampedArrowCenterPx - labelHalfWidth;

    const computedArrowPosition: ArrowPosition = fitsBelow ? "bottom" : "top";

    positionState = {
      position: {
        left: anchorX,
        top: positionTop,
        arrowLeftPercent: ARROW_CENTER_PERCENT,
        arrowLeftOffset,
        edgeOffsetX,
      },
      computedArrowPosition,
      hadValidBounds: true,
      elementIdentity: currentElementIdentity,
    };
    return positionState;
  });

  const arrowPosition = $derived(positionComputation.computedArrowPosition ?? "bottom");

  let hasRunShakeEffect = false;
  $effect(() => {
    void selectionLabelShakeCount;
    if (hasRunShakeEffect) isShaking = true;
    hasRunShakeEffect = true;
  });

  const handleKeyDown = (event: KeyboardEvent) => {
    if (isKeyboardEventComposing(event)) {
      return;
    }

    event.stopImmediatePropagation();

    const isEnterWithoutShift = event.code === "Enter" && !event.shiftKey;
    const isEscape = event.code === "Escape";

    if (isEnterWithoutShift) {
      event.preventDefault();
      onSubmit?.();
    } else if (isEscape) {
      event.preventDefault();
      onConfirmDismiss?.();
    }
  };

  const handleInput = (event: Event) => {
    const inputTarget = event.target;
    if (!(inputTarget instanceof HTMLTextAreaElement)) {
      return;
    }
    autoResizeTextarea(inputTarget, TEXTAREA_MAX_HEIGHT_PX);
    onInputChange?.(inputTarget.value);
  };

  const isSinglePanelLine = $derived.by(() => {
    if (error || discardPrompt) return false;
    if (canInteract && isPromptMode) return false;
    return true;
  });

  const handleTagClick = (event: MouseEvent) => {
    event.stopImmediatePropagation();
    if (filePath && onOpen) {
      onOpen();
    }
  };

  const handleContainerPointerDown = (event: PointerEvent) => {
    event.stopImmediatePropagation();
    const isEditableInputVisible = canInteract && isPromptMode && !discardPrompt && onSubmit;
    if (isEditableInputVisible && inputElement) {
      focusInOverlay(inputElement, { preventScroll: true });
    }
  };

  const shouldPersistDuringFade = $derived(
    positionComputation.hadValidBounds && (isCompletedStatus || status === "error"),
  );

  const containerStyle = $derived.by(() => {
    const position = positionComputation.position;
    const isFading = status === "fading" || isInternalFading;
    return [
      `top: ${position.top}px`,
      `left: ${position.left}px`,
      `transform: translateX(calc(-50% + ${position.edgeOffsetX}px))`,
      `z-index: ${Z_INDEX_OVERLAY}`,
      `pointer-events: ${shouldEnablePointerEvents ? "auto" : "none"}`,
      `transition: opacity ${FADE_DURATION_MS}ms ease-out, filter ${FADE_DURATION_MS}ms ease-out`,
      `opacity: ${isFading ? 0 : 1}`,
      `filter: drop-shadow(${PANEL_SHADOW}) blur(${isFading ? "3px" : "0"})`,
    ].join("; ");
  });
</script>

{#if visible !== false && (selectionBounds || shouldPersistDuringFade)}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions, a11y_no_noninteractive_element_interactions -->
  <div
    bind:this={containerElement}
    data-point-to-svelte-ignore-events
    data-point-to-svelte-selection-label
    class="fixed font-sans text-[13px] antialiased select-none"
    style={containerStyle}
    onpointerdown={handleContainerPointerDown}
    onclick={(event) => {
      event.stopImmediatePropagation();
    }}
    onmouseenter={() => onHoverChange?.(true)}
    onmouseleave={() => onHoverChange?.(false)}
  >
    {#if !hideArrow}
      <Arrow
        position={arrowPosition}
        leftPercent={positionComputation.position.arrowLeftPercent}
        leftOffsetPx={positionComputation.position.arrowLeftOffset}
        labelWidth={panelWidth}
      />
    {/if}

    {#if isCompletedStatus && !error}
      <CompletionView
        statusText={statusText ?? "Copied"}
        {onDismiss}
        onFadingChange={(fading) => (isInternalFading = fading)}
        {onShowContextMenu}
      />
    {/if}

    <Surface
      ref={(element) => (panelElement = element)}
      shape={isSinglePanelLine ? "pill" : "panel"}
      class={cn("flex items-center gap-[5px] w-fit h-fit p-0", isShaking && "animate-shake")}
      style={{ display: isCompletedStatus && !error ? "none" : undefined }}
      onanimationend={() => (isShaking = false)}
    >
      {#if status === "copying"}
        <div
          class="contain-layout shrink-0 flex flex-col justify-center items-start w-fit h-fit max-w-[280px]"
        >
          <div class="contain-layout shrink-0 flex items-center gap-1 py-1.5 px-2 w-full h-fit">
            <IconLoader size={13} class="text-[var(--sg-text-secondary)] shrink-0" />
            <span
              class="shimmer-text text-[13px] leading-4 font-sans font-medium h-fit tabular-nums overflow-hidden text-ellipsis whitespace-nowrap"
            >
              {statusText ?? "Grabbing…"}
            </span>
          </div>
        </div>
      {/if}

      {#if canInteract && !isPromptMode && !discardPrompt}
        <div class="contain-layout shrink-0 flex flex-col items-start w-fit h-fit">
          <div class="contain-layout shrink-0 flex items-center gap-1 w-fit h-fit px-2 py-1.5">
            <TagBadge
              tagName={tagDisplayResult.tagName}
              componentName={tagDisplayResult.componentName}
              isClickable={Boolean(filePath && onOpen)}
              onClick={handleTagClick}
              onHoverChange={handleTagHoverChange}
              shrink
            />
          </div>
        </div>
      {/if}

      {#if canInteract && isPromptMode && !discardPrompt}
        <div
          class="contain-layout shrink-0 flex flex-col justify-center items-start w-fit h-fit min-w-[150px] max-w-[280px]"
        >
          <div
            class="contain-layout shrink-0 flex items-center gap-1 pt-1.5 pb-1 w-fit h-fit px-2 max-w-full"
          >
            <TagBadge
              tagName={tagDisplayResult.tagName}
              componentName={tagDisplayResult.componentName}
              isClickable={Boolean(filePath && onOpen)}
              onClick={handleTagClick}
              onHoverChange={handleTagHoverChange}
            />
          </div>
          <BottomSection>
            <div class="shrink-0 flex justify-between items-end w-full min-h-4">
              <textarea
                bind:this={inputElement}
                data-point-to-svelte-ignore-events
                data-point-to-svelte-input
                aria-label="Add context for selected element"
                aria-keyshortcuts="Enter Escape"
                class="text-[var(--sg-text-primary)] text-[13px] leading-4 font-medium bg-transparent border-none resize-none flex-1 p-0 m-0 wrap-break-word overflow-y-auto"
                style="field-sizing: content; min-height: 16px; max-height: {TEXTAREA_MAX_HEIGHT_PX}px; scrollbar-width: none"
                value={inputValue ?? ""}
                oninput={handleInput}
                onkeydown={handleKeyDown}
                placeholder="Add context"
                rows={1}
                readOnly={!onSubmit}
              ></textarea>
              {#if onSubmit}
                <button
                  data-point-to-svelte-submit
                  type="button"
                  aria-label="Submit context"
                  class="contain-layout shrink-0 flex items-center justify-center size-4 rounded-full bg-[var(--sg-submit-bg)] cursor-pointer ml-1 interactive-scale a11y-hitbox"
                  onclick={() => onSubmit?.()}
                >
                  <IconSubmit size={10} aria-hidden="true" class="text-[var(--sg-submit-fg)]" />
                </button>
              {/if}
            </div>
          </BottomSection>
        </div>
      {/if}

      {#if discardPrompt}
        {#key discardPrompt}
          <DiscardPrompt
            label={discardPrompt.isKeyboardSelection ? "Discard selection?" : discardPrompt.label}
            showCancel={!discardPrompt.isKeyboardSelection}
            cancelOnEscape={discardPrompt.cancelOnEscape}
            onConfirm={discardPrompt.onConfirm}
            onCopy={discardPrompt.onCopy}
            onCancel={() => {
              if (!discardPrompt?.isKeyboardSelection) {
                discardPrompt?.onCancel?.();
              }
              focusInOverlay(inputElement, { preventScroll: true });
            }}
          />
        {/key}
      {/if}

      {#if error}
        <ErrorView {error} onAcknowledge={onAcknowledgeError} {onRetry} />
      {/if}
    </Surface>
  </div>
{/if}
