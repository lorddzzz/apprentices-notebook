<script lang="ts">
  import { type Snippet, untrack } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import { PAPER } from '$data/tuning';
  import { type Coord, key, latticeLabel, parseLatticeKey } from '$engine';
  import { type CellBounds, pageBounds } from '$engine/page';
  import { cellTabStop, editAt, editCell, framePage, panView, rememberView, renderedCells, resizeView, screenToCell, sessionView, type ViewTransform, visibleWindow, worldToScreen } from '../../../app/latticeViewport';
  import { latticePan } from '../../attach/latticePan';

  interface Props {
    sessionKey: string;
    readonly?: boolean;
    occupied: readonly Coord[];
    onCellTap: (at: Coord) => void;
    onCellHold: (at: Coord) => void;
    cell: Snippet<[Coord]>;
    overlay?: Snippet<[CellBounds]>;
    cellLabel?: (at: Coord) => string;
  }
  let { sessionKey, readonly = false, occupied, onCellTap, onCellHold, cell, overlay, cellLabel = latticeLabel }: Props = $props();
  let surface = $state<HTMLDivElement>();
  let width = $state(0);
  let height = $state(0);
  let loadedKey = $state<string | null>(null);
  let view = $state<ViewTransform>(framePage([], { width: 300, height: 300 }));
  const size = $derived({ width, height });
  const cells = $derived(renderedCells(view, size, occupied));
  const bounds = $derived(view.mode === 'fit' ? pageBounds(occupied) : visibleWindow(view, size));
  const origin = $derived(worldToScreen(view, bounds.origin));
  function update(next: ViewTransform): void { view = next; rememberView(sessionKey, next, size); }
  $effect(() => {
    if (width > 0 && height > 0 && loadedKey !== sessionKey) {
      view = untrack(() => sessionView(sessionKey, occupied, size));
      loadedKey = sessionKey;
    }
  });
  const measure: Attachment<HTMLElement> = el => {
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const previous = { width, height };
      width = entry.contentRect.width; height = entry.contentRect.height;
      if (previous.width > 0 && previous.height > 0 && loadedKey === sessionKey)
        update(view.mode === 'fit' ? framePage(occupied, { width, height }, true) : resizeView(view, previous, { width, height }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  };
  function point(client: Coord): Coord {
    if (!surface) return client;
    const rect = surface.getBoundingClientRect();
    return { x: client.x - rect.left, y: client.y - rect.top };
  }
  function activate(at: Coord): void {
    if (view.mode === 'fit') {
      update(editCell(at, size));

    }
    else if (!readonly) onCellTap(at);
  }
  const gestures = latticePan({
    onPan: delta => update(panView(view, delta)),
    onTap: client => {
      const hit = view.mode === 'fit' ? surface?.ownerDocument.elementFromPoint(client.x, client.y)?.closest<HTMLElement>('[data-at]') : null;
      const at = hit && surface?.contains(hit) && hit.dataset.at ? parseLatticeKey(hit.dataset.at) : screenToCell(view, point(client));
      activate(at);
    },
    onHold: client => { if (!readonly && view.mode === 'edit') onCellHold(screenToCell(view, point(client))); },
  });
</script>

<div class="paper-viewport" data-testid="lattice-viewport" data-mode={view.mode}>
  <div class="paper-controls">
    <button type="button" onclick={() => update(framePage(occupied, size, true))}>Fit</button>
    <button type="button" onclick={() => update(editAt(view, { x: width / 2, y: height / 2 }, size))}>{readonly ? 'Read scale' : 'Edit scale'}</button>
    {#if view.mode === 'fit'}<span>Tap a region to {readonly ? 'read' : 'edit'}</span>{/if}
  </div>
  {#key sessionKey}
  <div class="paper-surface" bind:this={surface} {@attach measure} {@attach gestures}>
    {#each cells as at (key(at))}
      {@const p = worldToScreen(view, at)}
      {@const marker = view.mode === 'fit' && view.pitch < PAPER.fitMarkerSize}
      <button type="button" class="paper-cell" class:overview-marker={marker} data-at={key(at)} aria-label={cellLabel(at)} tabindex={cellTabStop(view, at, size) ? 0 : -1}
        style:left={`${p.x + (marker ? (view.pitch - PAPER.fitMarkerSize) / 2 : 0)}px`} style:top={`${p.y + (marker ? (view.pitch - PAPER.fitMarkerSize) / 2 : 0)}px`} style:width={`${marker ? PAPER.fitMarkerSize : view.pitch}px`} style:height={`${marker ? PAPER.fitMarkerSize : view.pitch}px`}
        onclick={e => { if (e.detail === 0) activate(at); }}>
        <span class="paper-content" style:transform={`scale(${view.pitch / PAPER.editPitch})`}>
          {@render cell(at)}
        </span>
      </button>
    {/each}
    {#if overlay}
      <div class="paper-overlay" style:left={`${origin.x}px`} style:top={`${origin.y}px`}
        style:width={`${bounds.width * view.pitch}px`} style:height={`${bounds.height * view.pitch}px`}>
        {@render overlay(bounds)}
      </div>
    {/if}
  </div>
  {/key}
</div>

<style>
  .paper-viewport { width: 100%; min-width: 0; min-height: 0; height: var(--lattice-viewport-height, auto); display: flex; flex-direction: column; }
  .paper-controls { flex: none; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; padding-block: 0.4rem; padding-right: var(--lattice-controls-reserve, 0px); box-sizing: border-box; }
  .paper-controls button { min-width: var(--tap, 44px); min-height: 44px; padding: 0 var(--space-3, 12px); border: 2px solid var(--line); border-radius: var(--radius); background: var(--parchment); color: var(--ink); font-size: 16px; cursor: pointer; }
  .paper-controls button:active { transform: translateY(1px); filter: brightness(1.15); }
  .paper-controls button:focus-visible { outline: 3px solid var(--select); outline-offset: 2px; }
  .paper-controls span { font-size: 0.8rem; }
  .paper-surface { position: relative; width: 100%; height: var(--lattice-surface-height, min(52vh, 420px)); min-height: var(--lattice-surface-min-height, 240px); flex: var(--lattice-surface-flex, none); overflow: clip; touch-action: none; user-select: none; background: var(--paper, #f3ead6); }
  .paper-cell { position: absolute; padding: 0; border: 0; border-radius: 0; background: transparent; color: inherit; overflow: hidden; }
  .overview-marker { background: currentColor; border-radius: 50%; }

  .paper-cell:focus-visible { outline: 2px solid currentColor; outline-offset: -3px; z-index: 2; }
  .paper-content { display: block; width: 60px; height: 60px; transform-origin: top left; pointer-events: none; }
  .overview-marker .paper-content { visibility: hidden; }
  .paper-overlay { position: absolute; pointer-events: none; }
</style>


