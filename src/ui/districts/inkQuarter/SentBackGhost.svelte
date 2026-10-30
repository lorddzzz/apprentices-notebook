<script lang="ts">
  import type { Coord } from '$engine';
  import { cellCenter, cellOrigin } from '../../components/board/geometry';

  interface Props {
    at: Coord;
    to?: Coord;
    data?: unknown;
  }

  let { at, to }: Props = $props();
  const o = $derived(cellOrigin(at));
  const c = $derived(cellCenter(at));
  const from = $derived(to ? cellCenter(to) : c);
</script>

<!--
  "Sent back to" (IQ-15): where a unit that would land on a return stamp ends up. `at` is the
  target tile (a ghost ring with a U-turn mark), `to` the stamp it would land on (a dotted trail).
-->
<g data-district="inkQuarter:sentBack">
  {#if to}
    <line x1={from.x} y1={from.y} x2={c.x} y2={c.y} stroke="var(--danger)" stroke-width="5" stroke-linecap="round" stroke-dasharray="3 11" opacity="0.8" />
  {/if}
  <rect x={o.x + 10} y={o.y + 10} width="80" height="80" rx="12" fill="var(--danger)" fill-opacity="0.14" stroke="var(--danger)" stroke-width="5" stroke-dasharray="10 8" />
  <g transform="translate({o.x} {o.y})">
    <path d="M38 62V44a12 12 0 0 1 24 0v8" fill="none" stroke="var(--danger)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M54 48l8 10 8-10z" fill="var(--danger)" stroke="var(--danger)" stroke-width="3" stroke-linejoin="round" />
  </g>
</g>
