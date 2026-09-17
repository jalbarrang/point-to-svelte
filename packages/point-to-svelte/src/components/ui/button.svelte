<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "../../utils/cn.js";
  import { buttonVariants } from "./button-variants.js";

  interface Props {
    variant?: "chip" | "destructive" | "ghost";
    class?: string;
    type?: "button" | "submit" | "reset";
    children?: Snippet;
    [key: string]: unknown;
  }

  let { variant, class: className, type = "button", children, ...rest }: Props = $props();
</script>

<button {type} class={cn(buttonVariants({ variant }), className)} {...rest}>
  {@render children?.()}
</button>
