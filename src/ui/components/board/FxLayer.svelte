<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { prefersReducedMotion } from 'svelte/motion';
  import type { Fx } from '../../../app/fx';
  import { motionScale, type PlaybackSpeed } from '../../../app/timing';
  import { artUrl } from '../../art/registry';
  import { fxFor } from '../../districts';
  import { fxRate, spriteIdOf } from './fxSprites';
  import { cellCenter, cellOrigin, pointsAttr, zigzag } from './geometry';
  import { TONE_COLOR } from './tones';

  interface Props {
    fx: Fx[];
    /** Changes whenever a new step's effects start, so CSS animations restart. */
    fxKey: number;
    width: number;
    height: number;
    /** The playback speed; effects and float timers run on the same scale as the steps. */
    speed?: PlaybackSpeed;
  }

  let { fx, fxKey, width, height, speed = 1 }: Props = $props();

  const k = $derived(fxRate(motionScale(), speed));
  const reduced = $derived(prefersReducedMotion.current);

  function sprite(f: Fx): string | null {
    const id = spriteIdOf(f);
    return id ? artUrl(id) : null;
  }
  /** A fixed turn per effect, so a sprite is not always upright and never random. */
  const turn = (i: number): number => ((i * 47) % 70) - 35;

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
      }, FLOAT_MS * k);
      timers.push(t);
    });
  });

  onDestroy(() => {
    for (const t of timers) clearTimeout(t);
  });
</script>

<g class="fx" class:reduced pointer-events="none" data-testid="fx" style:--k={k}>
  {#key fxKey}
    {#each fx as f, i (i)}
      {#if f.kind === 'trail'}
        {#if reduced}
          {#if f.cells.at(-1)}
            {@const c = cellCenter(f.cells.at(-1) ?? f.cells[0] ?? { x: 0, y: 0 })}
            <circle class="dot" cx={c.x} cy={c.y} r="16" style:--c={TONE_COLOR[f.tone]} />
          {/if}
        {:else if f.cells.length > 1}
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
        {#if !reduced}
        {@const pts = pointsAttr(f.cells.map(cellCenter))}
        <polyline class="trail" pathLength="1" points={pts} style:--c={TONE_COLOR[f.tone]} />
        <polyline class="grooves" pathLength="1" points={pts} />
        {/if}
      {:else if f.kind === 'crush'}
        {@const c = cellCenter(f.at)}
        {@const url = sprite(f)}
        {#if url}
          <image class="sprite" href={url} x={c.x - 64} y={c.y - 64} width="128" height="128" style:--rot="{turn(i)}deg" />
        {:else}
          <g transform="translate({c.x} {c.y}) scale(2.1)">
            <path class="crush" d={STAR} style:--c={TONE_COLOR[f.tone]} />
          </g>
        {/if}
      {:else if f.kind === 'drop'}
        {@const c = cellCenter(f.at)}
        <circle class="hole" cx={c.x} cy={c.y} r="36" />
        <circle class="ripple" cx={c.x} cy={c.y} r="30" />
      {:else if f.kind === 'splat'}
        {@const c = cellCenter(f.at)}
        {@const url = sprite(f)}
        {#if url}
          <image class="sprite" href={url} x={c.x - 64} y={c.y - 64} width="128" height="128" style:--rot="{turn(i)}deg" />
        {:else if !reduced}
        {#each SPLAT as d, n (n)}
          <circle class="splat" cx={c.x} cy={c.y} r={d.r} style:--dx="{d.dx}px" style:--dy="{d.dy}px" style:--c={TONE_COLOR[f.tone]} />
        {/each}
        {/if}
      {:else if f.kind === 'burst'}
        {#each f.cells as cell, j (`${cell.x},${cell.y}`)}
          {@const o = cellOrigin(cell)}
          {@const url = sprite(f)}
          {#if url}
            <image
              class="sprite"
              href={url}
              x={o.x - 14}
              y={o.y - 14}
              width="128"
              height="128"
              style:--rot="{turn(i + j)}deg"
              style:animation-delay="{j * f.stagger * k}ms"
            />
          {:else}
          <rect
            class="burst"
            x={o.x + 3}
            y={o.y + 3}
            width="94"
            height="94"
            rx="8"
            style:--c={TONE_COLOR[f.tone]}
            style:animation-delay="{j * f.stagger * k}ms"
          />
          {/if}
        {/each}
      {:else if f.kind === 'zap'}
        {#each f.cells as cell, j (`${cell.x},${cell.y}`)}
          {#if cell.x !== f.from.x || cell.y !== f.from.y}
            {@const pts = pointsAttr(zigzag(f.from, cell))}
            <polyline class="zap-outline" points={pts} style:animation-delay="{j * 25 * k}ms" />
            <polyline class="zap" points={pts} style:animation-delay="{j * 25 * k}ms" style:stroke={f.tone ? TONE_COLOR[f.tone] : undefined} />
          {/if}
        {/each}
      {:else if f.kind === 'pulse'}
        {@const c = cellCenter(f.at)}
        {@const url = sprite(f)}
        {#if url}
          <image class="sprite" href={url} x={c.x - 64} y={c.y - 64} width="128" height="128" style:--rot="{turn(i)}deg" />
        {:else}
          <circle class="pulse" cx={c.x} cy={c.y} r="30" style:--c={TONE_COLOR[f.tone]} />
        {/if}
      {:else if fxFor(f.kind)}
        {@const FxArt = fxFor(f.kind)}
        {#if FxArt}<FxArt fx={f} />{/if}
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
    animation: draw calc(260ms * var(--k, 1)) ease-out both;
  }
  .dot {
    fill: var(--c);
    animation: flash calc(300ms * var(--k, 1)) ease-out both;
  }
  .burst {
    fill: var(--c);
    filter: brightness(1.5) saturate(1.3);
    animation: flash calc(420ms * var(--k, 1)) ease-out both;
  }
  .zap-outline,
  .zap {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    animation: flicker calc(420ms * var(--k, 1)) steps(4, end) both;
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
    animation: draw calc(260ms * var(--k, 1)) ease-out both;
  }
  .crush {
    fill: var(--c);
    stroke: var(--ink);
    stroke-width: 3;
    stroke-linejoin: round;
    transform-box: fill-box;
    transform-origin: center;
    animation: slam calc(380ms * var(--k, 1)) ease-out both;
  }
  .hole {
    fill: var(--ink);
    transform-box: fill-box;
    transform-origin: center;
    animation: swallow calc(420ms * var(--k, 1)) ease-in both;
  }
  .ripple {
    fill: none;
    stroke: var(--shield);
    stroke-width: 6;
    transform-box: fill-box;
    transform-origin: center;
    animation: ring calc(500ms * var(--k, 1)) ease-out both;
  }
  .splat {
    fill: var(--c);
    stroke: var(--parchment);
    stroke-width: 2;
    animation: fling calc(420ms * var(--k, 1)) ease-out both;
  }
  .float {
    font: bold 38px var(--mono);
    fill: var(--c);
    stroke: var(--parchment);
    stroke-width: 7px;
    paint-order: stroke;
    animation: rise calc(900ms * var(--k, 1)) ease-out both;
  }
  .pulse {
    fill: none;
    stroke: var(--c);
    stroke-width: 9;
    transform-box: fill-box;
    transform-origin: center;
    animation: ring calc(420ms * var(--k, 1)) ease-out both;
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
    animation: banner calc(700ms * var(--k, 1)) ease-out both;
  }

  .sprite {
    transform-box: fill-box;
    transform-origin: center;
    animation: sprite calc(420ms * var(--k, 1)) ease-out both;
  }
  @keyframes sprite {
    from {
      transform: scale(0.5) rotate(var(--rot, 0deg));
      opacity: 0;
    }
    30% {
      opacity: 1;
    }
    to {
      transform: scale(1.25) rotate(calc(var(--rot, 0deg) * -0.5));
      opacity: 0;
    }
  }
  @keyframes fade {
    0% {
      opacity: 0;
    }
    30% {
      opacity: 0.85;
    }
    100% {
      opacity: 0;
    }
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

  /* Reduced motion: cross-fades only (no slides, no scaling, no flying droplets, no trails). */
  .reduced .crush,
  .reduced .hole,
  .reduced .ripple,
  .reduced .pulse,
  .reduced .float,
  .reduced .sprite {
    animation-name: fade;
  }
  .reduced .float,
  .reduced .sprite,
  .reduced .crush {
    animation-duration: calc(300ms * var(--k, 1));
  }
</style>
