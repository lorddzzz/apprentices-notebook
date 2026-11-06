<script lang="ts">
  import type { Coord } from '$engine';
  import { cellCenter } from '../../components/board/geometry';

  interface Props {
    cells: readonly Coord[];
  }

  let { cells }: Props = $props();
</script>

<!--
  The house boils over (BH-12): a red wash and three rising puffs on every cloud tile, each tile a
  beat after the last in reading order, ending where the storm lands.
-->
<g data-fx="boil-over">
  {#each cells as at, i (`${at.x},${at.y}`)}
    {@const c = cellCenter(at)}
    <g style:--d="{Math.min(i, 8) * 30}ms">
      <rect class="wash" x={c.x - 46} y={c.y - 46} width="92" height="92" rx="8" />
      <circle class="puff" cx={c.x - 20} cy={c.y + 10} r="16" />
      <circle class="puff two" cx={c.x + 18} cy={c.y + 4} r="20" />
      <circle class="puff three" cx={c.x} cy={c.y - 8} r="14" />
    </g>
  {/each}
</g>

<style>
  .wash {
    fill: var(--danger);
    animation: wash 460ms ease-out var(--d) both;
  }
  .puff {
    fill: var(--m-steam);
    stroke: var(--ink-soft);
    stroke-width: 3;
    animation: rise 460ms ease-out var(--d) both;
  }
  .two {
    animation-delay: calc(var(--d) + 40ms);
  }
  .three {
    animation-delay: calc(var(--d) + 80ms);
  }
  @keyframes wash {
    0% {
      opacity: 0;
    }
    30% {
      opacity: 0.4;
    }
    100% {
      opacity: 0;
    }
  }
  @keyframes rise {
    0% {
      transform: translateY(12px);
      opacity: 0;
    }
    30% {
      opacity: 0.95;
    }
    100% {
      transform: translateY(-34px);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .wash,
    .puff {
      animation-duration: 120ms;
    }
  }
</style>
