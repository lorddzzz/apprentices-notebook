<script lang="ts">
  import type { Coord } from '$engine';
  import { cellOrigin } from '../../components/board/geometry';

  interface Props {
    at: Coord;
    to?: Coord;
    data?: unknown;
  }

  let { at, data }: Props = $props();
  const o = $derived(cellOrigin(at));
  const left = $derived(
    typeof data === 'object' && data !== null && 'left' in data && typeof data.left === 'number'
      ? data.left
      : 0,
  );
  const label = $derived(left === 0 ? 'now' : `${left}`);
  const hot = $derived(left <= 1);
</script>

<!--
  The clock's countdown (IQ-15): rounds left, a badge on the postmaster's stamp. "now" = it
  collects at this round's dusk; it reddens as it runs out.
-->
<g data-district="inkQuarter:clockCount" data-left={left}>
  <circle cx={o.x + 80} cy={o.y + 20} r="19" fill={hot ? 'var(--danger)' : 'var(--parchment)'} stroke="var(--ink)" stroke-width="4" />
  <text x={o.x + 80} y={o.y + (left === 0 ? 26 : 29)} text-anchor="middle" font-size={left === 0 ? 15 : 26} font-weight="bold" fill={hot ? 'var(--parchment)' : 'var(--ink)'} font-family="var(--mono)">{label}</text>
</g>
