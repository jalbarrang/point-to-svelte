<script lang="ts">
  import type { Snippet } from "svelte";
  import Tooltip from "../tooltip.svelte";

  interface Props {
    actionId: string;
    label: string;
    isActive?: boolean;
    isToggle?: boolean;
    class?: string;
    wrapperClass?: string;
    ref?: (element: HTMLButtonElement) => void;
    onClick?: (event: MouseEvent) => void;
    onContextMenu?: (event: MouseEvent) => void;
    onMouseEnter?: (event: MouseEvent) => void;
    onMouseLeave?: (event: MouseEvent) => void;
    icon: Snippet;
    tooltip?: string;
    tooltipVisible?: boolean;
    tooltipPosition?: "top" | "bottom" | "left" | "right";
  }

  let {
    actionId,
    label,
    isActive = false,
    isToggle = false,
    class: className,
    wrapperClass,
    ref: onRef,
    onClick,
    onContextMenu,
    onMouseEnter,
    onMouseLeave,
    icon,
    tooltip,
    tooltipVisible = false,
    tooltipPosition = "top",
  }: Props = $props();

  let buttonElement = $state<HTMLButtonElement>();

  $effect(() => {
    if (buttonElement) onRef?.(buttonElement);
  });
</script>

<div class={wrapperClass}>
  <button
    bind:this={buttonElement}
    data-point-to-svelte-ignore-events
    data-point-to-svelte-toolbar-toggle={isToggle ? "" : undefined}
    data-point-to-svelte-toolbar-action={actionId}
    aria-label={label}
    aria-pressed={Boolean(isActive)}
    type="button"
    class={className}
    onclick={onClick}
    oncontextmenu={(event) => onContextMenu?.(event)}
    onmouseenter={onMouseEnter}
    onmouseleave={onMouseLeave}
  >
    {@render icon()}
  </button>
  {#if tooltip}
    <Tooltip visible={tooltipVisible} position={tooltipPosition} textContent={tooltip} />
  {/if}
</div>
