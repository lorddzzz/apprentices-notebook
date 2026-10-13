<script lang="ts">
  import type { Coord } from '$engine';
  import type { TileView } from '../../../app/view';
  import { cellOrigin } from './geometry';

  interface Props {
    tile: TileView;
    at: Coord;
  }

  let { tile, at }: Props = $props();

  const origin = $derived(cellOrigin(at));
  const FLAME = 'M12 3c3 4 5 6 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z';
  const BLOT =
    'M28 54C25 36 42 24 56 29C72 23 82 40 75 55C84 68 68 80 54 73C42 82 24 71 28 54Z';
</script>

<g transform="translate({origin.x} {origin.y})">
  <rect width="100" height="100" fill="var(--parchment)" stroke="var(--line)" stroke-width="1.5" />

  {#if tile.oil}
    <rect x="1" y="1" width="98" height="98" fill="var(--m-oil-tint)" />
    <g stroke={tile.stain ? 'var(--m-ink)' : 'var(--m-oil)'} stroke-width="3.5" stroke-linecap="round" opacity="0.75" fill="none">
      <path d="M14 46 46 14" />
      <path d="M12 74 74 12" />
      <path d="M44 88 88 44" />
    </g>
  {/if}

  {#if tile.oil && tile.stain}
    <rect x="1" y="1" width="98" height="98" fill="var(--m-ink)" opacity="0.22" data-state="stain" />
    <g fill="var(--m-ink)" opacity="0.85">
      <path d="M80 20c-3 4-5 6-5 8.5a5 5 0 0 0 10 0c0-2.5-2-4.5-5-8.5z" />
      <path d="M22 72c-2.2 3-3.6 4.4-3.6 6.2a3.6 3.6 0 0 0 7.2 0c0-1.8-1.4-3.2-3.6-6.2z" />
      <circle cx="60" cy="84" r="3" />
    </g>
  {/if}

  {#if tile.ink}
    <path d={BLOT} fill="var(--m-ink)" opacity="0.8" />
    <circle cx="22" cy="26" r="4" fill="var(--m-ink)" opacity="0.7" />
    <circle cx="82" cy="80" r="3" fill="var(--m-ink)" opacity="0.7" />
  {/if}

  {#if tile.fire > 0}
    <rect x="1" y="1" width="98" height="98" fill="var(--m-fire-tint)" />
    <g class="flames" fill="var(--m-fire)" stroke="var(--ink)" stroke-width="1.2" stroke-linejoin="round">
      <path d={FLAME} transform="translate(8 34) scale(2.4)" />
      <path d={FLAME} transform="translate(44 14) scale(2.9)" />
      <path d={FLAME} transform="translate(56 48) scale(1.9)" />
    </g>
    <text x="93" y="95" text-anchor="end" font-size="24" font-weight="bold" fill="var(--ink)" font-family="var(--mono)">{tile.fire}</text>
  {/if}

  {#if tile.plate}
    <rect x="8" y="8" width="84" height="84" rx="6" fill="var(--m-brass)" stroke="var(--m-brass-dark)" stroke-width="4" />
    <rect x="20" y="20" width="60" height="60" rx="3" fill="none" stroke="var(--m-brass-dark)" stroke-width="2" opacity="0.6" />
    <g fill="var(--m-brass-dark)">
      <circle cx="17" cy="17" r="4" />
      <circle cx="83" cy="17" r="4" />
      <circle cx="17" cy="83" r="4" />
      <circle cx="83" cy="83" r="4" />
    </g>
  {/if}

  {#if tile.plate && tile.etched}
    <g data-state="etched" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M30 66 44 40 54 56 70 32" stroke="var(--parchment)" stroke-width="8" opacity="0.55" />
      <path d="M30 66 44 40 54 56 70 32" stroke="var(--m-brass-dark)" stroke-width="4.5" />
      <path d="M36 74 62 66M50 30 60 38" stroke="var(--m-brass-dark)" stroke-width="3" opacity="0.8" />
    </g>
  {/if}

  {#if tile.plate && tile.heat > 0}
    <g data-state="hot">
      <rect x="8" y="8" width="84" height="84" rx="6" fill="var(--m-fire)" opacity="0.5" />
      <rect x="5" y="5" width="90" height="90" rx="8" fill="none" stroke="var(--m-fire)" stroke-width="5" class="glow" />
      <path d="M26 28c-3-4 3-6 0-11M50 28c-3-4 3-6 0-11M74 28c-3-4 3-6 0-11" fill="none" stroke="var(--parchment)" stroke-width="4" stroke-linecap="round" opacity="0.85" />
      <text x="93" y="95" text-anchor="end" font-size="24" font-weight="bold" fill="var(--ink)" font-family="var(--mono)">{tile.heat}</text>
    </g>
  {/if}

  {#if tile.vent}
    <circle cx="50" cy="50" r="31" fill="var(--vent)" stroke="var(--ink)" stroke-width="4" />
    <g fill="var(--parchment)" opacity="0.8">
      <rect x="30" y="36" width="40" height="6" rx="3" />
      <rect x="30" y="47" width="40" height="6" rx="3" />
      <rect x="30" y="58" width="40" height="6" rx="3" />
    </g>
  {/if}
</g>

<style>
  .flames {
    transform-box: fill-box;
    transform-origin: 50% 100%;
    animation: flare 320ms ease-out both;
  }
  .glow {
    animation: glow 1.4s ease-in-out infinite alternate;
  }
  @media (prefers-reduced-motion: reduce) {
    .glow {
      animation: none;
    }
  }
  @keyframes glow {
    from {
      opacity: 0.55;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes flare {
    from {
      opacity: 0;
      transform: scale(0.4);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
