<script lang="ts">
  import type { PreviewShape } from '$engine/districts/types';
  import { cellCenter, cellOrigin } from './geometry';

  interface Props {
    shapes: readonly PreviewShape[];
  }

  let { shapes }: Props = $props();

  type TileShape = Extract<PreviewShape, { kind: 'tile' }>;
  const TONE: Record<TileShape['tone'], string> = {
    warn: 'var(--danger)',
    cracked: 'var(--ink-soft)',
    falls: 'var(--ink)',
    drawn: 'var(--m-ink)',
    erased: 'var(--ink-soft)',
  };

  /** The sides of an outline's cells that border no other cell of it, as one path. */
  function perimeter(cells: readonly { x: number; y: number }[]): string {
    const has = new Set(cells.map((c) => `${c.x},${c.y}`));
    const out: string[] = [];
    for (const c of cells) {
      const o = cellOrigin(c);
      const x0 = o.x + 6;
      const y0 = o.y + 6;
      const x1 = o.x + 94;
      const y1 = o.y + 94;
      if (!has.has(`${c.x},${c.y - 1}`)) out.push(`M${x0} ${y0}H${x1}`);
      if (!has.has(`${c.x},${c.y + 1}`)) out.push(`M${x0} ${y1}H${x1}`);
      if (!has.has(`${c.x - 1},${c.y}`)) out.push(`M${x0} ${y0}V${y1}`);
      if (!has.has(`${c.x + 1},${c.y}`)) out.push(`M${x1} ${y0}V${y1}`);
    }
    return out.join('');
  }
</script>

<!--
  "Next round" (DK-13): what the active board rules will do at the next round end. Floats on the
  current, tiles that crack, fall, are drawn or erased, outlines, pulses. Ghost shapes are drawn as
  unit ghosts (BadgeLayer) and the meter is a strip outside the board.
-->
<g pointer-events="none" data-layer="next-round">
  {#each shapes as sh, i (i)}
    {#if sh.kind === 'float'}
      {@const a = cellCenter(sh.from)}
      {#if sh.to}
        {@const o = cellOrigin(sh.to)}
        {@const b = cellCenter(sh.to)}
        <g data-shape="float">
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--m-oil)" stroke-width="5" stroke-dasharray="3 11" stroke-linecap="round" opacity="0.8" />
          <rect x={o.x + 10} y={o.y + 10} width="80" height="80" rx="12" fill="var(--m-oil)" fill-opacity="0.18" stroke="var(--m-oil)" stroke-width="5" stroke-dasharray="10 8" />
        </g>
      {:else}
        <circle data-shape="float" cx={a.x} cy={a.y} r="22" fill="none" stroke="var(--m-oil)" stroke-width="5" stroke-dasharray="4 8" opacity="0.8" />
      {/if}
    {:else if sh.kind === 'tile'}
      {@const o = cellOrigin(sh.at)}
      {@const col = TONE[sh.tone]}
      <g data-shape="tile" data-tone={sh.tone}>
        {#if sh.tone === 'warn'}
          <rect x={o.x + 4} y={o.y + 4} width="92" height="92" rx="6" fill="var(--danger-tint)" stroke={col} stroke-width="5" stroke-dasharray="12 8" />
          <text x={o.x + 50} y={o.y + 66} text-anchor="middle" font-size="46" font-weight="bold" fill={col} font-family="var(--mono)">!</text>
        {:else if sh.tone === 'cracked'}
          <rect x={o.x + 4} y={o.y + 4} width="92" height="92" rx="6" fill="none" stroke={col} stroke-width="4" stroke-dasharray="6 8" />
          <path d="M{o.x + 30} {o.y + 8}L{o.x + 44} {o.y + 38}L{o.x + 30} {o.y + 54}L{o.x + 58} {o.y + 70}L{o.x + 50} {o.y + 92}" fill="none" stroke={col} stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
        {:else if sh.tone === 'falls'}
          <rect x={o.x + 4} y={o.y + 4} width="92" height="92" rx="6" fill={col} fill-opacity="0.22" stroke={col} stroke-width="5" stroke-dasharray="12 8" />
          <path d="M{o.x + 32} {o.y + 38}L{o.x + 50} {o.y + 62}L{o.x + 68} {o.y + 38}" fill="none" stroke={col} stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
        {:else if sh.tone === 'drawn'}
          <rect x={o.x + 8} y={o.y + 8} width="84" height="84" rx="4" fill={col} fill-opacity="0.1" stroke={col} stroke-width="3" />
          <rect x={o.x + 15} y={o.y + 15} width="70" height="70" rx="2" fill="none" stroke={col} stroke-width="2" stroke-dasharray="3 6" />
        {:else}
          <rect x={o.x + 6} y={o.y + 6} width="88" height="88" rx="4" fill="none" stroke={col} stroke-width="4" stroke-dasharray="4 8" />
          <path d="M{o.x + 20} {o.y + 80}L{o.x + 80} {o.y + 20}" stroke={col} stroke-width="6" stroke-linecap="round" />
        {/if}
      </g>
    {:else if sh.kind === 'outline'}
      {@const first = sh.cells[0]}
      <g data-shape="outline">
        <path d={perimeter(sh.cells)} fill="none" stroke="var(--m-ink)" stroke-width="6" stroke-dasharray="14 9" stroke-linecap="round" opacity="0.85" />
        {#if sh.label && first}
          {@const o = cellOrigin(first)}
          <text x={o.x + 12} y={o.y + 30} font-size="22" font-weight="bold" fill="var(--m-ink)" font-family="var(--mono)">{sh.label}</text>
        {/if}
      </g>
    {:else if sh.kind === 'pulse'}
      {@const c = cellCenter(sh.at)}
      <g data-shape="pulse" fill="none" stroke="var(--danger)" stroke-linecap="round">
        <circle cx={c.x} cy={c.y} r="18" stroke-width="6" />
        <circle cx={c.x} cy={c.y} r="34" stroke-width="4" stroke-dasharray="5 9" opacity="0.8" />
        <circle cx={c.x} cy={c.y} r="46" stroke-width="3" stroke-dasharray="3 11" opacity="0.55" />
      </g>
    {/if}
  {/each}
</g>
