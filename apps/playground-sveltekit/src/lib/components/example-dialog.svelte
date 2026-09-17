<script lang="ts">
  interface Props {
    open: boolean;
    onclose: () => void;
  }

  let { open, onclose }: Props = $props();
</script>

{#if open}
  <!-- Clicking the backdrop closes the dialog; the keyboard equivalent is the
       Close button. Svelte's a11y rules flag the click handler either way. -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="backdrop" role="presentation" onclick={onclose}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="dialog" role="dialog" tabindex="-1" aria-modal="true" aria-label="Example dialog" onclick={(event) => event.stopPropagation()}>
      <h3>Modal dialog</h3>
      <p>
        Fixed-position content is a good hit-testing check: grabbing inside the dialog must select the
        dialog's own elements, not the page behind it.
      </p>
      <button type="button" onclick={onclose}>Close</button>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgb(15 23 42 / 45%);
    display: grid;
    place-items: center;
    z-index: 50;
  }

  .dialog {
    background: var(--surface);
    border-radius: 14px;
    padding: 20px 22px;
    max-width: 380px;
    box-shadow: 0 20px 40px rgb(15 23 42 / 25%);
  }

  .dialog h3 {
    margin: 0 0 8px;
  }

  .dialog p {
    color: var(--muted);
    font-size: 14px;
    line-height: 1.55;
  }

  .dialog button {
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    padding: 8px 12px;
    border-radius: 9px;
    border: 1px solid var(--line);
    background: var(--surface);
    cursor: pointer;
  }
</style>
