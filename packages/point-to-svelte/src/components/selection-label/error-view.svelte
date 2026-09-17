<script lang="ts">
  import type { ErrorViewProps } from "../../types.js";
  import { createConfirmationKeyboard } from "../../utils/create-confirmation-keyboard.js";
  import { isEventFromOverlay } from "../../utils/is-event-from-overlay.js";
  import IconRetry from "../icons/icon-retry.svelte";
  import Button from "../ui/button.svelte";
  import BottomSection from "./bottom-section.svelte";

  let { error, onAcknowledge, onRetry }: ErrorViewProps = $props();

  const { claimFocus } = createConfirmationKeyboard({
    onEnter: (event) => {
      if (isEventFromOverlay(event, "data-point-to-svelte-error-ok")) {
        event.preventDefault();
        event.stopPropagation();
        onAcknowledge?.();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onRetry?.();
    },
    onEscape: (event) => {
      event.preventDefault();
      event.stopPropagation();
      onAcknowledge?.();
    },
  });

  const hasActions = $derived(Boolean(onRetry || onAcknowledge));
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions, a11y_no_noninteractive_element_interactions -->
<div
  data-point-to-svelte-error
  role="alert"
  aria-live="assertive"
  class="contain-layout shrink-0 flex flex-col justify-center items-end w-fit h-fit max-w-[280px]"
  onpointerdown={claimFocus}
  onclick={claimFocus}
>
  <div
    class="contain-layout shrink-0 flex items-start gap-1 px-2 w-full h-fit"
    class:pt-1.5={hasActions}
    class:pb-1={hasActions}
    class:py-1.5={!hasActions}
  >
    <span
      class="text-[var(--sg-error-text)] text-[13px] leading-4 font-sans font-medium overflow-hidden line-clamp-5"
      title={error}
    >
      {error}
    </span>
  </div>
  {#if hasActions}
    <BottomSection>
      <div class="contain-layout shrink-0 flex items-center justify-end gap-[5px] w-full h-fit">
        {#if onRetry}
          <Button data-point-to-svelte-retry class="gap-1" aria-keyshortcuts="Enter" onclick={onRetry}>
            <span
              class="text-[var(--sg-text-primary)] text-[13px] leading-3.5 font-sans font-medium"
            >
              Retry
            </span>
            <IconRetry size={10} aria-hidden="true" class="text-[var(--sg-text-secondary)]" />
          </Button>
        {/if}
        {#if onAcknowledge}
          <Button
            data-point-to-svelte-error-ok
            class="gap-1"
            aria-keyshortcuts="Escape"
            onclick={onAcknowledge}
          >
            <span
              class="text-[var(--sg-text-primary)] text-[13px] leading-3.5 font-sans font-medium"
            >
              Ok
            </span>
          </Button>
        {/if}
      </div>
    </BottomSection>
  {/if}
</div>
