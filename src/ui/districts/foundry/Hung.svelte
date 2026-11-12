<script lang="ts">
  import type { Coord } from '$engine';
  import { cellCenter } from '../../components/board/geometry';

  interface Props {
    at: Coord;
    to?: Coord;
    data?: unknown;
  }

  let { at }: Props = $props();
  const c = $derived(cellCenter(at));
</script>

<!--
  The strike affordance (BF-18): a hung great bell is yours to ring on your turn. A slow gold
  pulse marks it as a target; casting at it (or shoving a foe into it) is the tap that strikes.
-->
<g data-district="foundry:hung" pointer-events="none">
  <circle class="beat" cx={c.x} cy={c.y} r="44" fill="none" stroke="var(--parchment)" stroke-width="10" />
  <circle class="beat" cx={c.x} cy={c.y} r="44" fill="none" stroke="var(--m-brass)" stroke-width="5" stroke-dasharray="3 9" stroke-linecap="round" />
  <g transform="translate({c.x - 34} {c.y - 36})">
    <circle r="14" fill="var(--m-brass)" stroke="var(--parchment)" stroke-width="3.5" />
    <path d="M-6 6L4 -4" stroke="var(--ink)" stroke-width="3.4" stroke-linecap="round" />
    <rect x="-1" y="-10" width="11" height="8" rx="2" fill="var(--ink)" transform="rotate(45 4 -6)" />
  </g>
</g>

<style>
  .beat {
    transform-box: fill-box;
    transform-origin: center;
    animation: beat 1.8s ease-in-out infinite;
  }
  @keyframes beat {
    50% {
      transform: scale(1.08);
      opacity: 0.6;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .beat {
      animation: none;
    }
  }
</style>
