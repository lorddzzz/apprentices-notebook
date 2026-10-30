<script lang="ts">
  import type { Coord } from '$engine';
  import { cellCenter } from '../../components/board/geometry';

  interface Props {
    at: Coord;
    to?: Coord;
    data?: unknown;
  }

  let { at, to }: Props = $props();
  const c = $derived(cellCenter(at));
  const from = $derived(to ? cellCenter(to) : c);
</script>

<!--
  The forwarded-harm ring (IQ-15): the addressee of a stamp takes the hit a preview aims at the
  unit on the stamp. `at` is the addressee; `to` the stamp, joined by a dotted line.
-->
<g data-district="inkQuarter:forwardRing">
  {#if to}
    <line x1={from.x} y1={from.y} x2={c.x} y2={c.y} stroke="var(--danger)" stroke-width="6" stroke-linecap="round" stroke-dasharray="3 11" />
  {/if}
  <circle cx={c.x} cy={c.y - 6} r="44" fill="var(--danger)" fill-opacity="0.12" stroke="var(--danger)" stroke-width="7" stroke-dasharray="16 8" />
  <circle cx={c.x} cy={c.y - 6} r="52" fill="none" stroke="var(--m-brass)" stroke-width="4" />
</g>
