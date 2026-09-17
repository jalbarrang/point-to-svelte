<script lang="ts">
  import type { HierarchyState, DropdownAnchor } from "../../types.js";
  import {
    HIERARCHY_INDENT_PX,
    HIERARCHY_MENU_MIN_WIDTH_PX,
    MENU_HIGHLIGHT_CORNER_SHAPE,
    MENU_PANEL_CORNER_RADIUS_PX,
  } from "../../constants.js";
  import { MenuItem, MenuList, MenuPanel, MenuProvider, createMenuStore } from "../menu/index.js";
  import AnchoredDropdownSurface from "../ui/anchored-dropdown-surface.svelte";

  interface Props {
    position: DropdownAnchor | null;
    state?: HierarchyState;
  }

  let { position, state }: Props = $props();

  const activeIndex = $derived(state?.activeIndex ?? 0);

  const menuStore = createMenuStore({
    value: () => String(activeIndex),
    highlight: {
      topCornerRadiusPx: MENU_PANEL_CORNER_RADIUS_PX,
      bottomCornerRadiusPx: MENU_PANEL_CORNER_RADIUS_PX,
      cornerShape: MENU_HIGHLIGHT_CORNER_SHAPE,
    },
  });
</script>

<AnchoredDropdownSurface
  {position}
  dataAttribute="data-point-to-svelte-hierarchy-menu"
  interactive={false}
>
  <MenuPanel class="overflow-hidden" style={{ "min-width": `${HIERARCHY_MENU_MIN_WIDTH_PX}px` }}>
    <MenuProvider store={menuStore}>
      <MenuList label="Navigate element hierarchy">
        {#each state?.items ?? [] as item, itemIndex (itemIndex)}
          <MenuItem
            value={String(itemIndex)}
            role="menuitemradio"
            checked={itemIndex === activeIndex}
          >
            <span class="flex items-center min-w-0 w-full">
              {#if item.depth > 0}
                <span
                  aria-hidden="true"
                  class="shrink-0 font-mono text-[11px] leading-4 text-[var(--sg-text-secondary)] opacity-60 mr-1"
                  style="padding-left: {(item.depth - 1) * HIERARCHY_INDENT_PX}px"
                >
                  {item.isLast ? "└─" : "├─"}
                </span>
              {/if}
              <span
                class="text-[13px] leading-4 h-fit font-medium overflow-hidden text-ellipsis whitespace-nowrap min-w-0 transition-colors"
                class:text-[var(--sg-text-primary)]={itemIndex === activeIndex}
                class:text-[var(--sg-text-secondary)]={itemIndex !== activeIndex}
              >
                {#if item.componentName}
                  <span>{item.componentName}</span>
                  <span class="text-[var(--sg-text-secondary)]">.</span>
                {/if}
                <span>{item.tagName}</span>
              </span>
            </span>
          </MenuItem>
        {/each}
      </MenuList>
    </MenuProvider>
  </MenuPanel>
</AnchoredDropdownSurface>
