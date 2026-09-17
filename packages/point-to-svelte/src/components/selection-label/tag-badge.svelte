<script lang="ts">
  import type { TagBadgeProps } from "../../types.js";
  import { cn } from "../../utils/cn.js";

  let {
    tagName,
    componentName,
    isClickable,
    onClick,
    onHoverChange,
    shrink = false,
  }: TagBadgeProps = $props();

  const accessibleName = $derived(componentName ? `${componentName}.${tagName}` : tagName);
</script>

{#snippet tagLabel()}
  <span
    class="text-[var(--sg-text-primary)] text-[13px] leading-4 h-fit font-medium overflow-hidden text-ellipsis whitespace-nowrap min-w-0"
  >
    {#if componentName}
      <span>{componentName}</span>
      <span class="text-[var(--sg-text-secondary)]">.{tagName}</span>
    {:else}
      <span class="text-[var(--sg-text-primary)]">{tagName}</span>
    {/if}
  </span>
{/snippet}

{#if isClickable}
  <button
    type="button"
    aria-label="Open source for {accessibleName}"
    class={cn(
      "contain-layout flex items-center gap-1 max-w-[280px] overflow-hidden cursor-pointer bg-transparent border-none p-0 m-0 text-left",
      shrink && "shrink-0",
    )}
    onmouseenter={() => onHoverChange?.(true)}
    onmouseleave={() => onHoverChange?.(false)}
    onclick={onClick}
  >
    {@render tagLabel()}
  </button>
{:else}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions, a11y_no_noninteractive_element_interactions -->
  <div
    class={cn(
      "contain-layout flex items-center gap-1 max-w-[280px] overflow-hidden",
      shrink && "shrink-0",
    )}
    onmouseenter={() => onHoverChange?.(true)}
    onmouseleave={() => onHoverChange?.(false)}
    onclick={onClick}
  >
    {@render tagLabel()}
  </div>
{/if}
