<script lang="ts">
  import type { Coord } from '$engine';
  import { cellCenter } from '../../components/board/geometry';

  interface Props {
    at: Coord;
  }

  let { at }: Props = $props();
  const c = $derived(cellCenter(at));
</script>

<!-- The crate makes fast (CN-10): brass rings close round the post and a tick settles. -->
<g data-fx="moored">
  <circle cx={c.x} cy={c.y} r="40" class="ring" />
  <circle cx={c.x} cy={c.y} r="26" class="ring two" />
  <path d="M{c.x - 16} {c.y + 2}l12 12 22-26" class="tick" />
</g>

<style>
  .ring {
    fill: none;
    stroke: var(--m-brass);
    stroke-width: 8;
    transform-box: fill-box;
    transform-origin: center;
    animation: close 520ms ease-in both;
  }
  .two {
    animation-delay: 120ms;
    stroke-dasharray: 6 8;
  }
  .tick {
    fill: none;
    stroke: var(--m-brass-dark);
    stroke-width: 11;
    stroke-linecap: round;
    stroke-linejoin: round;
    animation: pop 800ms ease-out both;
  }
  @keyframes close {
    from {
      transform: scale(1.9);
      opacity: 0;
    }
    40% {
      opacity: 1;
    }
    to {
      transform: scale(1);
      opacity: 0.25;
    }
  }
  @keyframes pop {
    0% {
      opacity: 0;
    }
    35%,
    70% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ring,
    .tick {
      animation-duration: 120ms;
    }
  }
</style>
