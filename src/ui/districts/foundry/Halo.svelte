<script lang="ts">
  import { isTone } from '$data/districts/foundry';
  import type { Coord } from '$engine';
  import { cellCenter } from '../../components/board/geometry';
  import { TONE_LOOK } from './tones';

  interface Props {
    at: Coord;
    to?: Coord;
    data?: unknown;
  }

  let { at, data }: Props = $props();
  const c = $derived(cellCenter(at));
  const d = $derived((data ?? {}) as { tone?: unknown; why?: unknown });
  const tone = $derived(isTone(d.tone) ? d.tone : 'low');
  const why = $derived(
    d.why === 'ringer' || d.why === 'note' || d.why === 'peal' ? d.why : 'ring',
  );
  const color = $derived(TONE_LOOK[tone].fill);
</script>

<!--
  A bell that is about to ring, or would (BF-17, BF-18): a dashed ring in its tone, edged in
  parchment so it reads on any tile. A Ringer's pull and the called note carry a badge (! and a
  note); the Great Peal wears a second, gold ring and the same badge; a previewed ring is solid.
-->
<g data-district="foundry:halo" data-why={why} data-tone={tone} pointer-events="none">
  <circle cx={c.x} cy={c.y} r="46" fill="none" stroke="var(--ink)" stroke-width="14" opacity="0.5" />
  <circle cx={c.x} cy={c.y} r="46" fill="none" stroke="var(--parchment)" stroke-width="11" opacity="0.9" />
  <circle
    class:pending={why !== 'ring'}
    cx={c.x}
    cy={c.y}
    r="46"
    fill="none"
    stroke={color}
    stroke-width="7"
    stroke-dasharray={why === 'ring' ? undefined : '16 9'}
    stroke-linecap="round"
  />
  {#if why === 'peal'}
    <circle cx={c.x} cy={c.y} r="38" fill="none" stroke="var(--m-brass)" stroke-width="4" />
  {/if}
  {#if why !== 'ring'}
    <g transform="translate({c.x + 34} {c.y - 36})">
      <circle r="14" fill={why === 'note' ? 'var(--ink)' : 'var(--danger)'} stroke="var(--parchment)" stroke-width="3.5" />
      {#if why === 'note'}
        <path d="M-3 6V-6L6 -8V3" fill="none" stroke="var(--parchment)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="-5" cy="6" r="3" fill="var(--parchment)" />
        <circle cx="4" cy="3" r="3" fill="var(--parchment)" />
      {:else}
        <path d="M0 -7V2" stroke="#fff" stroke-width="3.4" stroke-linecap="round" />
        <circle cy="7" r="2" fill="#fff" />
      {/if}
    </g>
  {/if}
</g>

<style>
  .pending {
    animation: crawl 1.6s linear infinite;
  }
  @keyframes crawl {
    to {
      stroke-dashoffset: -25;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pending {
      animation: none;
    }
  }
</style>
