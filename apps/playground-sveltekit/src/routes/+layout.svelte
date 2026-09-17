<script lang="ts">
  import "../app.css";

  let { children } = $props();
</script>

<header class="site-header">
  <a class="brand" href="/">point-to-svelte playground</a>
  <nav>
    <a href="/">Overview</a>
    <a href="/items/42">Dynamic route</a>
  </nav>
</header>

<main class="page">
  {@render children?.()}
</main>

<style>
  .site-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 24px;
    border-bottom: 1px solid var(--line);
    background: var(--surface);
  }

  .brand {
    font-weight: 700;
    color: var(--ink);
    text-decoration: none;
    letter-spacing: -0.01em;
  }

  nav {
    display: flex;
    gap: 14px;
  }

  nav a {
    color: var(--muted);
    text-decoration: none;
    font-size: 14px;
  }

  nav a:hover {
    color: var(--accent);
  }
</style>
