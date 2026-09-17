<script lang="ts">
  import type { ContextMenuAction, DropdownAnchor } from "../../types.js";
  import {
    MENU_HIGHLIGHT_CORNER_SHAPE,
    MENU_PANEL_CORNER_RADIUS_PX,
    TOOLBAR_MENU_MIN_WIDTH_PX,
  } from "../../constants.js";
  import {
    MenuItem,
    MenuItemLabel,
    MenuList,
    MenuPanel,
    MenuProvider,
    MenuShortcut,
    createMenuStore,
  } from "../menu/index.js";
  import AnchoredDropdownSurface from "../ui/anchored-dropdown-surface.svelte";

  interface Props {
    position: DropdownAnchor | null;
    actions: ContextMenuAction[];
    defaultActionId: string;
    onSetDefaultAction: (actionId: string) => void;
    onDismiss: () => void;
  }

  let { position, actions, defaultActionId, onSetDefaultAction, onDismiss }: Props = $props();

  const menuStore = createMenuStore({
    clearActiveOnPointerLeave: true,
    highlight: {
      topCornerRadiusPx: MENU_PANEL_CORNER_RADIUS_PX,
      bottomCornerRadiusPx: MENU_PANEL_CORNER_RADIUS_PX,
      cornerShape: MENU_HIGHLIGHT_CORNER_SHAPE,
    },
  });
</script>

<AnchoredDropdownSurface {position} dataAttribute="data-point-to-svelte-toolbar-menu" {onDismiss}>
  <MenuPanel class="overflow-hidden" style={{ "min-width": `${TOOLBAR_MENU_MIN_WIDTH_PX}px` }}>
    <MenuProvider store={menuStore}>
      <MenuList label="Default action">
        {#each actions as action (action.id)}
          <MenuItem
            value={action.id}
            role="menuitemradio"
            checked={action.id === defaultActionId}
            onSelect={() => {
              onSetDefaultAction(action.id);
              onDismiss();
            }}
          >
            <MenuItemLabel
              class={action.id === defaultActionId
                ? "text-[var(--sg-text-primary)]"
                : "text-[var(--sg-text-secondary)]"}
              textContent={action.label}
            />
            {#if action.shortcut}
              <MenuShortcut shortcut={action.shortcut} modifier={action.shortcutModifier} />
            {/if}
          </MenuItem>
        {/each}
      </MenuList>
    </MenuProvider>
  </MenuPanel>
</AnchoredDropdownSurface>
