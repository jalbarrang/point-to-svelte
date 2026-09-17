<script lang="ts">
  import type { SelectionLabelInstance, SvelteGrabRendererProps } from "../types.js";
  import { DEFAULT_ACTION_ID } from "../constants.js";
  import { isElementConnected } from "../utils/is-element-connected.js";
  import OverlayCanvas from "./overlay-canvas.svelte";
  import FrozenGlow from "./frozen-glow.svelte";
  import SelectionLabel from "./selection-label/index.svelte";
  import Toolbar from "./toolbar/index.svelte";
  import ContextMenu from "./context-menu.svelte";
  import ToolbarMenu from "./toolbar/toolbar-menu.svelte";
  import HierarchyMenu from "./toolbar/hierarchy-menu.svelte";

  let props: SvelteGrabRendererProps = $props();

  const resolveInstanceContextMenuHandler = (
    instance: SelectionLabelInstance,
  ): (() => void) | undefined => {
    const hasCompletedStatus = instance.status === "copied" || instance.status === "fading";
    if (!hasCompletedStatus || !isElementConnected(instance.element)) {
      return undefined;
    }
    return () => props.onShowContextMenuInstance?.(instance.id);
  };
</script>

<OverlayCanvas
  selectionVisible={props.selectionVisible?.()}
  selectionBounds={props.selectionBounds?.()}
  selectionBoundsMultiple={props.selectionBoundsMultiple?.()}
  selectionShouldSnap={props.selectionShouldSnap?.()}
  dragVisible={props.dragVisible?.()}
  dragBounds={props.dragBounds?.()}
  grabbedBoxes={props.grabbedBoxes?.()}
  labelInstances={props.labelInstances?.()}
/>
<FrozenGlow visible={props.isFrozen?.() ?? false} />
{#if props.selectionLabelVisible?.() && (props.frozenLabelEntryAccessors?.().length ?? 0) > 0}
  {#each props.frozenLabelEntryAccessors?.() ?? [] as entryAccessor, entryIndex (entryIndex)}
    {#if entryAccessor.read()}
      {@const entry = entryAccessor.read()}
      {#if entry}
        <SelectionLabel
          tagName={entry.tagName}
          componentName={entry.componentName}
          selectionBounds={entry.bounds}
          mouseX={entry.mouseX}
          visible={true}
        />
      {/if}
    {/if}
  {/each}
{/if}
{#if props.selectionLabelVisible?.() && props.pendingShiftPreviewEntry?.()}
  {@const pendingEntry = props.pendingShiftPreviewEntry?.()}
  {#if pendingEntry}
    <SelectionLabel
      tagName={pendingEntry.tagName}
      componentName={pendingEntry.componentName}
      selectionBounds={pendingEntry.bounds}
      mouseX={pendingEntry.mouseX}
      visible={true}
    />
  {/if}
{/if}
{#if props.selectionLabelVisible?.() && props.selectionBounds?.() && (props.frozenLabelEntryAccessors?.().length ?? 0) === 0}
  <SelectionLabel
    tagName={props.selectionTagName?.()}
    componentName={props.selectionComponentName?.()}
    elementsCount={props.selectionElementsCount?.()}
    selectionBounds={props.selectionBounds?.()}
    mouseX={props.mouseX?.()}
    visible={props.selectionLabelVisible?.() ?? false}
    isPromptMode={props.isPromptMode?.()}
    inputValue={props.inputValue?.()}
    status={props.selectionLabelStatus}
    filePath={props.selectionFilePath?.()}
    onInputChange={props.onInputChange}
    onSubmit={props.onInputSubmit}
    selectionLabelShakeCount={props.selectionLabelShakeCount?.()}
    onConfirmDismiss={props.onConfirmDismiss}
    discardPrompt={props.discardPrompt?.()}
    onOpen={props.onOpenSelectionFile}
  />
{/if}
{#each props.labelInstanceAccessors?.() ?? [] as instanceAccessor, instanceIndex (instanceIndex)}
  {#if instanceAccessor.read()}
    {@const instance = instanceAccessor.read()}
    {#if instance}
      <SelectionLabel
        tagName={instance.tagName}
        componentName={instance.componentName}
        elementsCount={instance.elementsCount}
        selectionBounds={instance.bounds}
        mouseX={instance.mouseX}
        visible={true}
        status={instance.status}
        statusText={instance.statusText}
        isPromptMode={instance.isPromptMode}
        inputValue={instance.inputValue}
        error={instance.errorMessage}
        hideArrow={instance.hideArrow}
        onShowContextMenu={resolveInstanceContextMenuHandler(instance)}
        onRetry={() => props.onRetryInstance?.(instance.id)}
        onAcknowledgeError={() => props.onAcknowledgeErrorInstance?.(instance.id)}
        onHoverChange={(isHovered) => props.onLabelInstanceHoverChange?.(instance.id, isHovered)}
      />
    {/if}
  {/if}
{/each}
{#if props.toolbarVisible?.() !== false}
  <Toolbar
    isActive={props.isActive?.()}
    isContextMenuOpen={props.contextMenuPosition?.() !== null}
    onToggle={props.onToggleActive}
    activeActionId={props.activeActionId?.()}
    defaultActionId={props.defaultActionId?.()}
    defaultActionLabel={props.defaultActionLabel?.()}
    enabled={props.enabled?.()}
    shakeCount={props.shakeCount?.()}
    onStateChange={props.onToolbarStateChange}
    onSubscribeToStateChanges={props.onSubscribeToToolbarStateChanges}
    onSelectHoverChange={props.onToolbarSelectHoverChange}
    onContainerRef={props.onToolbarRef}
    onToggleToolbarMenu={props.onToggleToolbarMenu}
  />
{/if}
<ContextMenu
  position={props.contextMenuPosition?.() ?? null}
  selectionBounds={props.contextMenuBounds?.() ?? null}
  tagName={props.contextMenuTagName?.()}
  componentName={props.contextMenuComponentName?.()}
  hasFilePath={props.contextMenuHasFilePath?.() ?? false}
  actions={props.actions?.()}
  actionContext={props.actionContext?.()}
  onDismiss={props.onContextMenuDismiss ?? (() => {})}
  onHide={props.onContextMenuHide ?? (() => {})}
/>
<ToolbarMenu
  position={props.toolbarMenuPosition?.() ?? null}
  actions={props.toolbarMenuActions?.() ?? []}
  defaultActionId={props.defaultActionId?.() ?? DEFAULT_ACTION_ID}
  onSetDefaultAction={props.onSetDefaultAction ?? (() => {})}
  onDismiss={props.onToolbarMenuDismiss ?? (() => {})}
/>
<HierarchyMenu position={props.hierarchyMenuPosition?.() ?? null} state={props.hierarchyState?.()} />
