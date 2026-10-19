<script lang="ts">
  import type { BoardView, LayerId } from '../../../app/view';
  import { CLOUD_LIKE, DROP } from './art';
  import { cellOrigin } from './geometry';

  interface Props {
    view: BoardView;
  }

  let { view }: Props = $props();

  // Clouds stand over the units: plain, branded with ink, greased, or banked thick.
  const clouds = $derived(
    view.tiles.flatMap((t, i) =>
      t.state !== null && CLOUD_LIKE.has(t.state)
        ? [
            {
              id: t.state as LayerId,
              rounds: t.rounds,
              at: { x: i % view.width, y: Math.floor(i / view.width) },
            },
          ]
        : [],
    ),
  );
</script>

<g pointer-events="none">
  {#each clouds as c (`${c.at.x},${c.at.y}`)}
    {@const o = cellOrigin(c.at)}
    <g transform="translate({o.x} {o.y})" data-state={c.id}>
      {#if c.id === 'bank'}
        <!-- Bank: a thick bank of cloud with a bolt in its belly -->
        <g fill="var(--m-steam)" opacity="0.85" stroke="var(--ink-soft)" stroke-opacity="0.6" stroke-width="3">
          <circle cx="26" cy="62" r="22" />
          <circle cx="74" cy="62" r="22" />
          <circle cx="50" cy="66" r="24" />
          <circle cx="34" cy="38" r="24" />
          <circle cx="66" cy="38" r="24" />
          <circle cx="50" cy="28" r="22" />
        </g>
        <path d="M54 30 38 56h12l-6 20 20-28H52z" fill="var(--m-spark)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round" />
      {:else}
        <g fill="var(--m-steam)" opacity="0.62" stroke="#fff" stroke-opacity="0.55" stroke-width="2">
          <circle cx="34" cy="58" r="25" />
          <circle cx="64" cy="60" r="24" />
          <circle cx="50" cy="38" r="26" />
        </g>
        {#if c.id === 'brandCloud'}
          <!-- Brand cloud: the same puffs stained with ink, drops hanging in them -->
          <g fill="var(--m-ink)" opacity="0.38">
            <circle cx="34" cy="58" r="25" />
            <circle cx="64" cy="60" r="24" />
            <circle cx="50" cy="38" r="26" />
          </g>
          <g fill="var(--m-ink)" stroke="var(--parchment)" stroke-width="2.5">
            <path d={DROP} transform="translate(32 66) scale(0.8)" />
            <path d={DROP} transform="translate(60 70) scale(0.8)" />
            <path d={DROP} transform="translate(47 48) scale(0.8)" />
          </g>
        {:else if c.id === 'greaseFog'}
          <!-- Grease fog: the same puffs gone amber, slick strokes sliding through -->
          <g fill="var(--m-oil)" opacity="0.4">
            <circle cx="34" cy="58" r="25" />
            <circle cx="64" cy="60" r="24" />
            <circle cx="50" cy="38" r="26" />
          </g>
          <g stroke="var(--m-oil)" stroke-width="4" stroke-linecap="round" opacity="0.85">
            <path d="M24 70 44 50" />
            <path d="M42 78 70 50" />
            <path d="M58 46 72 32" />
          </g>
        {/if}
      {/if}
      {#if c.rounds > 0}
        <text x="93" y="95" text-anchor="end" font-size="24" font-weight="bold" fill="var(--ink)" stroke="var(--parchment)" stroke-width="4" paint-order="stroke" font-family="var(--mono)">{c.rounds}</text>
      {/if}
    </g>
  {/each}
</g>
