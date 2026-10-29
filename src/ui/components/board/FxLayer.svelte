<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { Fx } from '../../../app/fx';
  import { MoorFx, RuinFx } from '../../districts/canals';
  import { cellCenter, cellOrigin, pointsAttr, zigzag } from './geometry';
  import { TONE_COLOR } from './tones';

  interface Props {
    fx: Fx[];
    /** Changes whenever a new step's effects start, so CSS animations restart. */
    fxKey: number;
    width: number;
    height: number;
  }

  let { fx, fxKey, width, height }: Props = $props();

  const bannerW = $derived(Math.min(580, width * 100 - 20));

  type Float = Extract<Fx, { kind: 'float' }>;
  const FLOAT_MS = 900;

  // Droplets thrown outward by a detonation: eight directions, two distances.
  const SPLAT = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    const far = i % 2 === 0 ? 52 : 38;
    return { dx: Math.round(Math.cos(a) * far), dy: Math.round(Math.sin(a) * far), r: far > 40 ? 7 : 5 };
  });
  // An impact star for a crush.
  const STAR = 'M0-22 6-8 21-12 12 0 21 12 6 8 0 22-6 8-21 12-12 0-21-12-6-8z';

  // Floating numbers outlive the (short) playback step that produced them.
  let floats = $state.raw<{ id: number; f: Float }[]>([]);
  let nextId = 0;
  let timers: ReturnType<typeof setTimeout>[] = [];

  $effect(() => {
    void fxKey;
    untrack(() => {
      const fresh = fx
        .filter((f): f is Float => f.kind === 'float')
        .map((f) => ({ id: nextId++, f }));
      if (fresh.length === 0) return;
      floats = [...floats, ...fresh];
      const ids = new Set(fresh.map((x) => x.id));
      const t = setTimeout(() => {
        timers = timers.filter((x) => x !== t);
        floats = floats.filter((x) => !ids.has(x.id));
      }, FLOAT_MS);
      timers.push(t);
    });
  });

  onDestroy(() => {
    for (const t of timers) clearTimeout(t);
  });
</script>

<g class="fx" pointer-events="none" data-testid="fx">
  {#key fxKey}
    {#each fx as f, i (i)}
      {#if f.kind === 'trail'}
        {#if f.cells.length > 1}
          <polyline
            class="trail"
            pathLength="1"
            points={pointsAttr(f.cells.map(cellCenter))}
            style:--c={TONE_COLOR[f.tone]}
          />
        {:else if f.cells[0]}
          {@const c = cellCenter(f.cells[0])}
          <circle class="dot" cx={c.x} cy={c.y} r="16" style:--c={TONE_COLOR[f.tone]} />
        {/if}
      {:else if f.kind === 'slide'}
        {@const pts = pointsAttr(f.cells.map(cellCenter))}
        <polyline class="trail" pathLength="1" points={pts} style:--c={TONE_COLOR[f.tone]} />
        <polyline class="grooves" pathLength="1" points={pts} />
      {:else if f.kind === 'crush'}
        {@const c = cellCenter(f.at)}
        <g transform="translate({c.x} {c.y}) scale(2.1)">
          <path class="crush" d={STAR} style:--c={TONE_COLOR[f.tone]} />
        </g>
      {:else if f.kind === 'drop'}
        {@const c = cellCenter(f.at)}
        <circle class="hole" cx={c.x} cy={c.y} r="36" />
        <circle class="ripple" cx={c.x} cy={c.y} r="30" />
      {:else if f.kind === 'splat'}
        {@const c = cellCenter(f.at)}
        {#each SPLAT as d, k (k)}
          <circle class="splat" cx={c.x} cy={c.y} r={d.r} style:--dx="{d.dx}px" style:--dy="{d.dy}px" style:--c={TONE_COLOR[f.tone]} />
        {/each}
      {:else if f.kind === 'burst'}
        {#each f.cells as cell, j (`${cell.x},${cell.y}`)}
          {@const o = cellOrigin(cell)}
          <rect
            class="burst"
            x={o.x + 3}
            y={o.y + 3}
            width="94"
            height="94"
            rx="8"
            style:--c={TONE_COLOR[f.tone]}
            style:animation-delay="{j * f.stagger}ms"
          />
        {/each}
      {:else if f.kind === 'zap'}
        {#each f.cells as cell, j (`${cell.x},${cell.y}`)}
          {#if cell.x !== f.from.x || cell.y !== f.from.y}
            {@const pts = pointsAttr(zigzag(f.from, cell))}
            <polyline class="zap-outline" points={pts} style:animation-delay="{j * 25}ms" />
            <polyline class="zap" points={pts} style:animation-delay="{j * 25}ms" style:stroke={f.tone ? TONE_COLOR[f.tone] : undefined} />
          {/if}
        {/each}
      {:else if f.kind === 'pulse'}
        {@const c = cellCenter(f.at)}
        <circle class="pulse" cx={c.x} cy={c.y} r="30" style:--c={TONE_COLOR[f.tone]} />
      {:else if f.kind === 'moor'}
        <MoorFx at={f.at} />
      {:else if f.kind === 'ruin'}
        <RuinFx at={f.at} />
      {:else if f.kind === 'banner'}
        <g class="banner">
          <rect x={width * 50 - bannerW / 2} y={height * 50 - 40} width={bannerW} height="80" rx="10" />
          <text x={width * 50} y={height * 50 + 15} text-anchor="middle">{f.text}</text>
        </g>
      {/if}
    {/each}
  {/key}
  {#each floats as { id, f } (id)}
    {@const c = cellCenter(f.at)}
    <text class="float" x={c.x} y={c.y - 20} text-anchor="middle" style:--c={TONE_COLOR[f.tone]}>{f.text}</text>
  {/each}
</g>

<style>
  .trail {
    fill: none;
    stroke: var(--c);
    stroke-width: 12;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 1;
    animation: draw 260ms ease-out both;
  }
  .dot {
    fill: var(--c);
    animation: flash 300ms ease-out both;
  }
  .burst {
    fill: var(--c);
    filter: brightness(1.5) saturate(1.3);
    animation: flash 420ms ease-out both;
  }
  .zap-outline,
  .zap {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    animation: flicker 420ms steps(4, end) both;
  }
  .zap-outline {
    stroke: var(--ink);
    stroke-width: 15;
  }
  .zap {
    stroke: var(--m-spark);
    stroke-width: 8;
  }
  .grooves {
    fill: none;
    stroke: var(--parchment);
    stroke-width: 4;
    stroke-linecap: round;
    stroke-dasharray: 0.05 0.07;
    animation: draw 260ms ease-out both;
  }
  .crush {
    fill: var(--c);
    stroke: var(--ink);
    stroke-width: 3;
    stroke-linejoin: round;
    transform-box: fill-box;
    transform-origin: center;
    animation: slam 380ms ease-out both;
  }
  .hole {
    fill: var(--ink);
    transform-box: fill-box;
    transform-origin: center;
    animation: swallow 420ms ease-in both;
  }
  .ripple {
    fill: none;
    stroke: var(--shield);
    stroke-width: 6;
    transform-box: fill-box;
    transform-origin: center;
    animation: ring 500ms ease-out both;
  }
  .splat {
    fill: var(--c);
    stroke: var(--parchment);
    stroke-width: 2;
    animation: fling 420ms ease-out both;
  }
  .float {
    font: bold 38px var(--mono);
    fill: var(--c);
    stroke: var(--parchment);
    stroke-width: 7px;
    paint-order: stroke;
    animation: rise 900ms ease-out both;
  }
  .pulse {
    fill: none;
    stroke: var(--c);
    stroke-width: 9;
    transform-box: fill-box;
    transform-origin: center;
    animation: ring 420ms ease-out both;
  }
  .banner rect {
    fill: var(--ink);
    opacity: 0.88;
  }
  .banner text {
    font: 40px Georgia, serif;
    fill: var(--parchment);
  }
  .banner {
    animation: banner 700ms ease-out both;
  }

  @keyframes draw {
    from {
      stroke-dashoffset: 1;
      opacity: 1;
    }
    70% {
      stroke-dashoffset: 0;
      opacity: 1;
    }
    to {
      stroke-dashoffset: 0;
      opacity: 0.25;
    }
  }
  @keyframes flash {
    0% {
      opacity: 0;
    }
    25% {
      opacity: 0.65;
    }
    100% {
      opacity: 0.2;
    }
  }
  @keyframes flicker {
    0% {
      opacity: 0;
    }
    25%,
    75% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
    100% {
      opacity: 0.2;
    }
  }
  @keyframes rise {
    from {
      transform: translateY(14px);
      opacity: 0;
    }
    15% {
      opacity: 1;
    }
    70% {
      opacity: 1;
    }
    to {
      transform: translateY(-34px);
      opacity: 0;
    }
  }
  @keyframes ring {
    from {
      transform: scale(0.4);
      opacity: 1;
    }
    to {
      transform: scale(1.7);
      opacity: 0;
    }
  }
  @keyframes slam {
    from {
      transform: scale(0.3) rotate(-12deg);
      opacity: 1;
    }
    40% {
      transform: scale(1.15) rotate(0deg);
      opacity: 1;
    }
    to {
      transform: scale(1) rotate(0deg);
      opacity: 0;
    }
  }
  @keyframes swallow {
    from {
      transform: scale(1);
      opacity: 0.85;
    }
    to {
      transform: scale(0);
      opacity: 0;
    }
  }
  @keyframes fling {
    from {
      transform: translate(0, 0);
      opacity: 1;
    }
    to {
      transform: translate(var(--dx), var(--dy));
      opacity: 0;
    }
  }
  @keyframes banner {
    0% {
      opacity: 0;
    }
    15%,
    80% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .trail,
    .grooves,
    .crush,
    .hole,
    .ripple,
    .splat,
    .burst,
    .zap,
    .zap-outline,
    .pulse,
    .float,
    .banner {
      animation-duration: 120ms;
    }
  }
</style>
