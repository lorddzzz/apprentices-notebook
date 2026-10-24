<script lang="ts">
  import type { Coord } from '$engine';
  import type { TileView } from '../../../app/view';
  import { pieceArtFor } from '../../districts';
  import { CELL, cellOrigin } from './geometry';
  import PieceGlyph from './PieceGlyph.svelte';

  interface Props {
    cells: { at: Coord; tile: TileView | undefined }[];
  }

  let { cells }: Props = $props();

  const pieces = $derived(
    cells.flatMap(({ at, tile }) => (tile?.piece ? [{ at, piece: tile.piece }] : [])),
  );
</script>

<!-- District pieces (DK-4): drawn by the renderer registered for their art key, else a fallback glyph. -->
<g pointer-events="none" data-layer="pieces">
  {#each pieces as { at, piece } (`${at.x},${at.y}`)}
    {@const o = cellOrigin(at)}
    {@const Art = pieceArtFor(piece.art)}
    <g transform="translate({o.x} {o.y})" data-piece={piece.id}>
      {#if Art}
        <Art data={piece.data} size={CELL} />
      {:else}
        <PieceGlyph label={piece.label} size={CELL} />
      {/if}
    </g>
  {/each}
</g>
