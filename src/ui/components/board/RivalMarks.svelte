<script lang="ts">
  import type { RivalDraw } from '../../../app/overlay';
  import { cellCenter, cellOrigin, chevron, intentArrow, pointsAttr } from './geometry';

  interface Props {
    rivals: RivalDraw[];
    /** Lines, rings and tints go under the units; badges and pills go on top of them. */
    layer: 'under' | 'badges';
  }

  let { rivals, layer }: Props = $props();

  /** A pill's text, cut to fit the 92-wide pill (about 12 characters). */
  const clip = (text: string, room = 12): string =>
    text.length > room ? `${text.slice(0, room - 1)}…` : text;

  const arrowOf = (r: RivalDraw) =>
    r.landing && r.dir ? intentArrow(r.from, r.landing, r.dir) : null;
</script>

<!-- A rival's telegraphed spell (RV-7): the locked line and landing, the wick's line to its jar, the fallback ring. -->
<g pointer-events="none" data-layer="rivals-{layer}">
  {#each rivals as r (r.unit)}
    {@const arrow = arrowOf(r)}
    <g opacity={r.emphasis === 'dim' ? 0.35 : 1} data-rival={r.unit}>
      {#if layer === 'under'}
        {#each r.path.filter((c) => !r.landing || c.x !== r.landing.x || c.y !== r.landing.y) as c (`${c.x},${c.y}`)}
          {@const o = cellOrigin(c)}
          <rect x={o.x + 14} y={o.y + 14} width="72" height="72" rx="8" fill="var(--danger-tint)" fill-opacity="0.7" data-rival-path="{c.x},{c.y}" />
        {/each}
        {#if r.landing}
          {@const o = cellOrigin(r.landing)}
          <g data-rival-landing="{r.landing.x},{r.landing.y}">
            <rect x={o.x + 2} y={o.y + 2} width="96" height="96" fill="var(--danger-tint)" />
            <rect x={o.x + 2} y={o.y + 2} width="96" height="96" fill="url(#hatch)" />
          </g>
        {/if}
        {#if arrow}
          {@const base = { x: (arrow.head[1].x + arrow.head[2].x) / 2, y: (arrow.head[1].y + arrow.head[2].y) / 2 }}
          <line x1={arrow.tail.x} y1={arrow.tail.y} x2={base.x} y2={base.y} stroke="var(--danger)" stroke-width={r.emphasis === 'strong' ? 10 : 7} stroke-linecap="round" />
          <polygon points={pointsAttr(arrow.head)} fill="var(--danger)" stroke="var(--danger)" stroke-width="3" stroke-linejoin="round" />
        {:else if r.dir && !r.landing && !r.wick}
          <!-- Playback: no board state to draw a path from, so a chevron shows the locked direction. -->
          <polyline points={pointsAttr(chevron(r.from, r.dir))} fill="none" stroke="var(--danger)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
        {/if}
        {#each r.effects as c (`${c.x},${c.y}`)}
          {@const o = cellOrigin(c)}
          <rect x={o.x + 16} y={o.y + 16} width="68" height="68" rx="10" fill="none" stroke="var(--danger)" stroke-width="4" data-rival-effect="{c.x},{c.y}" />
        {/each}
        {#if r.wick}
          {@const a = cellCenter(r.from)}
          {@const b = cellCenter(r.wick.to)}
          <line data-rival-wick="{r.wick.to.x},{r.wick.to.y}" x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--danger)" stroke-width="6" stroke-linecap="round" stroke-dasharray="1 13" />
          <circle cx={b.x} cy={b.y} r="42" fill="var(--danger)" fill-opacity="0.12" stroke="var(--danger)" stroke-width="6" />
        {/if}
        {#if r.fallback}
          {@const o = cellOrigin(r.fallback.at)}
          <rect
            data-rival-fallback="{r.fallback.at.x},{r.fallback.at.y}"
            data-live={r.fallback.live}
            x={o.x + 6}
            y={o.y + 6}
            width="88"
            height="88"
            rx="14"
            fill="none"
            stroke="var(--danger)"
            stroke-width={r.fallback.live && r.starving ? 9 : 5}
            stroke-dasharray="18 10"
            opacity={r.fallback.live ? 1 : 0.35}
          />
        {/if}
      {:else}
        {@const o = cellOrigin(r.from)}
        <g data-rival-label={r.label}>
          <circle cx={o.x + 16} cy={o.y + 16} r="16" fill="var(--danger)" stroke="var(--parchment)" stroke-width="3" />
          <text x={o.x + 16} y={o.y + 25} text-anchor="middle" font-size="24" font-weight="bold" fill="#fff" font-family="var(--mono)">{r.order}</text>
          <rect x={o.x + 4} y={o.y + 76} width="92" height="20" rx="10" fill="var(--parchment)" fill-opacity="1" stroke="var(--danger)" stroke-width="2.5" />
          <text x={o.x + 50} y={o.y + 91} text-anchor="middle" font-size="14" font-weight="bold" fill="var(--ink)" font-family="var(--mono)">{clip(r.label)}</text>
        </g>
        {#if r.wick}
          {@const j = cellOrigin(r.wick.to)}
          <g data-rival-contents={r.wick.contents ?? ''}>
            <rect x={j.x + 4} y={j.y + 4} width="92" height="20" rx="10" fill="var(--parchment)" fill-opacity="1" stroke="var(--danger)" stroke-width="2.5" />
            <text x={j.x + 50} y={j.y + 19} text-anchor="middle" font-size="14" font-weight="bold" fill="var(--ink)" font-family="var(--mono)">{clip(r.wick.contents ? `jar: ${r.wick.contents}` : 'jar: empty')}</text>
          </g>
        {/if}
        {#if r.fallback}
          {@const f = cellOrigin(r.fallback.at)}
          <g data-rival-starved opacity={r.fallback.live ? 1 : 0.45}>
            <rect x={f.x + 4} y={f.y + 4} width="92" height="20" rx="10" fill="var(--parchment)" fill-opacity="1" stroke="var(--danger)" stroke-width="2.5" stroke-dasharray="6 4" />
            <text x={f.x + 50} y={f.y + 19} text-anchor="middle" font-size="14" font-weight="bold" fill="var(--ink)" font-family="var(--mono)">if starved</text>
          </g>
        {/if}
      {/if}
    </g>
  {/each}
</g>
