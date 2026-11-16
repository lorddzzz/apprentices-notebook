<script lang="ts">
  import type { Fx } from '../../../app/fx';
  import { cellCenter, cellOrigin } from '../../components/board/geometry';

  let { fx }: { fx: Fx } = $props();
  const paper = $derived(fx.kind === 'paper' ? fx : null);
  const o = $derived(paper ? cellOrigin(paper.at) : { x: 0, y: 0 });
  const c = $derived(paper ? cellCenter(paper.at) : { x: 0, y: 0 });
</script>

<!--
  One paper event on a tile (CG-12), by `what`: ink soaks in from a blot, a rubbed tile is scrubbed
  white by an eraser stroke, an undone drawing is scribbled over, an outline fills with ink, a circle
  draws itself, and a struck circle closes with a cross through it. All short; reduced motion keeps
  only the fade.
-->
{#if paper}
  <g data-fx="paper" data-what={paper.what} pointer-events="none">
    {#if paper.what === 'inked'}
      <circle class="soak" cx={c.x} cy={c.y} r="30" fill="var(--ink)" />
      <rect class="settle" x={o.x + 6} y={o.y + 6} width="88" height="88" fill="none" stroke="var(--ink)" stroke-width="7" />
    {:else if paper.what === 'rubbed'}
      <rect class="wipe" x={o.x + 4} y={o.y + 4} width="92" height="92" fill="#fbf7ea" stroke="var(--ink)" stroke-width="3" />
      <g class="sweep" style:--x="{o.x}px" style:--y="{o.y}px">
        <rect x={o.x + 6} y={o.y + 30} width="34" height="22" rx="5" fill="var(--parchment)" stroke="var(--ink)" stroke-width="4" />
        <rect x={o.x + 6} y={o.y + 30} width="14" height="22" rx="5" fill="var(--ink-soft)" opacity="0.6" />
      </g>
    {:else if paper.what === 'undrawn'}
      <path class="scribble" pathLength="1" d="M{o.x + 10} {o.y + 24}L{o.x + 90} {o.y + 36}L{o.x + 10} {o.y + 52}L{o.x + 90} {o.y + 66}L{o.x + 10} {o.y + 80}" fill="none" stroke="var(--parchment)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" />
      <path class="scribble" pathLength="1" d="M{o.x + 10} {o.y + 24}L{o.x + 90} {o.y + 36}L{o.x + 10} {o.y + 52}L{o.x + 90} {o.y + 66}L{o.x + 10} {o.y + 80}" fill="none" stroke="var(--ink-soft)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
    {:else if paper.what === 'drawnIn'}
      <rect class="fill" x={o.x + 14} y={o.y + 14} width="72" height="72" rx="14" fill="var(--ink)" />
      <rect class="settle" x={o.x + 6} y={o.y + 6} width="88" height="88" rx="6" fill="none" stroke="var(--danger)" stroke-width="6" stroke-dasharray="10 7" />
    {:else if paper.what === 'circled'}
      <ellipse class="draw" pathLength="1" cx={c.x} cy={c.y + 2} rx="45" ry="43" fill="none" stroke="var(--parchment)" stroke-width="12" />
      <ellipse class="draw" pathLength="1" cx={c.x} cy={c.y + 2} rx="45" ry="43" fill="none" stroke="var(--danger)" stroke-width="7" stroke-linecap="round" />
    {:else if paper.what === 'struck'}
      <ellipse class="closing" cx={c.x} cy={c.y + 2} rx="45" ry="43" fill="var(--danger)" fill-opacity="0.35" stroke="var(--danger)" stroke-width="8" />
      <path class="cross" pathLength="1" d="M{o.x + 20} {o.y + 20}L{o.x + 80} {o.y + 80}M{o.x + 80} {o.y + 20}L{o.x + 20} {o.y + 80}" fill="none" stroke="var(--parchment)" stroke-width="16" stroke-linecap="round" />
      <path class="cross" pathLength="1" d="M{o.x + 20} {o.y + 20}L{o.x + 80} {o.y + 80}M{o.x + 80} {o.y + 20}L{o.x + 20} {o.y + 80}" fill="none" stroke="var(--ink)" stroke-width="8" stroke-linecap="round" />
    {:else}
      <ellipse class="lift" cx={c.x} cy={c.y + 2} rx="45" ry="43" fill="none" stroke="var(--danger)" stroke-width="6" stroke-dasharray="18 8" />
    {/if}
  </g>
{/if}

<style>
  .soak {
    transform-box: fill-box;
    transform-origin: center;
    animation: soak 700ms ease-out both;
  }
  .settle {
    animation: fade 700ms ease-out both;
  }
  .fill {
    transform-box: fill-box;
    transform-origin: center;
    animation: soak 650ms ease-out both;
  }
  .wipe {
    animation: fade 700ms ease-in both;
  }
  .sweep {
    animation: sweep 600ms ease-in-out both;
  }
  .scribble,
  .draw,
  .cross {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    animation: draw 560ms ease-out forwards, fade 900ms ease-in 400ms forwards;
  }
  .draw {
    animation: draw 520ms ease-out forwards, fade 700ms ease-in 520ms forwards;
  }
  .closing {
    transform-box: fill-box;
    transform-origin: center;
    animation: close 600ms ease-in both;
  }
  .lift {
    animation: fade 700ms ease-in both;
  }
  @keyframes soak {
    0% {
      transform: scale(0.2);
      opacity: 0.9;
    }
    60% {
      transform: scale(1.35);
      opacity: 0.8;
    }
    100% {
      transform: scale(1.6);
      opacity: 0;
    }
  }
  @keyframes fade {
    0% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
  @keyframes draw {
    to {
      stroke-dashoffset: 0;
    }
  }
  @keyframes sweep {
    0% {
      transform: translateX(0);
      opacity: 1;
    }
    100% {
      transform: translateX(56px);
      opacity: 0;
    }
  }
  @keyframes close {
    0% {
      transform: scale(1.5);
      opacity: 0;
    }
    70% {
      transform: scale(0.9);
      opacity: 1;
    }
    100% {
      transform: scale(0.8);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .soak,
    .fill,
    .sweep,
    .closing {
      animation: fade 300ms ease-out both;
    }
    .scribble,
    .draw,
    .cross {
      stroke-dashoffset: 0;
      animation: fade 400ms ease-out 100ms both;
    }
  }
</style>
