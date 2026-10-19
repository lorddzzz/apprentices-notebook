<script lang="ts">
  import type { Coord, Dir } from '$engine';
  import { LAYER_NAME } from '../../../app/describe';
  import { layerTone } from '../../../app/fx';
  import type { TileView } from '../../../app/view';
  import { RUNE_ART } from '../../runeArt';
  import { cellOrigin } from './geometry';
  import { TONE_COLOR } from './tones';

  interface Props {
    tile: TileView;
    at: Coord;
  }

  let { tile, at }: Props = $props();

  const origin = $derived(cellOrigin(at));
  const FLAME = 'M12 3c3 4 5 6 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z';
  const ARROW: Record<Dir, string> = {
    right: 'M64 38 82 50 64 62',
    left: 'M36 38 18 50 36 62',
    down: 'M38 64 50 82 62 64',
    up: 'M38 36 50 18 62 36',
  };
  // Compounds get a neutral labelled chip until the board view (U1) draws each one.
  const PLAIN = ['blot', 'slick', 'cloud', 'plate', 'fire'];
  const compound = $derived(tile.state !== null && !PLAIN.includes(tile.state) ? tile.state : null);
  const compoundColor = $derived(compound ? TONE_COLOR[layerTone(compound)] : 'var(--ink-soft)');
  const compoundWords = $derived(compound ? LAYER_NAME[compound].split(' ') : []);
  const BLOT =
    'M28 54C25 36 42 24 56 29C72 23 82 40 75 55C84 68 68 80 54 73C42 82 24 71 28 54Z';
</script>

<g transform="translate({origin.x} {origin.y})">
  <rect width="100" height="100" fill="var(--parchment)" stroke="var(--line)" stroke-width="1.5" />

  {#if tile.water}
    <rect x="1" y="1" width="98" height="98" fill="var(--shield)" opacity="0.3" data-state="water" />
    <g fill="none" stroke="var(--shield)" stroke-width="3" stroke-linecap="round" opacity="0.55">
      <path d="M12 30q9-8 19 0t19 0 19 0 19 0" />
      <path d="M12 74q9-8 19 0t19 0 19 0 19 0" />
    </g>
    <path d={ARROW[tile.water]} fill="none" stroke="var(--ink-soft)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.4" />
  {/if}

  {#if tile.state === 'slick'}
    <rect x="1" y="1" width="98" height="98" fill="var(--m-oil-tint)" data-state="slick" />
    <g stroke="var(--m-oil)" stroke-width="3.5" stroke-linecap="round" opacity="0.75" fill="none">
      <path d="M14 46 46 14" />
      <path d="M12 74 74 12" />
      <path d="M44 88 88 44" />
    </g>
  {/if}

  {#if tile.state === 'blot'}
    <g data-state="blot">
      <path d={BLOT} fill="var(--m-ink)" opacity="0.8" />
      <circle cx="22" cy="26" r="4" fill="var(--m-ink)" opacity="0.7" />
      <circle cx="82" cy="80" r="3" fill="var(--m-ink)" opacity="0.7" />
    </g>
  {/if}

  {#if tile.state === 'fire'}
    <rect x="1" y="1" width="98" height="98" fill="var(--m-fire-tint)" data-state="fire" />
    <g class="flames" fill="var(--m-fire)" stroke="var(--ink)" stroke-width="1.2" stroke-linejoin="round">
      <path d={FLAME} transform="translate(8 34) scale(2.4)" />
      <path d={FLAME} transform="translate(44 14) scale(2.9)" />
      <path d={FLAME} transform="translate(56 48) scale(1.9)" />
    </g>
    {#if tile.rounds > 0}
      <text x="93" y="95" text-anchor="end" font-size="24" font-weight="bold" fill="var(--ink)" font-family="var(--mono)">{tile.rounds}</text>
    {/if}
  {/if}

  {#if tile.state === 'plate'}
    <g data-state="plate">
      <rect x="8" y="8" width="84" height="84" rx="6" fill="var(--m-brass)" stroke="var(--m-brass-dark)" stroke-width="4" />
      <rect x="20" y="20" width="60" height="60" rx="3" fill="none" stroke="var(--m-brass-dark)" stroke-width="2" opacity="0.6" />
      <g fill="var(--m-brass-dark)">
        <circle cx="17" cy="17" r="4" />
        <circle cx="83" cy="17" r="4" />
        <circle cx="17" cy="83" r="4" />
        <circle cx="83" cy="83" r="4" />
      </g>
    </g>
  {/if}

  {#if compound}
    <g data-state={tile.state}>
      <rect x="6" y="6" width="88" height="88" rx="10" fill={compoundColor} fill-opacity="0.22" stroke={compoundColor} stroke-width="4" stroke-dasharray="9 6" />
      <text x="50" y="46" text-anchor="middle" font-size="19" font-weight="bold" fill="var(--ink)" font-family="Georgia, serif">{compoundWords[0]}</text>
      {#if compoundWords[1]}
        <text x="50" y="68" text-anchor="middle" font-size="19" font-weight="bold" fill="var(--ink)" font-family="Georgia, serif">{compoundWords[1]}</text>
      {/if}
      {#if tile.rounds > 0}
        <text x="91" y="95" text-anchor="end" font-size="22" font-weight="bold" fill="var(--ink)" font-family="var(--mono)">{tile.rounds}</text>
      {/if}
    </g>
  {/if}

  {#if tile.grate}
    <g data-state="grate" stroke="var(--ink)" stroke-width="6" stroke-linecap="round">
      <path d="M8 8v84M32 8v84M56 8v84M80 8v84" />
    </g>
    <rect x="6" y="40" width="88" height="8" rx="3" fill="var(--ink)" />
  {/if}

  {#if tile.gate}
    <g data-state="gate">
      <rect x="10" y="8" width="80" height="84" rx="5" fill="var(--wood)" stroke="var(--wood-dark)" stroke-width="5" />
      <path d="M36 12v76M64 12v76" stroke="var(--wood-dark)" stroke-width="3" />
      <rect x="10" y="30" width="80" height="9" fill="var(--wood-dark)" />
      <rect x="10" y="62" width="80" height="9" fill="var(--wood-dark)" />
    </g>
  {/if}

  {#if tile.lamp}
    <g data-state="lamp">
      <path d="M50 92V44" stroke="var(--wood-dark)" stroke-width="7" stroke-linecap="round" />
      <circle cx="50" cy="32" r="19" fill="var(--lamp)" stroke="var(--ink)" stroke-width="4" />
      <path d="M50 18v28M38 32h24" stroke="var(--ink)" stroke-width="2.5" opacity="0.6" />
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

  {#if tile.drop}
    <g data-state="drop">
      <rect x="1" y="1" width="98" height="98" fill="var(--night)" opacity="0.6" />
      <rect x="9" y="9" width="82" height="82" fill="none" stroke="var(--parchment)" stroke-width="3" stroke-dasharray="10 8" opacity="0.7" />
    </g>
  {/if}

  {#if tile.jar}
    <g data-state="jar" transform="translate(6 56) scale(1.6)">
      <path d={RUNE_ART.jar} fill="var(--lamp)" fill-opacity="0.85" stroke="var(--ink)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  {/if}
</g>

<style>
  .flames {
    transform-box: fill-box;
    transform-origin: 50% 100%;
    animation: flare 320ms ease-out both;
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
