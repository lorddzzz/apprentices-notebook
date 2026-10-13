<script lang="ts">
  import { RUNES } from '$data';
  import {
    type CompiledLattice,
    type Coord,
    isSocket,
    key,
    type Lattice,
    label,
    type SpellKey,
    socketAt,
  } from '$engine';
  import { focusedCells, idleCells } from '../../../app/flowGeometry';
  import { longpress } from '../../attach/longpress';
  import RuneGlyph from '../RuneGlyph.svelte';
  import FlowOverlay from './FlowOverlay.svelte';

  interface Props {
    lattice: Lattice;
    compiled: CompiledLattice;
    focus: SpellKey | null;
    /** Resolution step per cell of the focused spell (badges). */
    numbers?: ReadonlyMap<string, number>;
    /** Socket the player is inspecting (ringed). */
    inspected?: Coord | null;
    ontap: (at: Coord) => void;
    onlongpress: (at: Coord) => void;
  }

  let {
    lattice,
    compiled,
    focus,
    numbers = new Map(),
    inspected = null,
    ontap,
    onlongpress,
  }: Props = $props();

  const cols = $derived(lattice.shape.width);
  const rows = $derived(lattice.shape.height);
  const cells = $derived(
    Array.from({ length: cols * rows }, (_, i) => {
      const at = { x: i % cols, y: Math.floor(i / cols) };
      return { at, k: key(at), socket: isSocket(lattice.shape, at), placed: socketAt(lattice, at) };
    }),
  );
  const idle = $derived(idleCells(lattice, compiled));
  const lit = $derived(focusedCells(compiled, focus));

  const cellLabel = (at: Coord): string => {
    const placed = socketAt(lattice, at);
    return `${label(at)}: ${placed ? RUNES[placed.rune].name : 'empty socket'}`;
  };
</script>

<div
  class="lattice"
  data-testid="lattice"
  style:--cols={cols}
  style:--rows={rows}
>
  <div class="cells">
    {#each cells as c (c.k)}
      {#if c.socket}
        <button
          type="button"
          class="socket"
          class:filled={c.placed !== null}
          class:lit={lit.has(c.k)}
          class:inspected={inspected !== null && key(inspected) === c.k}
          aria-label={cellLabel(c.at)}
          title={c.placed && idle.has(c.k) ? 'Does nothing yet' : undefined}
          data-at={c.k}
          onclick={() => ontap(c.at)}
          {@attach longpress(() => onlongpress(c.at))}
        >
          {#if c.placed}
            <RuneGlyph rune={c.placed.rune} dir={c.placed.dir} dim={idle.has(c.k)} size={44} />
          {/if}
          {#if numbers.has(c.k)}
            <span class="step" data-testid="step-{c.k}">{numbers.get(c.k)}</span>
          {/if}
        </button>
      {:else}
        <span class="hole" aria-hidden="true"></span>
      {/if}
    {/each}
  </div>
  <FlowOverlay {compiled} {focus} {cols} {rows} />
</div>

<style>
  .lattice {
    --pitch: min(
      68px,
      calc(100cqh / var(--rows)),
      calc(100cqw / var(--cols))
    );
    position: relative;
    width: calc(var(--cols) * var(--pitch));
    height: calc(var(--rows) * var(--pitch));
  }
  .cells {
    display: grid;
    grid-template-columns: repeat(var(--cols), var(--pitch));
    grid-auto-rows: var(--pitch);
  }
  .hole {
    display: block;
  }
  .socket {
    position: relative;
    display: grid;
    place-items: center;
    margin: calc(var(--pitch) * 0.13);
    padding: 0;
    border: 1.5px dashed var(--ink-faint);
    border-radius: var(--radius);
    background: rgba(255, 252, 240, 0.35);
    cursor: pointer;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    touch-action: manipulation;
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
  .socket.inspected {
    outline: 3px solid var(--select);
    outline-offset: 1px;
  }
  .socket:focus-visible {
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
  .socket :global(svg) {
    width: 82%;
    height: 82%;
  }
</style>
