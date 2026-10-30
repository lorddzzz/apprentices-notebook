<script lang="ts">
  import type { Coord } from '$engine';
  import { cellCenter } from '../../components/board/geometry';

  interface Props {
    at: Coord;
    to?: Coord;
    data?: unknown;
  }

  let { at, to }: Props = $props();
  const a = $derived(cellCenter(at));
  const b = $derived(to ? cellCenter(to) : a);
  const len = $derived(Math.hypot(b.x - a.x, b.y - a.y) || 1);
  const ux = $derived((b.x - a.x) / len);
  const uy = $derived((b.y - a.y) / len);
</script>

<!-- The thread between a forwarding stamp (`at`) and its address (`to`) (IQ-15): dotted brass. -->
<g data-district="inkQuarter:thread">
  <line
    x1={a.x + ux * 36}
    y1={a.y + uy * 36}
    x2={b.x - ux * 36}
    y2={b.y - uy * 36}
    stroke="var(--m-brass)"
    stroke-width="6"
    stroke-linecap="round"
    stroke-dasharray="2 12"
  />
  <circle cx={b.x - ux * 40} cy={b.y - uy * 40} r="6" fill="var(--m-brass)" />
</g>
