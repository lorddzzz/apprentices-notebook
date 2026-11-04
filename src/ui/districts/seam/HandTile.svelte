<script lang="ts">
  import type { Coord } from '$engine';
  import { cellOrigin } from '../../components/board/geometry';
  import { isKindId, KIND_FILL, KIND_NAME, KIND_STROKE, kindPath } from './hands';

  interface Props {
    at: Coord;
    to?: Coord;
    data?: unknown;
  }

  let { at, data }: Props = $props();
  const o = $derived(cellOrigin(at));
  const kind = $derived.by(() => {
    const k = typeof data === 'object' && data !== null && 'kind' in data ? data.kind : null;
    return typeof k === 'string' && isKindId(k) ? k : null;
  });
</script>

<!--
  One tile the Marginalia's next hand will write on (SM-2): a faint kind glyph in the middle (it
  sits under any unit on the tile) and a kind badge in the top-left corner (the corner a unit's
  token leaves clear), over the room's usual hatch for a foe's telegraphed tile.
-->
{#if kind}
  <g data-district="seam:hand" data-kind={kind} data-tile="{at.x},{at.y}">
    <title>{KIND_NAME[kind]} lands here next round</title>
    <g transform="translate({o.x + 22} {o.y + 14}) scale(2.3)" opacity="0.5">
      <path d={kindPath(kind)} fill="none" stroke={KIND_FILL[kind]} stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
    </g>
    <circle cx={o.x + 16} cy={o.y + 16} r="14" fill={KIND_FILL[kind]} stroke="var(--parchment)" stroke-width="3" />
    <g transform="translate({o.x + 7} {o.y + 7}) scale(0.75)">
      <path d={kindPath(kind)} fill="none" stroke={KIND_STROKE[kind]} stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  </g>
{/if}
