<script lang="ts">
  import type { Coord } from '$engine';
  import { cellOrigin } from '../../components/board/geometry';

  interface Props {
    cells: readonly Coord[];
  }

  let { cells }: Props = $props();
</script>

<!--
  The collapse (BR-14): each cracked tile is a slab that tips, slips and shrinks into the fog while
  a pale puff rises where it stood; tiles go a beat apart in reading order so a long section peels
  away instead of vanishing at once. The board has already drawn them as fog: this plays over it.
-->
<g data-fx="fall">
  {#each cells as at, i (`${at.x},${at.y}`)}
    {@const o = cellOrigin(at)}
    <g style:--d="{Math.min(i, 10) * 40}ms" style:--tilt="{i % 2 === 0 ? 16 : -14}deg">
      <g transform="translate({o.x} {o.y})">
        <g class="slab">
          <rect x="5" y="9" width="90" height="82" rx="6" fill="var(--parchment-deep)" stroke="var(--ink-soft)" stroke-width="3.5" />
          <path d="M46 6L38 34L52 50L40 66L47 94" fill="none" stroke="var(--danger)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
        </g>
        <circle class="puff" cx="30" cy="64" r="20" />
        <circle class="puff two" cx="68" cy="56" r="24" />
      </g>
    </g>
  {/each}
</g>

<style>
  .slab {
    transform-box: fill-box;
    transform-origin: center;
    animation: slip 520ms ease-in var(--d) both;
  }
  .puff {
    fill: var(--parchment);
    stroke: var(--parchment-deep);
    stroke-width: 3;
    animation: billow 520ms ease-out var(--d) both;
  }
  .two {
    animation-delay: calc(var(--d) + 60ms);
  }
  @keyframes slip {
    0% {
      transform: translateY(0) rotate(0deg) scale(1);
      opacity: 1;
    }
    35% {
      transform: translateY(4px) rotate(var(--tilt)) scale(1);
      opacity: 1;
    }
    100% {
      transform: translateY(60px) rotate(calc(var(--tilt) * 2)) scale(0.2);
      opacity: 0;
    }
  }
  @keyframes billow {
    0% {
      transform: translateY(10px);
      opacity: 0;
    }
    40% {
      opacity: 0.95;
    }
    100% {
      transform: translateY(-22px);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .slab,
    .puff {
      animation-duration: 120ms;
    }
  }
</style>
