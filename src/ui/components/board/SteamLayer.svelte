<script lang="ts">
  import type { BoardView } from '../../../app/view';
  import { cellOrigin } from './geometry';

  interface Props {
    view: BoardView;
  }

  let { view }: Props = $props();

  const clouds = $derived(
    view.tiles.flatMap((t, i) =>
      t.state === 'cloud'
        ? [{ rounds: t.rounds, at: { x: i % view.width, y: Math.floor(i / view.width) } }]
        : [],
    ),
  );
</script>

<g pointer-events="none">
  {#each clouds as c (`${c.at.x},${c.at.y}`)}
    {@const o = cellOrigin(c.at)}
    <g transform="translate({o.x} {o.y})">
      <g fill="var(--m-steam)" opacity="0.62" stroke="#fff" stroke-opacity="0.55" stroke-width="2">
        <circle cx="34" cy="58" r="25" />
        <circle cx="64" cy="60" r="24" />
        <circle cx="50" cy="38" r="26" />
      </g>
      {#if c.rounds > 0}
        <text x="93" y="95" text-anchor="end" font-size="24" font-weight="bold" fill="var(--ink)" font-family="var(--mono)">{c.rounds}</text>
      {/if}
    </g>
  {/each}
</g>
