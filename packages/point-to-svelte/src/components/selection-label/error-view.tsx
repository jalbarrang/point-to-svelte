import { Show, type Component } from "solid-js";
import type { ErrorViewProps } from "../../types.js";
import { createConfirmationKeyboard } from "../../utils/create-confirmation-keyboard.js";
import { isEventFromOverlay } from "../../utils/is-event-from-overlay.js";
import { IconRetry } from "../icons/icon-retry.jsx";
import { Button } from "../ui/button.js";
import { BottomSection } from "./bottom-section.js";

export const ErrorView: Component<ErrorViewProps> = (props) => {
  const { claimFocus } = createConfirmationKeyboard({
    onEnter: (event) => {
      if (isEventFromOverlay(event, "data-point-to-svelte-error-ok")) {
        event.preventDefault();
        event.stopPropagation();
        props.onAcknowledge?.();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      props.onRetry?.();
    },
    onEscape: (event) => {
      event.preventDefault();
      event.stopPropagation();
      props.onAcknowledge?.();
    },
  });

  const hasActions = () => Boolean(props.onRetry || props.onAcknowledge);

  return (
    <div
      data-point-to-svelte-error
      role="alert"
      aria-live="assertive"
      class="contain-layout shrink-0 flex flex-col justify-center items-end w-fit h-fit max-w-[280px]"
      onPointerDown={claimFocus}
      onClick={claimFocus}
    >
      <div
        class="contain-layout shrink-0 flex items-start gap-1 px-2 w-full h-fit"
        classList={{ "pt-1.5 pb-1": hasActions(), "py-1.5": !hasActions() }}
      >
        <span
          class="text-[var(--sg-error-text)] text-[13px] leading-4 font-sans font-medium overflow-hidden line-clamp-5"
          title={props.error}
          textContent={props.error}
        />
      </div>
      <Show when={hasActions()}>
        <BottomSection>
          <div class="contain-layout shrink-0 flex items-center justify-end gap-[5px] w-full h-fit">
            <Show when={props.onRetry}>
              <Button
                data-point-to-svelte-retry
                class="gap-1"
                aria-keyshortcuts="Enter"
                onClick={props.onRetry}
              >
                <span class="text-[var(--sg-text-primary)] text-[13px] leading-3.5 font-sans font-medium">
                  Retry
                </span>
                <IconRetry size={10} aria-hidden="true" class="text-[var(--sg-text-secondary)]" />
              </Button>
            </Show>
            <Show when={props.onAcknowledge}>
              <Button
                data-point-to-svelte-error-ok
                class="gap-1"
                aria-keyshortcuts="Escape"
                onClick={props.onAcknowledge}
              >
                <span class="text-[var(--sg-text-primary)] text-[13px] leading-3.5 font-sans font-medium">
                  Ok
                </span>
              </Button>
            </Show>
          </div>
        </BottomSection>
      </Show>
    </div>
  );
};
