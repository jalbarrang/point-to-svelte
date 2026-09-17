<script lang="ts">
  import {
    createEffect,
    createMemo,
    createSignal,
    on,
    onCleanup,
    onMount,
  } from "../reactivity.svelte";
  import type {
    Position,
    OverlayBounds,
    ContextMenuAction,
    ContextMenuActionContext,
  } from "../types.js";
  import {
    ARROW_HEIGHT_PX,
    DROPDOWN_OFFSCREEN_POSITION,
    LABEL_GAP_PX,
    MENU_HIGHLIGHT_CORNER_SHAPE,
    MENU_PANEL_CORNER_RADIUS_PX,
    Z_INDEX_OVERLAY,
  } from "../constants.js";
  import Arrow from "./selection-label/arrow.svelte";
  import TagBadge from "./selection-label/tag-badge.svelte";
  import BottomSection from "./selection-label/bottom-section.svelte";
  import {
    MenuItem,
    MenuItemLabel,
    MenuList,
    MenuPanel,
    MenuProvider,
    MenuShortcut,
    createMenuStore,
  } from "./menu/index.js";
  import { getTagDisplay } from "../utils/get-tag-display.js";
  import { resolveActionEnabled } from "../utils/resolve-action-enabled.js";
  import { nativeRequestAnimationFrame } from "../utils/native-raf.js";
  import { suppressMenuEvent } from "../utils/suppress-menu-event.js";
  import { registerOverlayDismiss } from "../utils/register-overlay-dismiss.js";
  import { ignoreRealInput } from "../utils/runtime-mode.js";
  import { findShortcutAction } from "../utils/action-shortcuts.js";
  import { executeContextMenuAction } from "../utils/execute-context-menu-action.js";

  interface ContextMenuProps {
    position: Position | null;
    selectionBounds: OverlayBounds | null;
    tagName?: string;
    componentName?: string;
    hasFilePath: boolean;
    actions?: ContextMenuAction[];
    actionContext?: ContextMenuActionContext;
    onDismiss: () => void;
    onHide: () => void;
  }

  interface ContextMenuRow {
    id: string;
    label: string;
    action: () => void;
    enabled: boolean;
    shortcut?: string;
    shortcutModifier?: boolean;
  }

  let props: ContextMenuProps = $props();

  let containerRef = $state<HTMLDivElement>();
  let menuContainerRef: HTMLDivElement | undefined;
  let previouslyFocusedElement: Element | null = null;

  const menuStore = createMenuStore({
    keyboardNavigation: true,
    highlight: {
      bottomCornerRadiusPx: MENU_PANEL_CORNER_RADIUS_PX,
      cornerShape: MENU_HIGHLIGHT_CORNER_SHAPE,
    },
  });

  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);

  const isVisible = createMemo(() => props.position !== null);

  const tagDisplayResult = createMemo(() =>
    getTagDisplay({
      tagName: props.tagName,
      componentName: props.componentName,
    }),
  );

  const measureContainer = () => {
    if (containerRef) {
      const containerBounds = containerRef.getBoundingClientRect();
      setMeasuredWidth(containerBounds.width);
      setMeasuredHeight(containerBounds.height);
    }
  };

  createEffect(() => {
    if (isVisible()) {
      nativeRequestAnimationFrame(measureContainer);
    }
  });

  const computedPosition = createMemo(() => {
    const bounds = props.selectionBounds;
    const clickPosition = props.position;
    const labelWidth = measuredWidth();
    const labelHeight = measuredHeight();

    if (labelWidth === 0 || labelHeight === 0 || !bounds || !clickPosition) {
      return {
        left: DROPDOWN_OFFSCREEN_POSITION.left,
        top: DROPDOWN_OFFSCREEN_POSITION.top,
        arrowLeft: 0,
        arrowPosition: "bottom" as const,
      };
    }

    const cursorX = clickPosition.x ?? bounds.x + bounds.width / 2;
    const positionLeft = Math.max(
      LABEL_GAP_PX,
      Math.min(cursorX - labelWidth / 2, window.innerWidth - labelWidth - LABEL_GAP_PX),
    );
    const arrowLeft = Math.max(
      ARROW_HEIGHT_PX,
      Math.min(cursorX - positionLeft, labelWidth - ARROW_HEIGHT_PX),
    );

    const positionBelow = bounds.y + bounds.height + ARROW_HEIGHT_PX + LABEL_GAP_PX;
    const positionAbove = bounds.y - labelHeight - ARROW_HEIGHT_PX - LABEL_GAP_PX;
    const wouldOverflowBottom = positionBelow + labelHeight > window.innerHeight;
    const hasSpaceAbove = positionAbove >= 0;

    const shouldFlipAbove = wouldOverflowBottom && hasSpaceAbove;
    let positionTop = shouldFlipAbove ? positionAbove : positionBelow;
    let arrowPosition: "top" | "bottom" = shouldFlipAbove ? "top" : "bottom";

    if (wouldOverflowBottom && !hasSpaceAbove) {
      const cursorY = clickPosition.y ?? bounds.y + bounds.height / 2;
      positionTop = Math.max(
        LABEL_GAP_PX,
        Math.min(cursorY + LABEL_GAP_PX, window.innerHeight - labelHeight - LABEL_GAP_PX),
      );
      arrowPosition = "top";
    }

    return { left: positionLeft, top: positionTop, arrowLeft, arrowPosition };
  });

  const menuItems = createMemo<ContextMenuRow[]>(() => {
    const pluginActions = props.actions ?? [];
    const context = props.actionContext;

    return pluginActions.map((action) => ({
      id: action.id,
      label: action.label,
      action: () => {
        if (context) {
          executeContextMenuAction(action, context);
        }
      },
      enabled: resolveActionEnabled(action, context),
      shortcut: action.shortcut,
      shortcutModifier: action.shortcutModifier,
    }));
  });

  createEffect(
    on(isVisible, (visible) => {
      if (visible) {
        const hostShadowRoot = containerRef?.getRootNode();
        const focusInsideHost =
          hostShadowRoot instanceof ShadowRoot ? hostShadowRoot.activeElement : null;
        const pageActiveElement = document.activeElement;
        const wasFocusedOnPage =
          pageActiveElement instanceof HTMLElement &&
          focusInsideHost === null &&
          !(containerRef instanceof Element && containerRef.contains(pageActiveElement));
        previouslyFocusedElement = wasFocusedOnPage ? pageActiveElement : null;
        menuContainerRef?.focus({ preventScroll: true });
        return;
      }
      menuStore.setActiveItem(null);
      const restoreTarget = previouslyFocusedElement;
      previouslyFocusedElement = null;
      if (!(restoreTarget instanceof HTMLElement) || !document.contains(restoreTarget)) return;
      nativeRequestAnimationFrame(() => {
        const currentActive = document.activeElement;
        const isOrphanedFocus = currentActive === null || currentActive === document.body;
        if (!isOrphanedFocus) return;
        restoreTarget.focus({ preventScroll: true });
      });
    }),
  );

  onMount(() => {
    measureContainer();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isVisible()) return;

      const isArrowDown = event.key === "ArrowDown";
      const isArrowUp = event.key === "ArrowUp";
      const isHome = event.key === "Home";
      const isEnd = event.key === "End";
      const isTab = event.key === "Tab";

      if (isArrowDown || isArrowUp || isHome || isEnd || isTab) {
        event.preventDefault();
        event.stopPropagation();
        const moveForward = isArrowDown || (isTab && !event.shiftKey);
        if (isHome) {
          menuStore.selectFirst();
        } else if (isEnd) {
          menuStore.selectLast();
        } else if (moveForward) {
          menuStore.selectNext();
        } else {
          menuStore.selectPrevious();
        }
        return;
      }

      const pluginActions = props.actions ?? [];
      const context = props.actionContext;

      const runActionIfAllowed = (action: ContextMenuAction) => {
        if (!context) return;
        if (!executeContextMenuAction(action, context)) return;
        event.preventDefault();
        event.stopPropagation();
        props.onHide();
      };

      if (event.key === "Enter") {
        const activeItem = menuStore.getActiveItem();
        if (activeItem) {
          event.preventDefault();
          event.stopPropagation();
          if (activeItem.isEnabled()) activeItem.onSelect();
          return;
        }
      }

      const shortcutAction = findShortcutAction(pluginActions, event, {
        includeModifierShortcuts: true,
      });
      if (shortcutAction) runActionIfAllowed(shortcutAction);
    };

    const unregisterOverlayDismiss = registerOverlayDismiss({
      isOpen: isVisible,
      onDismiss: props.onDismiss,
      shouldIgnoreRightClick: true,
    });
    const gatedHandleKeyDown = ignoreRealInput(handleKeyDown);
    window.addEventListener("keydown", gatedHandleKeyDown, { capture: true });

    onCleanup(() => {
      unregisterOverlayDismiss();
      window.removeEventListener("keydown", gatedHandleKeyDown, { capture: true });
    });
  });

  const accessibleMenuLabel = createMemo(() => {
    const { tagName, componentName } = tagDisplayResult();
    const displayName = componentName ? `${componentName}.${tagName}` : tagName;
    return `Actions for ${displayName}`;
  });

  const containerStyle = () => {
    const resolvedPosition = computedPosition();
    return [
      `top: ${resolvedPosition.top}px`,
      `left: ${resolvedPosition.left}px`,
      `z-index: ${Z_INDEX_OVERLAY}`,
      "pointer-events: auto",
    ].join("; ");
  };
</script>

{#if isVisible()}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions, a11y_no_noninteractive_element_interactions -->
  <div
    bind:this={containerRef}
    data-point-to-svelte-ignore-events
    data-point-to-svelte-context-menu
    class="fixed font-sans text-[13px] antialiased [filter:var(--sg-drop-shadow)] select-none"
    style={containerStyle()}
    onpointerdown={suppressMenuEvent}
    onmousedown={suppressMenuEvent}
    onclick={suppressMenuEvent}
    oncontextmenu={suppressMenuEvent}
  >
    <Arrow
      position={computedPosition().arrowPosition}
      leftPercent={0}
      leftOffsetPx={computedPosition().arrowLeft}
    />

    <MenuPanel class="justify-center items-start min-w-[100px]">
      <div class="contain-layout shrink-0 flex items-center gap-1 pt-1.5 pb-1 w-fit h-fit px-2">
        <TagBadge
          tagName={tagDisplayResult().tagName}
          componentName={tagDisplayResult().componentName}
          isClickable={props.hasFilePath}
          onClick={(event) => {
            event.stopPropagation();
            if (props.hasFilePath && props.actionContext) {
              const openAction = props.actions?.find((action) => action.id === "open");
              if (openAction) {
                executeContextMenuAction(openAction, props.actionContext);
              }
            }
          }}
          shrink
        />
      </div>
      <BottomSection>
        <MenuProvider store={menuStore}>
          <MenuList
            ref={(element) => (menuContainerRef = element)}
            label={accessibleMenuLabel()}
            class="w-[calc(100%+16px)] -mx-2 -my-1.5 outline-none"
          >
            {#each menuItems() as item (item.id)}
              <MenuItem
                value={item.id}
                dataId={item.label.toLowerCase()}
                disabled={!item.enabled}
                onSelect={() => {
                  item.action();
                  props.onHide();
                }}
              >
                <MenuItemLabel class="text-[var(--sg-text-primary)]" textContent={item.label} />
                {#if item.shortcut}
                  <MenuShortcut shortcut={item.shortcut} modifier={item.shortcutModifier} />
                {/if}
              </MenuItem>
            {/each}
          </MenuList>
        </MenuProvider>
      </BottomSection>
    </MenuPanel>
  </div>
{/if}
