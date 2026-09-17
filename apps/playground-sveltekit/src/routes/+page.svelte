<script lang="ts">
  import Panel from "$lib/components/panel.svelte";
  import SubmitButton from "$lib/components/submit-button.svelte";
  import TodoList from "$lib/components/todo-list.svelte";
  import ExampleDialog from "$lib/components/example-dialog.svelte";
  import SourceInspector from "$lib/components/source-inspector.svelte";

  let status = $state("idle");
  let isDialogOpen = $state(false);
  let clickCount = $state(0);

  const submit = () => {
    clickCount += 1;
    status = `submitted ${clickCount}×`;
  };
</script>

<svelte:head>
  <title>point-to-svelte playground</title>
</svelte:head>

<h1 class="page-title">point-to-svelte playground</h1>
<p class="page-subtitle">
  Activate the toolbar (or hold <kbd>⌘</kbd>/<kbd>Ctrl</kbd> and press <kbd>C</kbd>), hover any element and
  grab it. The copied context should name the component that owns the element and point at the exact
  <code>.svelte</code> file and line.
</p>

<Panel title="Account form" description="Nested components: page → panel → form → button.">
  <form
    class="account-form"
    onsubmit={(event) => {
      event.preventDefault();
      submit();
    }}
  >
    <label>
      Email
      <input type="email" name="email" placeholder="you@example.com" />
    </label>
    <label>
      Password
      <input type="password" name="password" placeholder="••••••••" />
    </label>
    <div class="row">
      <SubmitButton label="Sign in" onclick={submit}>
        {#snippet icon()}
          <span aria-hidden="true">→</span>
        {/snippet}
      </SubmitButton>
      <SubmitButton label="Forgot your password?" variant="ghost" />
      <span class="status" data-testid="submit-status">{status}</span>
    </div>
  </form>
</Panel>

<Panel title="Todo list" description="A keyed each block: every row shares one source line, so list items must be told apart by DOM position.">
  <TodoList />
</Panel>

<Panel title="Animation freeze" description="Deactivate the overlay to see these move; while it is active they should stand still.">
  <div class="row">
    <span class="pill animated-pill">drift</span>
    <span class="pulse" style="animation: pulse 1.2s ease-in-out infinite">pulse</span>
  </div>
</Panel>

<Panel title="Overlays" description="A modal rendered from a separate component, to check hit testing and stacking.">
  <div class="row">
    <button type="button" onclick={() => (isDialogOpen = true)}>Open dialog</button>
    <a href="/items/42">Go to a dynamic route</a>
  </div>
</Panel>

<ExampleDialog open={isDialogOpen} onclose={() => (isDialogOpen = false)} />

<SourceInspector />

<style>
  .account-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 420px;
  }

  .account-form label {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 13px;
    color: var(--muted);
  }

  .account-form input {
    font: inherit;
    font-size: 14px;
    color: var(--ink);
    padding: 8px 10px;
    border-radius: 9px;
    border: 1px solid var(--line);
  }

  .status {
    font-size: 13px;
    color: var(--muted);
  }

  .pill,
  .pulse {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 600;
    background: #eef2ff;
    color: var(--accent);
  }

  button {
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    padding: 9px 14px;
    border-radius: 9px;
    border: 1px solid var(--line);
    background: var(--surface);
    cursor: pointer;
  }

  kbd {
    font-family: ui-monospace, monospace;
    font-size: 12px;
    border: 1px solid var(--line);
    border-radius: 5px;
    padding: 1px 5px;
    background: var(--surface);
  }

  code {
    font-family: ui-monospace, monospace;
    font-size: 13px;
  }
</style>
