<script lang="ts">
  import type { Fx } from '../../../app/fx';
  import { cellCenter } from '../../components/board/geometry';
  import { TONE_LOOK } from './tones';

  let { fx }: { fx: Fx } = $props();
  const ring = $derived(fx.kind === 'ring' ? fx : null);
  const color = $derived(ring ? TONE_LOOK[ring.bell].fill : 'var(--ink)');
</script>

<!--
  A tone rings (BF-17): from each of its bells, in strike order, three rings spread out, the
  inner one in the tone's colour and the wider two fainter; the last ring reaches the four tiles
  beside the bell, where the pulse lands.
-->
{#if ring}
  <g data-fx="ring" data-tone={ring.bell} pointer-events="none">
    {#each ring.cells as at, i (`${at.x},${at.y}`)}
      {@const c = cellCenter(at)}
      <g style:--d="{Math.min(i, 6) * 90}ms">
        <circle class="wave edge w1" cx={c.x} cy={c.y} r="30" />
        <circle class="wave w1" cx={c.x} cy={c.y} r="30" style:--c={color} />
        <circle class="wave edge w2" cx={c.x} cy={c.y} r="30" />
        <circle class="wave w2" cx={c.x} cy={c.y} r="30" style:--c={color} />
        <circle class="wave edge w3" cx={c.x} cy={c.y} r="30" />
        <circle class="wave w3" cx={c.x} cy={c.y} r="30" style:--c={color} />
      </g>
    {/each}
  </g>
{/if}

<style>
  .wave {
    fill: none;
    stroke: var(--c);
    stroke-width: 9;
    transform-box: fill-box;
    transform-origin: center;
    animation: wave 620ms ease-out var(--d) both;
  }
  .edge {
    stroke: var(--ink);
    stroke-width: 12;
    opacity: 0.55;
  }
  .w2 {
    animation-delay: calc(var(--d) + 110ms);
    stroke-width: 6;
  }
  .w3 {
    animation-delay: calc(var(--d) + 220ms);
    stroke-width: 4;
  }
  .edge.w2 {
    stroke-width: 9;
  }
  .edge.w3 {
    stroke-width: 7;
  }
  @keyframes wave {
    0% {
      transform: scale(0.5);
      opacity: 0;
    }
    25% {
      opacity: 0.95;
    }
    100% {
      transform: scale(3.1);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .wave {
      animation-duration: 120ms;
    }
  }
</style>
