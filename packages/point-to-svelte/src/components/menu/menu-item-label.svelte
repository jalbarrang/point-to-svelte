<script lang="ts">
  import { cn } from "../../utils/cn.js";

  interface Props {
    class?: string;
    textContent: string;
  }

  let { class: className, textContent }: Props = $props();
</script>

<span class={cn("text-[13px] leading-4 font-sans font-medium", className)}>{textContent}</span>
