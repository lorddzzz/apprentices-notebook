<script lang="ts">
  import type { IntentMark } from '../../../app/overlay';
  import { cellCenter, cellOrigin } from './geometry';

  interface Props {
    marks: IntentMark[];
    /** Marks go under the units; the order badges go on top of them. */
    layer: 'under' | 'badges';
  }

  let { marks, layer }: Props = $props();

  const STAR = 'M0-22 6-8 21-12 12 0 21 12 6 8 0 22-6 8-21 12-12 0-21-12-6-8z';
</script>

<g pointer-events="none">
  {#each marks as m (m.order)}
    {@const from = cellCenter(m.from)}
    <g opacity={m.emphasis === 'dim' ? 0.35 : 1} data-mark={m.kind}>
      {#if layer === 'under'}
        {#if m.kind === 'summon'}
          {@const o = cellOrigin(m.at)}
          {@const to = cellCenter(m.at)}
          <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="var(--lamp)" stroke-width="7" stroke-dasharray="4 14" stroke-linecap="round" />
          <rect x={o.x + 3} y={o.y + 3} width="94" height="94" rx="10" fill="var(--lamp)" opacity="0.4" />
          <circle cx={to.x} cy={to.y - 18} r="30" fill="none" stroke="var(--lamp)" stroke-width="6" class="pulse" />
        {:else}
          {#each m.targets as t (`${t.x},${t.y}`)}
            {@const c = cellCenter(t)}
            <circle cx={c.x} cy={c.y - 8} r="40" fill="var(--danger-tint)" stroke="var(--danger)" stroke-width="5" stroke-dasharray="10 7" />
          {/each}
        {/if}
      {:else}
        {@const b = { x: cellOrigin(m.from).x + 16, y: cellOrigin(m.from).y + 16 }}
        {#if m.kind === 'flare'}
          {#each m.targets as t (`${t.x},${t.y}`)}
            <path d={STAR} transform="translate({cellOrigin(t).x + 82} {cellOrigin(t).y + 22}) scale(0.8)" fill="var(--danger)" stroke="var(--parchment)" stroke-width="3" />
          {/each}
        {/if}
        <circle cx={b.x} cy={b.y} r="16" fill={m.kind === 'summon' ? 'var(--lamp)' : 'var(--danger)'} stroke="var(--parchment)" stroke-width="3" />
        <text x={b.x} y={b.y + 9} text-anchor="middle" font-size="24" font-weight="bold" fill={m.kind === 'summon' ? 'var(--ink)' : '#fff'} font-family="var(--mono)">{m.order}</text>
      {/if}
    </g>
  {/each}
</g>

<style>
  .pulse {
    transform-box: fill-box;
    transform-origin: center;
    animation: pulse 1s ease-in-out infinite alternate;
  }
  @keyframes pulse {
    from {
      opacity: 0.4;
    }
    to {
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pulse {
      animation: none;
    }
  }
</style>
