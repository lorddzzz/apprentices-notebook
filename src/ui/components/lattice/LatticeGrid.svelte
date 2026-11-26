<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    type CellKey,
    type CompiledLattice,
    type Coord,
    type GlyphLibrary,
    type InventionLibrary,
    isGlyph,

    key,
    type Lattice,
    latticeLabel,
    nameOf,
    type SpellKey,

  } from '$engine';
  import { focusedCells, idleCells } from '../../../app/flowGeometry';
  import RuneGlyph from '../RuneGlyph.svelte';
  import FlowOverlay from './FlowOverlay.svelte';
  import LatticeViewport from './LatticeViewport.svelte';

  interface Props {
    sessionKey: string;
    lattice: Lattice;
    compiled: CompiledLattice;
    focus: SpellKey | null;
    /** Resolution step per cell of the focused spell (badges). */
    numbers?: ReadonlyMap<string, number>;
    /** Socket the player is inspecting (ringed). */
    inspected?: Coord | null;
    /** The household's inventions, for drawing them (method over first part). */
    inventions?: InventionLibrary;
    /** The page's Fair copies, for drawing Glyph sockets. */
    glyphs?: GlyphLibrary;
    /** Cells of proven clusters (they glow). */
    glow?: ReadonlySet<string>;
    /** Cells of the Fair copy selection (outlined). */
    selection?: ReadonlySet<string>;
    /** Cells of plain spells that never fired on the last trip (M15; task U6 draws a dashed ring). */
    deadCells?: ReadonlySet<CellKey>;
    /** Fit / Edit scale float on the page (the Study) instead of owning a row. */
    floating?: boolean;
    /** Extra buttons that join Fit and Edit scale. */
    controls?: Snippet;
    /** The page can be read and moved but not edited: socket tap, hold and keyboard activation do nothing. */
    readonly?: boolean;
    /** The Study's notebook look: round sockets and the rune's name under each rune. */
    notebook?: boolean;
    ontap: (at: Coord) => void;
    onlongpress: (at: Coord) => void;
  }

  let {
    sessionKey,
    lattice,
    compiled,
    focus,
    numbers = new Map(),
    inspected = null,
    inventions = {},
    glyphs = {},
    glow = new Set(),
    selection = new Set(),
    deadCells = new Set(),
    floating = false,
    controls,
    readonly = false,
    notebook = false,
    ontap,
    onlongpress,
  }: Props = $props();

  const placements = $derived(new Map(lattice.runes.map(rune => [key(rune.at), rune])));
  const occupied = $derived(lattice.runes.map(rune => rune.at));
  const idle = $derived(idleCells(lattice, compiled));
  const lit = $derived(focusedCells(compiled, focus));

  const cellLabel = (at: Coord): string => {
    const placed = placements.get(key(at));
    return `${latticeLabel(at)}: ${placed ? (isGlyph(placed) ? `${glyphs[placed.glyph]?.name ?? placed.glyph} Glyph` : nameOf(placed.rune, inventions)) : 'empty socket'}`;
  };
</script>

<div class="lattice" class:notebook data-testid="lattice">
  <LatticeViewport {sessionKey} {readonly} {occupied} {floating} {controls} onCellTap={ontap} onCellHold={onlongpress} {cellLabel}>
    {#snippet cell(at)}
      {@const k = key(at)}
      {@const placed = placements.get(k)}
      <span class="socket" class:filled={placed !== undefined} class:lit={lit.has(k)}
        class:inspected={inspected !== null && key(inspected) === k} class:glow={glow.has(k)}
        class:picked={selection.has(k)} class:dead={deadCells.has(k)}
        title={placed && idle.has(k) ? 'Does nothing yet' : undefined}>
        {#if placed && isGlyph(placed)}
          <RuneGlyph rune={null} dir={placed.dir} glyphName={glyphs[placed.glyph]?.name ?? placed.glyph}
            glyphKind={glyphs[placed.glyph]?.kind ?? 'spell'} size={44} />
        {:else if placed}
          <RuneGlyph rune={placed.rune} {inventions} dir={placed.dir} dim={idle.has(k)} size={44} />
        {/if}
        {#if notebook && placed}
          <span class="rname" data-testid="rune-name">{placed && isGlyph(placed) ? (glyphs[placed.glyph]?.name ?? placed.glyph) : nameOf(placed.rune, inventions)}</span>
        {/if}
        {#if numbers.has(k)}<span class="step" data-testid="step-{k}">{numbers.get(k)}</span>{/if}
      </span>
    {/snippet}
    {#snippet overlay(bounds)}
      <FlowOverlay {compiled} {focus} cols={bounds.width} rows={bounds.height} origin={bounds.origin} />
    {/snippet}
  </LatticeViewport>
</div>
<style>
  .lattice {
    width: 100%;
    height: 100%;
    min-height: 0;
    min-width: 0;
    --lattice-viewport-height: 100%;
    --lattice-surface-height: auto;
    --lattice-surface-min-height: 0px;
    --lattice-surface-flex: 1;
  }
  .socket {
    position: relative;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    margin: 8px;
    box-sizing: border-box;
    padding: 0;
    border: 1.5px dashed var(--ink-faint);
    border-radius: var(--radius);
    background: rgba(255, 252, 240, 0.35);
    cursor: pointer;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;

  }
  .socket.filled {
    border-style: solid;
    border-color: var(--line);
    background: rgba(255, 252, 240, 0.7);
  }
  .socket.lit {
    background: rgba(139, 58, 43, 0.12);
    border-color: var(--f-source);
  }
  .socket.glow {
    border-color: var(--lamp);
    background: rgba(232, 176, 74, 0.28);
    box-shadow: 0 0 8px 1px rgba(232, 176, 74, 0.7);
  }
  .socket.dead::after {
    content: '';
    position: absolute;
    inset: -5px;
    border: 1.5px dashed var(--ink-soft);
    border-radius: calc(var(--radius) + 4px);
    opacity: 0.55;
    pointer-events: none;
  }
  .socket.picked {
    border: 2.5px solid var(--select);
    background: rgba(232, 176, 74, 0.5);
    box-shadow: 0 0 0 2px var(--ink);
  }
  .socket.inspected {
    outline: 3px solid var(--select);
    outline-offset: 1px;
  }
  .lattice :global(.paper-cell:focus-visible .socket) {
    outline: 3px solid var(--select);
    outline-offset: 1px;
  }
  .step {
    position: absolute;
    top: -7px;
    left: -7px;
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--f-source);
    color: var(--parchment);
    font: 700 11px var(--mono);
    pointer-events: none;
  }
  /* The notebook page: round sockets as on the painted page, the rune's name on a small paper tag. */
  .notebook .socket {
    border-radius: 50%;
  }
  .notebook .socket.dead::after {
    border-radius: 50%;
  }
  .rname {
    position: absolute;
    left: 50%;
    bottom: -8px;
    transform: translateX(-50%);
    max-width: 58px;
    padding: 0 4px;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 3px;
    background: var(--home-paper);
    color: var(--home-ink);
    font: 12px/14px var(--font-serif);
    font-variant-caps: small-caps;
    letter-spacing: 0.02em;
    text-overflow: ellipsis;
    white-space: nowrap;
    pointer-events: none;
  }
  .socket :global(svg) {
    width: 82%;
    height: 82%;
  }
</style>
