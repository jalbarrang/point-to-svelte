<script lang="ts">
  interface Props {
    size?: number;
    class?: string;
  }

  let { size = 16, class: className }: Props = $props();

  const animationDelaysMs = [0, -42, -83, -125, -167, -208, -250, -292, -333, -375, -417, -458];
  const animationPaths = [
    "M12 2v4",
    "M15 6.8l2-3.5",
    "M17.2 9l3.5-2",
    "M18 12h4",
    "M17.2 15l3.5 2",
    "M15 17.2l2 3.5",
    "M12 18v4",
    "M9 17.2l-2 3.5",
    "M6.8 15l-3.5 2",
    "M2 12h4",
    "M6.8 9l-3.5-2",
    "M9 6.8l-2-3.5",
  ];
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  class={className}
>
  {#each animationPaths as path, index (path)}
    <path class="icon-loader-bar" style="animation-delay: {animationDelaysMs[index]}ms" d={path} />
  {/each}
</svg>
