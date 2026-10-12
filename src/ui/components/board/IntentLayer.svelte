<script lang="ts">
  import type { IntentDraw } from '../../../app/overlay';
  import { cellOrigin, chevron, intentArrow, pointsAttr } from './geometry';

  interface Props {
    intents: IntentDraw[];
    /** During playback: chevron + order only (full paths need an engine state). */
    minimal: boolean;
    /** Paths go under the units; order badges go on top of them. */
    layer: 'paths' | 'badges';
  }

  let { intents, minimal, layer }: Props = $props();

  const arrows = $derived(
    intents.map((d) => {
      const target = d.hit ?? d.path.at(-1) ?? null;
      const arrow = target && !minimal ? intentArrow(d.from, target, d.dir) : null;
      const base = arrow
        ? {
            x: (arrow.head[1].x + arrow.head[2].x) / 2,
            y: (arrow.head[1].y + arrow.head[2].y) / 2,
          }
        : null;
      return { d, target, arrow, base, badge: { x: cellOrigin(d.from).x + 16, y: cellOrigin(d.from).y + 16 } };
    }),
  );
</script>

<g pointer-events="none">
  {#each arrows as { d, target, arrow, base, badge } (d.order)}
    <g opacity={d.emphasis === 'dim' ? 0.35 : 1}>
      {#if layer === 'paths'}
        {#if arrow && base && target}
          {@const o = cellOrigin(target)}
          <rect x={o.x + 2} y={o.y + 2} width="96" height="96" fill="var(--danger-tint)" />
          <rect x={o.x + 2} y={o.y + 2} width="96" height="96" fill="url(#hatch)" />
          <line
            x1={arrow.tail.x}
            y1={arrow.tail.y}
            x2={base.x}
            y2={base.y}
            stroke="var(--danger)"
            stroke-width={d.emphasis === 'strong' ? 10 : 7}
            stroke-linecap="round"
          />
          <polygon points={pointsAttr(arrow.head)} fill="var(--danger)" stroke="var(--danger)" stroke-width="3" stroke-linejoin="round" />
        {:else if minimal}
          <polyline
            points={pointsAttr(chevron(d.from, d.dir))}
            fill="none"
            stroke="var(--danger)"
            stroke-width="9"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        {/if}
      {:else}
        <circle cx={badge.x} cy={badge.y} r="16" fill="var(--danger)" stroke="var(--parchment)" stroke-width="3" />
        <text x={badge.x} y={badge.y + 9} text-anchor="middle" font-size="24" font-weight="bold" fill="#fff" font-family="var(--mono)">{d.order}</text>
      {/if}
    </g>
  {/each}
</g>
