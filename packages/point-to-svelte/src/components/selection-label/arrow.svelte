<script lang="ts">
  import type { ArrowProps } from "../../types.js";
  import {
    PANEL_BACKGROUND,
    ARROW_TIP_RADIUS_PX,
    ARROW_PANEL_OVERLAP_PX,
  } from "../../constants.js";
  import { getArrowSize } from "../../utils/get-arrow-size.js";

  let { position, leftPercent, leftOffsetPx, labelWidth = 0 }: ArrowProps = $props();

  const isBottom = $derived(position === "bottom");
  const arrowSize = $derived(getArrowSize(labelWidth));
  const arrowWidth = $derived(arrowSize * 2);
  const arrowHeight = $derived(arrowSize);

  const tipPath = $derived.by(() => {
    const totalWidth = arrowWidth;
    const totalHeight = arrowHeight;
    const tangentOffset = ARROW_TIP_RADIUS_PX * Math.SQRT1_2;
    const halfWidth = totalWidth / 2;
    const baseY = isBottom ? totalHeight : 0;
    const tipY = isBottom ? tangentOffset : totalHeight - tangentOffset;
    const sweepFlag = isBottom ? 1 : 0;

    return `M0 ${baseY} L${halfWidth - tangentOffset} ${tipY} A${ARROW_TIP_RADIUS_PX} ${ARROW_TIP_RADIUS_PX} 0 0 ${sweepFlag} ${halfWidth + tangentOffset} ${tipY} L${totalWidth} ${baseY} Z`;
  });

  const arrowStyle = $derived(
    [
      `left: calc(${leftPercent}% + ${leftOffsetPx}px)`,
      isBottom ? "top: 0" : "bottom: 0",
      `transform: ${
        isBottom
          ? `translateX(-50%) translateY(calc(-100% + ${ARROW_PANEL_OVERLAP_PX}px))`
          : `translateX(-50%) translateY(calc(100% - ${ARROW_PANEL_OVERLAP_PX}px))`
      }`,
    ].join("; "),
  );
</script>

<svg
  data-point-to-svelte-arrow
  class="absolute block z-10"
  width={arrowWidth}
  height={arrowHeight}
  viewBox="0 0 {arrowWidth} {arrowHeight}"
  style={arrowStyle}
>
  <path d={tipPath} fill={PANEL_BACKGROUND} />
</svg>
