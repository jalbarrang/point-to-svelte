<script lang="ts">
  import TodoItem from "./todo-item.svelte";

  interface Todo {
    id: string;
    text: string;
    done: boolean;
  }

  let todos = $state<Todo[]>([
    { id: "milk", text: "Buy oat milk", done: false },
    { id: "tests", text: "Write the missing tests", done: true },
    { id: "grab", text: "Grab a Svelte component", done: false },
  ]);

  let newTodoText = $state("");
  let remainingCount = $derived(todos.filter((todo) => !todo.done).length);

  const addTodo = () => {
    const text = newTodoText.trim();
    if (!text) return;
    todos.push({ id: crypto.randomUUID(), text, done: false });
    newTodoText = "";
  };

  const removeTodo = (id: string) => {
    todos = todos.filter((todo) => todo.id !== id);
  };
</script>

<div class="todo-list">
  <p class="summary">
    {remainingCount}
    {remainingCount === 1 ? "item" : "items"} left
  </p>

  <ul>
    {#each todos as todo (todo.id)}
      <TodoItem
        text={todo.text}
        done={todo.done}
        ontoggle={() => (todo.done = !todo.done)}
        onremove={() => removeTodo(todo.id)}
      />
    {/each}
  </ul>

  {#if todos.length === 0}
    <p class="empty">Nothing left to do.</p>
  {/if}

  <form
    class="add"
    onsubmit={(event) => {
      event.preventDefault();
      addTodo();
    }}
  >
    <input type="text" placeholder="Add a task" bind:value={newTodoText} />
    <button type="submit">Add task</button>
  </form>
</div>

<style>
  .todo-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .summary,
  .empty {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
  }

  ul {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
  }

  .add {
    display: flex;
    gap: 8px;
  }

  .add input {
    flex: 1;
    font: inherit;
    font-size: 14px;
    padding: 8px 10px;
    border-radius: 9px;
    border: 1px solid var(--line);
  }

  .add button {
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
