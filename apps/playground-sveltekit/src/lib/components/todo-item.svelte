<script lang="ts">
  interface Props {
    text: string;
    done: boolean;
    ontoggle: () => void;
    onremove: () => void;
  }

  let { text, done, ontoggle, onremove }: Props = $props();
</script>

<li class="todo-item" class:done data-testid="todo-row">
  <label>
    <input type="checkbox" checked={done} onchange={ontoggle} />
    <span class="todo-text">{text}</span>
  </label>
  <button type="button" class="remove" onclick={onremove} aria-label="Remove {text}">
    Remove
  </button>
</li>

<style>
  .todo-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 9px;
    border: 1px solid var(--line);
  }

  .todo-item.done .todo-text {
    text-decoration: line-through;
    color: var(--muted);
  }

  label {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 14px;
  }

  .remove {
    border: none;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }

  .remove:hover {
    color: #dc2626;
  }
</style>
