<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "../../utils/cn.js";
  import Surface from "../ui/surface.svelte";

  interface Props {
    class?: string;
    style?: string | Record<string, string | number>;
    children: Snippet;
  }

  let { class: className, style, children }: Props = $props();
</script>

<Surface class={cn("flex flex-col w-fit h-fit", className)} {style}>
  {@render children()}
</Surface>
