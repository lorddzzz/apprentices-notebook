<script lang="ts">
  import type { Highlight } from '../../../app/overlay';
  import { cellCenter, cellOrigin, chevron, pointsAttr } from './geometry';

  interface Props {
    highlights: Highlight[];
  }

  let { highlights }: Props = $props();
</script>

<g pointer-events="none">
  {#each highlights as h, i (i)}
    {#if h.kind === 'reach'}
      {@const c = cellCenter(h.at)}
      <circle cx={c.x} cy={c.y} r="15" fill="var(--reach)" stroke="var(--member-draughtsman)" stroke-width="3" />
    {:else if h.kind === 'aim'}
      {@const o = cellOrigin(h.at)}
      <rect x={o.x + 3} y={o.y + 3} width="94" height="94" rx="6" fill="var(--reach)" opacity="0.65" />
      {#if h.chevron}
        <polyline
          points={pointsAttr(chevron(h.at, h.chevron))}
          fill="none"
          stroke="var(--member-draughtsman)"
          stroke-width="8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      {/if}
    {:else if h.kind === 'target'}
      {@const o = cellOrigin(h.at)}
      <rect x={o.x + 4} y={o.y + 4} width="92" height="92" rx="6" fill="none" stroke="var(--danger)" stroke-width="6" />
    {:else if h.kind === 'shove'}
      {@const c = cellCenter(h.at)}
      <circle cx={c.x} cy={c.y} r="45" fill="none" stroke="var(--select)" stroke-width="6" stroke-dasharray="14 8" />
    {:else}
      <polyline
        points={pointsAttr(h.cells.map(cellCenter))}
        fill="none"
        stroke="var(--f-source)"
        stroke-width="9"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-dasharray="2 16"
      />
    {/if}
  {/each}
</g>
