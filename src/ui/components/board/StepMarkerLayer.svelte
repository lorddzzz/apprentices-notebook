<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { prefersReducedMotion } from 'svelte/motion';
  import type { Coord } from '$engine';
  import { motionScale, type PlaybackSpeed } from '../../../app/timing';
  import { cellOrigin } from './geometry';

  interface Marker {
    n: number;
    at: Coord;
    first: boolean;
  }

  interface Props {
    /** Shown steps so far, in log order. Empty at rest. */
    markers: readonly Marker[];
    /** The playback speed, so the fade-out keeps up with a faster chain. */
    speed?: PlaybackSpeed;
  }

  let { markers, speed = 1 }: Props = $props();

  /** Radius in board units: a 32 px disc on a six-wide phone board. */
  const R = 26;
  const STEP_X = 22;
  const FADE_MS = 300;

  // When playback ends the list empties; the last numbers fade out instead of vanishing.
  let remembered = $state.raw<readonly Marker[]>([]);
  let fading = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    const now = markers;
    untrack(() => {
      clearTimeout(timer);
      if (now.length > 0) {
        remembered = now;
        fading = false;
      } else if (remembered.length > 0) {
        fading = true;
        timer = setTimeout(() => {
          remembered = [];
          fading = false;
        }, FADE_MS * (motionScale() / speed));
      }
    });
  });

  onDestroy(() => clearTimeout(timer));

  const list = $derived(markers.length > 0 ? markers : remembered);

  /** One disc each, in log order; markers on a shared cell stack side by side, the newest on top. */
  const placed = $derived.by(() => {
    const seen = new Map<string, number>();
    return list.map((m) => {
      const key = `${m.at.x},${m.at.y}`;
      const slot = seen.get(key) ?? 0;
      seen.set(key, slot + 1);
      const o = cellOrigin(m.at);
      return { ...m, slot, x: o.x + R + Math.min(slot, 3) * STEP_X, y: o.y + R + 4 };
    });
  });

  const k = $derived(motionScale() / speed);
</script>

<g
  class={['markers', { fading, reduced: prefersReducedMotion.current }]}
  pointer-events="none"
  data-layer="step-markers"
  style:--k={k}
>
  {#each placed as m (m.n)}
    <g class="marker" class:gold={m.first} data-marker={m.n} data-slot={m.slot} transform="translate({m.x} {m.y})">
      <circle class="disc" r={R} />
      <text class="num" y="12" text-anchor="middle">{m.n}</text>
    </g>
  {/each}
</g>

<style>
  .marker {
    animation: drop calc(160ms * var(--k, 1)) ease-out both;
  }
  .disc {
    fill: var(--ink);
    stroke: var(--parchment);
    stroke-width: 4;
  }
  .num {
    font: bold 32px var(--mono);
    fill: var(--parchment);
  }
  .gold .disc {
    fill: var(--gold);
    stroke: var(--ink);
  }
  .gold .num {
    fill: var(--ink);
  }
  .fading {
    animation: out calc(300ms * var(--k, 1)) ease-in both;
  }
  .reduced .marker {
    animation-name: appear;
  }
  @keyframes drop {
    from {
      opacity: 0;
      translate: 0 -18px;
    }
    to {
      opacity: 1;
      translate: 0 0;
    }
  }
  @keyframes appear {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes out {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
</style>
