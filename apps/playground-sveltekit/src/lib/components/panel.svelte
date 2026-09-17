<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    title: string;
    description?: string;
    children: Snippet;
  }

  let { title, description, children }: Props = $props();
</script>

<section class="panel">
  <header>
    <h2 class="panel-title" data-testid="panel-title">{title}</h2>
    {#if description}
      <p class="panel-description">{description}</p>
    {/if}
  </header>
  <div class="panel-body">
    {@render children()}
  </div>
</section>

<style>
  .panel {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 18px 20px 20px;
    box-shadow: 0 1px 2px rgb(15 23 42 / 6%);
  }

  header {
    margin-bottom: 14px;
  }

  .panel-title {
    font-size: 17px;
    margin: 0 0 4px;
  }

  .panel-description {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.5;
  }

  .panel-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
</style>
