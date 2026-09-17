<script lang="ts">
  import { page } from "$app/stores";

  let id = $derived($page.params.id);
</script>

<svelte:head>
  <title>Item {id}</title>
</svelte:head>

<h1 class="page-title">Item {id}</h1>
<p class="page-subtitle">
  A dynamic route, to check that source resolution still points at this file (and not the router) after
  client-side navigation.
</p>

<div class="card">
  <h2>Route details</h2>
  <dl>
    <dt>Route id</dt>
    <dd>{id}</dd>
    <dt>Rendered by</dt>
    <dd>+page.svelte</dd>
  </dl>
</div>

<style>
  .card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 18px 20px;
  }

  .card h2 {
    margin: 0 0 10px;
    font-size: 16px;
  }

  dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 6px 16px;
    margin: 0;
    font-size: 14px;
  }

  dt {
    color: var(--muted);
  }

  dd {
    margin: 0;
  }
</style>
