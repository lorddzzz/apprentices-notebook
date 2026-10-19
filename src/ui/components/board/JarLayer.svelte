<script lang="ts">
  import type { BoardView, JarView } from '../../../app/view';
  import { runePath } from './art';
  import { cellOrigin } from './geometry';

  interface Props {
    view: BoardView;
  }

  let { view }: Props = $props();

  // A jar sits in the corner of its tile, over whoever stands there: owner's colour, a rune peek.
  const JAR = 'M10 3h18v6c7 3 10 8 10 15v7c0 4-3 7-7 7H7c-4 0-7-3-7-7v-7c0-7 3-12 10-15z';
  // 'step': a footfall chevron; 'dusk': a crescent.
  const STEP = 'M-5-2 0 3 5-2';
  const DUSK = 'M3-5a6 6 0 1 0 2 9 5 5 0 0 1-2-9z';

  const jars = $derived(
    view.tiles.flatMap((t, i) =>
      t.jar
        ? [{ jar: t.jar as JarView, at: { x: i % view.width, y: Math.floor(i / view.width) } }]
        : [],
    ),
  );
</script>

<g pointer-events="none">
  {#each jars as { jar, at } (`${at.x},${at.y}`)}
    {@const o = cellOrigin(at)}
    {@const peek = runePath(jar.peek)}
    <g transform="translate({o.x + 3} {o.y + 57})" data-state="jar" data-owner={jar.owner} data-event={jar.event}>
      <path d={JAR} fill="var(--member-{jar.owner}, var(--ink-soft))" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round" />
      <rect x="8" y="-1" width="22" height="6" rx="2.5" fill="var(--parchment)" stroke="var(--ink)" stroke-width="2.5" />
      {#if peek}
        <g transform="translate(7 12) scale(1.0)" data-peek={jar.peek}>
          <path d={peek} fill="none" stroke="var(--parchment)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      {:else}
        <circle cx="19" cy="24" r="4" fill="var(--parchment)" opacity="0.7" />
      {/if}
      <g transform="translate(36 6)">
        <circle r="9" fill="var(--parchment)" stroke="var(--ink)" stroke-width="2.5" />
        {#if jar.event === 'step'}
          <path d={STEP} fill="none" stroke="var(--ink)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
        {:else}
          <path d={DUSK} fill="var(--ink)" />
        {/if}
      </g>
    </g>
  {/each}
</g>
