<script lang="ts">
  import type { DriftGhosts } from '../../../app/overlay';
  import { cellCenter, cellOrigin } from './geometry';

  interface Props {
    drift: DriftGhosts;
  }

  let { drift }: Props = $props();
</script>

<!-- Where floats will be after the next drift: dashed outlines, a short tail back to where they are. -->
<g pointer-events="none" data-layer="drift">
  {#each drift.floats as f (`${f.from.x},${f.from.y}`)}
    {@const a = cellCenter(f.from)}
    {#if f.to}
      {@const o = cellOrigin(f.to)}
      {@const b = cellCenter(f.to)}
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--m-oil)" stroke-width="5" stroke-dasharray="3 11" stroke-linecap="round" opacity="0.8" />
      <rect x={o.x + 10} y={o.y + 10} width="80" height="80" rx="12" fill="var(--m-oil)" fill-opacity="0.18" stroke="var(--m-oil)" stroke-width="5" stroke-dasharray="10 8" />
    {:else}
      <circle cx={a.x} cy={a.y} r="22" fill="none" stroke="var(--m-oil)" stroke-width="5" stroke-dasharray="4 8" opacity="0.8" />
    {/if}
  {/each}
</g>
