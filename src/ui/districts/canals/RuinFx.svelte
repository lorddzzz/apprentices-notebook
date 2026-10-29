<script lang="ts">
  import type { Coord } from '$engine';
  import { cellCenter } from '../../components/board/geometry';

  interface Props {
    at: Coord;
  }

  let { at }: Props = $props();
  const c = $derived(cellCenter(at));
  // Planks thrown outward, each with its own spin.
  const PLANKS = [
    { dx: -44, dy: -30, r: -40 },
    { dx: 46, dy: -22, r: 55 },
    { dx: -36, dy: 34, r: 30 },
    { dx: 40, dy: 38, r: -65 },
    { dx: 4, dy: -48, r: 20 },
  ];
</script>

<!-- The cargo is lost (CN-10): the crate comes apart into planks that sink. -->
<g data-fx="cargoLost">
  {#each PLANKS as p, i (i)}
    <rect
      class="plank"
      x={c.x - 18}
      y={c.y - 5}
      width="36"
      height="13"
      rx="2"
      style:--dx="{p.dx}px"
      style:--dy="{p.dy}px"
      style:--r="{p.r}deg"
    />
  {/each}
  <circle cx={c.x} cy={c.y} r="30" class="ripple" />
</g>

<style>
  .plank {
    fill: var(--wood);
    stroke: var(--parchment);
    stroke-width: 4;
    paint-order: stroke;
    transform-box: fill-box;
    transform-origin: center;
    animation: scatter 800ms ease-out both;
  }
  .ripple {
    fill: none;
    stroke: var(--danger);
    stroke-width: 6;
    transform-box: fill-box;
    transform-origin: center;
    animation: ring 560ms ease-out both;
  }
  @keyframes scatter {
    from {
      transform: translate(0, 0) rotate(0deg);
      opacity: 1;
    }
    70% {
      opacity: 1;
    }
    to {
      transform: translate(var(--dx), var(--dy)) rotate(var(--r));
      opacity: 0;
    }
  }
  @keyframes ring {
    from {
      transform: scale(0.4);
      opacity: 1;
    }
    to {
      transform: scale(1.8);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .plank,
    .ripple {
      animation-duration: 120ms;
    }
  }
</style>
