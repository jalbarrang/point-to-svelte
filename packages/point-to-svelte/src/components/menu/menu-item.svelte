<script lang="ts">
  import type { Snippet } from "svelte";
  import { onMount } from "svelte";
  import { cn } from "../../utils/cn.js";
  import { useMenuStore } from "./menu-context.js";

  interface Props {
    value: string;
    dataId?: string;
    role?: "menuitem" | "menuitemradio";
    disabled?: boolean;
    checked?: boolean;
    class?: string;
    onSelect?: () => void;
    children: Snippet;
  }

  let {
    value,
    dataId,
    role = "menuitem",
    disabled = false,
    checked = false,
    class: className,
    onSelect,
    children,
  }: Props = $props();

  const store = useMenuStore();
  const domId = store.createItemId();
  // svelte-ignore state_referenced_locally
  const registeredValue = value;

  let buttonElement = $state<HTMLButtonElement>();

  const isEnabled = (): boolean => !disabled;
  const isActive = (): boolean => store.activeValue() === registeredValue;

  onMount(() => {
    if (!buttonElement) return;
    store.registerItem({
      value: registeredValue,
      domId,
      element: buttonElement,
      isEnabled,
      onSelect: () => onSelect?.(),
    });
    return () => store.unregisterItem(registeredValue);
  });
</script>

<button
  bind:this={buttonElement}
  id={domId}
  data-point-to-svelte-ignore-events
  data-point-to-svelte-menu-item={dataId ?? registeredValue}
  type="button"
  {role}
  aria-checked={role === "menuitemradio" ? Boolean(checked) : undefined}
  aria-disabled={Boolean(disabled)}
  tabindex={store.keyboardNavigation ? (isActive() ? 0 : -1) : undefined}
  {disabled}
  class={cn(
    "relative z-1 contain-layout flex items-center justify-between w-full px-2 py-1 cursor-pointer text-left border-none bg-transparent disabled:opacity-40 disabled:cursor-default",
    className,
  )}
  onpointerdown={(event) => event.stopPropagation()}
  onpointerenter={() => {
    if (isEnabled() && store.canActivateOnHover()) store.setActiveItem(registeredValue);
  }}
  onpointerleave={() => {
    if (store.clearActiveOnPointerLeave) store.setActiveItem(null);
  }}
  onclick={(event) => {
    event.stopPropagation();
    if (!isEnabled()) return;
    onSelect?.();
  }}
>
  {@render children()}
</button>
