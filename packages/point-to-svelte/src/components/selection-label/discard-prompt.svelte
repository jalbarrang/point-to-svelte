<script lang="ts">
  import type { DiscardPromptProps } from "../../types.js";
  import { createConfirmationKeyboard } from "../../utils/create-confirmation-keyboard.js";
  import IconReturn from "../icons/icon-return.svelte";
  import Button from "../ui/button.svelte";
  import BottomSection from "./bottom-section.svelte";

  let {
    label,
    showCancel = true,
    cancelOnEscape = false,
    onConfirm,
    onCancel,
    onCopy,
  }: DiscardPromptProps = $props();

  const { claimFocus } = createConfirmationKeyboard({
    onEnter: (event) => {
      event.preventDefault();
      event.stopPropagation();
      const target = event.composedPath()[0];
      const targetElement = target instanceof HTMLElement ? target : null;
      if (targetElement?.closest("[data-point-to-svelte-discard-copy]")) {
        onCopy?.();
        return;
      }
      if (targetElement?.closest("[data-point-to-svelte-discard-no]")) {
        onCancel?.();
        return;
      }
      onConfirm?.();
    },
    onEscape: (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (cancelOnEscape) {
        onCancel?.();
      } else {
        onConfirm?.();
      }
    },
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions, a11y_no_noninteractive_element_interactions -->
<div
  data-point-to-svelte-discard-prompt
  class="contain-layout shrink-0 flex flex-col justify-center items-end w-fit h-fit"
  onpointerdown={claimFocus}
  onclick={claimFocus}
>
  <div class="contain-layout shrink-0 flex items-center gap-1 pt-1.5 pb-1 px-2 w-full h-fit">
    <span
      class="text-[var(--sg-text-primary)] text-[13px] leading-4 shrink-0 font-sans font-medium w-fit h-fit"
    >
      {label ?? "Discard?"}
    </span>
  </div>
  <BottomSection>
    <div class="contain-layout shrink-0 flex items-center justify-end gap-[5px] w-full h-fit">
      {#if showCancel}
        <Button data-point-to-svelte-discard-no onclick={onCancel}>
          <span class="text-[var(--sg-text-primary)] text-[13px] leading-3.5 font-sans font-medium">
            No
          </span>
        </Button>
      {/if}
      {#if onCopy}
        <Button data-point-to-svelte-discard-copy onclick={onCopy}>
          <span class="text-[var(--sg-text-primary)] text-[13px] leading-3.5 font-sans font-medium">
            Copy
          </span>
        </Button>
      {/if}
      <Button
        variant="destructive"
        class="gap-0.5"
        data-point-to-svelte-discard-yes
        onclick={onConfirm}
      >
        <span class="text-[var(--sg-error-text)] text-[13px] leading-3.5 font-sans font-medium">
          Yes
        </span>
        <IconReturn size={10} class="text-[var(--sg-error-text)] opacity-50" />
      </Button>
    </div>
  </BottomSection>
</div>
