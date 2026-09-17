## General Rules

- MUST: Use pnpm. `pnpm install`, `pnpm build`, `pnpm typecheck`.
- MUST: Use TypeScript interfaces over types.
- MUST: Keep all types in the global scope.
- MUST: Use arrow functions over function declarations.
- MUST: Default to NO comments. Only add a comment when the user explicitly asks, or when the "why" is truly non-obvious - framework quirks, platform bugs, performance tradeoffs, fragile internal patching, or counter-intuitive design decisions. Never add comments that restate what the code does or what a well-named function/variable already conveys.
- MUST: Use kebab-case for files.
- MUST: Use descriptive names for variables (no shorthands or 1-2 character names).
- MUST: Do not type cast (`as`) unless absolutely necessary.
- MUST: Remove unused code and don't repeat yourself.
- MUST: Put all magic numbers in `constants.ts` using `SCREAMING_SNAKE_CASE` with unit suffixes (`_MS`, `_PX`).
- MUST: Put small, focused utility functions in `utils/` with one utility per file.

## Svelte Rules

- MUST: Treat the library as framework-agnostic DOM code. Only the source-resolution layer may know about Svelte.
- MUST: Read Svelte dev metadata (`__svelte_meta`) defensively. It is absent in production builds, absent on `{@html}` content, and only present from Svelte 5.35 for the ancestor `parent` chain. Every read must degrade to selector + HTML preview instead of throwing.
- MUST: Reach the DOM through `getComposedParentElement` (shadow roots, same-origin iframes) rather than `parentElement` directly.
- MUST: Keep hit testing, bounds, selectors and previews going through `getElementAdapter` so non-DOM renderers can opt in.
- NEVER: Import `svelte` or `svelte/internal/*` at runtime. The overlay must work in any app, and bundling a second Svelte runtime would be wrong.
- NEVER: Append overlay nodes inside the element SvelteKit hydrates. The host goes on `<body>`.

## About `__svelte_meta`

Each element compiled in dev mode carries:

```ts
element.__svelte_meta = {
  parent: {
    type: "component" | "if" | "each" | "await" | "key" | "render",
    file: "src/lib/components/todo-item.svelte", // file containing the tag/block
    line: 39,
    column: 6,          // 0-based
    componentTag: "TodoItem", // only for statically instantiated components
    parent: { ... },    // enclosing entry
  },
  loc: { file: "src/lib/components/todo-item.svelte", line: 15, column: 4 }, // 0-based column
};
```

Two consequences shape `core/context.ts`:

1. An entry's `file`/`line` describe **where the tag is written** (the parent file), while
   `componentTag` names the component being created. Frames therefore read
   `in TodoItem (at todo-list.svelte:39)`, matching React Grab's owner-stack shape.
2. The leading frame comes from `loc`, so the grabbed element gets its own exact file,
   line and column. Prefer it; it is the most precise information available anywhere in
   this codebase.

## Testing

Build before testing, and always run the checks:

```bash
pnpm build
pnpm typecheck
pnpm --filter point-to-svelte-playground typecheck
```

For anything touching selection or source resolution, verify in the playground
(`pnpm playground`, port 5199) rather than relying on unit tests: the diagnostics panel at
the bottom of the page resolves real DOM nodes, drives an activation + copy, and prints the
payload captured through the `onCopySuccess` plugin hook.
