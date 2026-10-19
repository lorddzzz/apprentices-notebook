<script lang="ts">
  import type { Highlight } from '../../../app/overlay';
  import { cellCenter, cellOrigin, chevron, pointsAttr } from './geometry';
  import { TONE_COLOR } from './tones';

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
      <rect x={o.x + 3} y={o.y + 3} width="94" height="94" rx="6" fill="var(--reach)" opacity="0.4" />
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
    {:else if h.kind === 'effect'}
      {@const o = cellOrigin(h.at)}
      <rect
        x={o.x + 9}
        y={o.y + 9}
        width="82"
        height="82"
        rx="10"
        fill="none"
        stroke={TONE_COLOR[h.tone]}
        stroke-width="5"
        stroke-dasharray="12 7"
      />
    {:else if h.kind === 'focus'}
      {@const o = cellOrigin(h.at)}
      <rect x={o.x + 4} y={o.y + 4} width="92" height="92" rx="6" fill="none" stroke="var(--select)" stroke-width="7" />
    {:else if h.kind === 'blank'}
      <!-- An unwitnessed line lands here: the same dotted tile whatever it is, with no text (D2). -->
      {@const o = cellOrigin(h.at)}
      <rect
        data-state="blank"
        x={o.x + 12}
        y={o.y + 12}
        width="76"
        height="76"
        rx="12"
        fill="none"
        stroke="var(--ink)"
        stroke-width="6"
        stroke-linecap="round"
        stroke-dasharray="0.1 13"
      />
    {:else if h.kind === 'hurt'}
      <!-- A party member the previewed action would hurt (D3). -->
      {@const c = cellCenter(h.at)}
      <circle data-state="hurt" cx={c.x} cy={c.y - 6} r="44" fill="var(--danger)" fill-opacity="0.18" stroke="var(--danger)" stroke-width="7" />
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
