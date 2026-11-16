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
  const c = $derived(cellCenter(at));
  const d = $derived((data ?? {}) as { source?: unknown; state?: unknown; holder?: unknown });
  /** `registrar`: the Registrar's trick; `note`: the household's one-round circle (the Registrar's note). */
  const source = $derived(d.source === 'note' ? 'note' : 'registrar');
  const state = $derived(d.state === 'drawn' ? 'drawn' : 'shown');
  const holder = $derived(d.holder === 'self' ? 'self' : d.holder === 'member' ? 'member' : 'hand');
  const colour = $derived(source === 'note' ? 'var(--m-ink)' : 'var(--danger)');
  const end = $derived(to ? cellCenter(to) : null);
  /** The holder line leaves the circle's rim toward its holder and stops at the holder's token. */
  const line = $derived.by(() => {
    if (!end) return null;
    const dx = end.x - c.x;
    const dy = end.y - c.y;
    const len = Math.hypot(dx, dy);
    if (len < 60) return null;
    const ux = dx / len;
    const uy = dy / len;
    return { x1: c.x + ux * 44, y1: c.y + uy * 44, x2: end.x - ux * 40, y2: end.y - uy * 40 };
  });
</script>

<!--
  A circle on a tile (CG-12), one drawing for both sources. The Registrar's is red and single, the
  household's blue and doubled with a tick; a circle still only shown is dashed, one already drawn is
  solid. The holder line runs to whoever holds it (a guild hand, the Registrar himself, or an
  apprentice for the household's) and ends in a ring whose centre says which: a dot for a hand,
  a cross for the Registrar, a bar for a member.
-->
<g data-district="cartographers:circle" data-source={source} data-state={state} data-holder={holder} pointer-events="none">
  {#if line}
    <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="var(--parchment)" stroke-width="10" stroke-linecap="round" />
    <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke={colour} stroke-width="4.5" stroke-linecap="round" stroke-dasharray={source === 'note' ? '2 9' : '10 7'} />
    <g transform="translate({line.x2} {line.y2})">
      <circle r="11" fill="var(--parchment)" stroke={colour} stroke-width="4" />
      {#if holder === 'hand'}
        <circle r="3.6" fill={colour} />
      {:else if holder === 'self'}
        <path d="M-5 -5L5 5M5 -5L-5 5" stroke={colour} stroke-width="3.2" stroke-linecap="round" />
      {:else}
        <path d="M-5 0H5" stroke={colour} stroke-width="3.6" stroke-linecap="round" />
      {/if}
    </g>
  {/if}
  <ellipse cx={c.x} cy={c.y + 2} rx="45" ry="43" fill="none" stroke="var(--ink)" stroke-width="13" opacity="0.4" />
  <ellipse cx={c.x} cy={c.y + 2} rx="45" ry="43" fill="none" stroke="var(--parchment)" stroke-width="10" />
  <ellipse cx={c.x} cy={c.y + 2} rx="45" ry="43" fill="none" stroke={colour} stroke-width="6" stroke-linecap="round" stroke-dasharray={state === 'shown' ? '18 8' : undefined} />
  {#if source === 'note'}
    <ellipse cx={c.x} cy={c.y + 2} rx="36" ry="34" fill="none" stroke={colour} stroke-width="3" stroke-dasharray={state === 'shown' ? '12 7' : undefined} />
    <path d="M{c.x + 24} {c.y - 38}l5 6 9-11" fill="none" stroke="var(--parchment)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M{c.x + 24} {c.y - 38}l5 6 9-11" fill="none" stroke={colour} stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
  {:else}
    <path d="M{c.x - 28} {c.y + 32}Q{c.x} {c.y + 40} {c.x + 28} {c.y + 32}" fill="none" stroke={colour} stroke-width="3" stroke-linecap="round" opacity="0.9" />
  {/if}
</g>
