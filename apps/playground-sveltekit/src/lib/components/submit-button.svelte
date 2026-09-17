<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    label: string;
    variant?: "primary" | "ghost";
    icon?: Snippet;
    onclick?: () => void;
  }

  let { label, variant = "primary", icon, onclick }: Props = $props();
</script>

<button type="button" class="submit-button {variant}" {onclick}>
  {#if icon}
    <span class="icon">{@render icon()}</span>
  {/if}
  <span class="submit-button-label">{label}</span>
</button>

<style>
  .submit-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 9px;
    border: 1px solid transparent;
    padding: 9px 14px;
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 120ms ease, background-color 120ms ease;
  }

  .submit-button.primary {
    background: var(--accent);
    color: white;
  }

  .submit-button.primary:hover {
    background: #4338ca;
  }

  .submit-button.ghost {
    background: transparent;
    border-color: var(--line);
    color: var(--ink);
  }

  .submit-button:active {
    transform: scale(0.97);
  }

  .icon {
    display: inline-flex;
  }
</style>
