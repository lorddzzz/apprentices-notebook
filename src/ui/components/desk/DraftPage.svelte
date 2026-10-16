<script lang="ts">
  import { RUNES } from '$data';
  import { type CellKey, type Coord, type GlyphInside, key, sameCoord } from '$engine';
  import type { CellMark } from '../../../app/desk';
  import RuneGlyph from '../RuneGlyph.svelte';

  /** A draft's page, read-only: the runes on a small grid, fired cells lit and unreached ones faded. */
  interface Props {
    inside: GlyphInside;
    marks: Readonly<Record<CellKey, CellMark>>;
  }

  let { inside, marks }: Props = $props();

  const box = $derived.by(() => {
    const xs = inside.cells.map((c) => c.at.x);
    const ys = inside.cells.map((c) => c.at.y);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    return {
      x0,
      y0,
      width: Math.max(...xs) - x0 + 1,
      height: Math.max(...ys) - y0 + 1,
    };
  });
  const cells = $derived(
    Array.from({ length: box.width * box.height }, (_, i): Coord => ({
      x: box.x0 + (i % box.width),
      y: box.y0 + Math.floor(i / box.width),
    })),
  );
  const placedAt = (at: Coord) => inside.cells.find((c) => sameCoord(c.at, at));
  const label = (at: Coord): string => {
    const placed = placedAt(at);
    if (!placed) return 'empty';
    const mark = marks[key(at)];
    const what = `${RUNES[placed.rune].name}${placed.dir ? ` ${placed.dir}` : ''}`;
    return mark === 'lit' ? `${what}, fired` : mark === 'faded' ? `${what}, never reached` : what;
  };
</script>

<div
  class="page"
  style:--cols={box.width}
  style:--rows={box.height}
  data-testid="draft-page"
>
  {#each cells as at (key(at))}
    {@const placed = placedAt(at)}
    {@const mark = marks[key(at)]}
    <div
      class="cell"
      class:filled={placed !== undefined}
      class:lit={mark === 'lit'}
      class:faded={mark === 'faded'}
      class:entry={sameCoord(at, inside.entry)}
      role="img"
      aria-label={label(at)}
      data-at={key(at)}
      data-mark={mark ?? ''}
    >
      {#if placed}<RuneGlyph rune={placed.rune} dir={placed.dir} size={40} />{/if}
    </div>
  {/each}
</div>

<style>
  .page {
    display: grid;
    grid-template-columns: repeat(var(--cols), 48px);
    grid-auto-rows: 48px;
    justify-content: center;
    gap: 4px;
    max-width: 100%;
  }
  .cell {
    display: grid;
    place-items: center;
    border-radius: var(--radius);
    transition: opacity 0.2s;
  }
  .cell.filled {
    border: 1.5px solid var(--line);
    background: rgba(255, 252, 240, 0.7);
  }
  .cell.entry {
    border-color: var(--lamp);
    border-width: 2.5px;
  }
  .cell.lit {
    border-color: var(--lamp);
    background: rgba(232, 176, 74, 0.35);
    box-shadow: 0 0 8px rgba(232, 176, 74, 0.8);
  }
  .cell.faded {
    border-style: dashed;
    opacity: 0.4;
  }
  .cell :global(svg) {
    width: 82%;
    height: 82%;
  }
</style>
