<script lang="ts">
  import type { CompletionViewProps } from "../../types.js";
  import { FEEDBACK_DURATION_MS, FADE_DURATION_MS } from "../../constants.js";
  import { createConfirmationKeyboard } from "../../utils/create-confirmation-keyboard.js";
  import { isEventFromOverlay } from "../../utils/is-event-from-overlay.js";
  import IconReturn from "../icons/icon-return.svelte";
  import IconCheck from "../icons/icon-check.svelte";
  import Button from "../ui/button.svelte";
  import Surface from "../ui/surface.svelte";
  import MoreOptionsButton from "./more-options-button.svelte";

  let { statusText, onDismiss, onFadingChange, onShowContextMenu }: CompletionViewProps = $props();

  let fadeTimeoutId: number | undefined;
  let dismissTimeoutId: number | undefined;
  let didCopy = $state(false);
  let isFading = $state(false);

  const displayStatusText = $derived(didCopy ? "Copied" : statusText);

  const handleShowContextMenu = () => {
    if (fadeTimeoutId !== undefined) window.clearTimeout(fadeTimeoutId);
    if (dismissTimeoutId !== undefined) window.clearTimeout(dismissTimeoutId);
    isFading = true;
    onFadingChange?.(true);
    onShowContextMenu?.();
  };

  const handleAccept = () => {
    if (didCopy) return;
    didCopy = true;
    fadeTimeoutId = window.setTimeout(() => {
      isFading = true;
      onFadingChange?.(true);
      dismissTimeoutId = window.setTimeout(() => {
        onDismiss?.();
      }, FADE_DURATION_MS);
    }, FEEDBACK_DURATION_MS - FADE_DURATION_MS);
  };

  const { claimFocus } = createConfirmationKeyboard({
    onEnter: (event) => {
      if (isEventFromOverlay(event, "data-point-to-svelte-more-options")) {
        event.preventDefault();
        event.stopPropagation();
        handleShowContextMenu();
        return;
      }
      if (isEventFromOverlay(event, "data-point-to-svelte-context-menu")) return;
      event.preventDefault();
      event.stopPropagation();
      handleAccept();
    },
    onEscape: (event) => {
      event.preventDefault();
      event.stopPropagation();
      onDismiss?.();
    },
  });

  $effect(() => {
    return () => {
      if (fadeTimeoutId !== undefined) window.clearTimeout(fadeTimeoutId);
      if (dismissTimeoutId !== undefined) window.clearTimeout(dismissTimeoutId);
    };
  });
</script>

<Surface
  shape="pill"
  data-point-to-svelte-completion
  role="status"
  aria-live="polite"
  aria-atomic="true"
  class="shrink-0 flex flex-col justify-center items-end w-fit h-fit max-w-[280px] transition-opacity duration-100 ease-out"
  style="opacity: {isFading ? 0 : 1}"
  onpointerdown={claimFocus}
  onclick={claimFocus}
>
  {#if !didCopy && onDismiss}
    <div
      class="contain-layout shrink-0 flex items-center justify-between gap-2 pt-1.5 pb-1 px-2 w-full h-fit"
    >
      <span
        class="text-[var(--sg-text-primary)] text-[13px] leading-4 font-sans font-medium h-fit tabular-nums overflow-hidden text-ellipsis whitespace-nowrap min-w-0"
      >
        {displayStatusText}
      </span>
      <div class="contain-layout shrink-0 flex items-center gap-2 h-fit">
        {#if onShowContextMenu}
          <MoreOptionsButton onClick={handleShowContextMenu} />
        {/if}
        <Button
          data-point-to-svelte-dismiss
          class="gap-1"
          aria-keyshortcuts="Enter"
          onclick={handleAccept}
          disabled={didCopy}
          aria-disabled={didCopy}
        >
          <span class="text-[var(--sg-text-primary)] text-[13px] leading-3.5 font-sans font-medium">
            Keep
          </span>
          {#if !didCopy}
            <IconReturn size={10} class="text-[var(--sg-text-secondary)]" />
          {/if}
        </Button>
      </div>
    </div>
  {/if}
  {#if didCopy || !onDismiss}
    <div class="contain-layout shrink-0 flex items-center gap-0.5 py-1.5 px-2 w-full h-fit">
      <IconCheck size={14} aria-hidden="true" class="text-[var(--sg-text-primary-85)] shrink-0" />
      <span
        class="text-[var(--sg-text-primary)] text-[13px] leading-4 font-sans font-medium h-fit tabular-nums overflow-hidden text-ellipsis whitespace-nowrap min-w-0"
      >
        {displayStatusText}
      </span>
      {#if onShowContextMenu}
        <MoreOptionsButton onClick={handleShowContextMenu} />
      {/if}
    </div>
  {/if}
</Surface>
