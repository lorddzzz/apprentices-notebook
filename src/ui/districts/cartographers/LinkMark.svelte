<script lang="ts">
  import type { Coord } from '$engine';
  import type { Json } from '$engine/districts/types';
  import { cellCenter } from '../../components/board/geometry';

  interface Props {
    at: Coord;
    to?: Coord;
    data?: Json;
  }

  let { at, to, data }: Props = $props();
  const d = $derived((data ?? {}) as { kind?: unknown });
  /** `swap`: the Surveyor's named pair; `tether`: the Tracer's thread to its apprentice. */
  const kind = $derived(d.kind === 'tether' ? 'tether' : 'swap');
  const a = $derived(cellCenter(at));
  const b = $derived(to ? cellCenter(to) : null);
  const seg = $derived.by(() => {
    if (!b) return null;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return null;
    const ux = dx / len;
    const uy = dy / len;
    const pad = 34;
    const p = { x: a.x + ux * pad, y: a.y + uy * pad };
    const q = { x: b.x - ux * pad, y: b.y - uy * pad };
    // Arrowheads for the swap, at both ends: two units trade places.
    const head = (tip: { x: number; y: number }, sx: number, sy: number): string =>
      `M${tip.x + sx * 16 - sy * 11} ${tip.y + sy * 16 + sx * 11}L${tip.x} ${tip.y}L${tip.x + sx * 16 + sy * 11} ${tip.y + sy * 16 - sx * 11}`;
    return { p, q, heads: [head(p, ux, uy), head(q, -ux, -uy)] };
  });
</script>

<!--
  Two links between tokens (CG-12). The Surveyor's pair: a heavy dashed line with an arrowhead at
  each end (they trade places). The Tracer's tether: a thin wavy thread of dots, the pen's line, from
  the Tracer to the apprentice whose damage it copies a round late.
-->
{#if seg}
  <g data-district="cartographers:{kind}" pointer-events="none">
    {#if kind === 'swap'}
      <line x1={seg.p.x} y1={seg.p.y} x2={seg.q.x} y2={seg.q.y} stroke="var(--parchment)" stroke-width="14" stroke-linecap="round" />
      <line x1={seg.p.x} y1={seg.p.y} x2={seg.q.x} y2={seg.q.y} stroke="var(--danger)" stroke-width="6" stroke-linecap="round" stroke-dasharray="14 9" />
      {#each seg.heads as h (h)}
        <path d={h} fill="none" stroke="var(--parchment)" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" />
        <path d={h} fill="none" stroke="var(--danger)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
      {/each}
    {:else}
      <line x1={seg.p.x} y1={seg.p.y} x2={seg.q.x} y2={seg.q.y} stroke="var(--parchment)" stroke-width="9" stroke-linecap="round" />
      <line class="thread" x1={seg.p.x} y1={seg.p.y} x2={seg.q.x} y2={seg.q.y} stroke="var(--ink)" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 9" />
      <circle cx={seg.q.x} cy={seg.q.y} r="7" fill="var(--parchment)" stroke="var(--ink)" stroke-width="3" />
    {/if}
  </g>
{/if}

<style>
  .thread {
    animation: draw 1.4s linear infinite;
  }
  @keyframes draw {
    to {
      stroke-dashoffset: -20;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .thread {
      animation: none;
    }
  }
</style>
