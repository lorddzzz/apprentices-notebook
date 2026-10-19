<script lang="ts">
  import type { Coord, Dir } from '$engine';
  import type { TileView } from '../../../app/view';
  import { DROP, maxHits, PLATE_LIKE } from './art';
  import { cellOrigin } from './geometry';

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
  const BLOT =
    'M28 54C25 36 42 24 56 29C72 23 82 40 75 55C84 68 68 80 54 73C42 82 24 71 28 54Z';
  // Clouds, brand clouds, grease fog and banks are drawn over the units by SteamLayer.
  const LINGERING = ['stain', 'pool', 'skidPlate', 'kettle', 'wall'];
  // Plates, skid plates, kettles and walls wear: pips for the hits left, a crack on a damaged wall.
  const pips = $derived(tile.state && PLATE_LIKE.has(tile.state) ? tile.hits : 0);
  const worn = $derived(tile.state === 'wall' && tile.hits > 0 && tile.hits < maxHits('wall'));
  const timed = $derived(
    tile.state !== null && LINGERING.includes(tile.state) && tile.rounds > 0 ? tile.rounds : 0,
  );
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

  <!-- Stain: a blot ringed with a dashed line, a mark's drop pressed into it -->
  {#if tile.state === 'stain'}
    <g data-state="stain">
      <path d={BLOT} fill="var(--m-ink)" opacity="0.85" />
      <circle cx="20" cy="24" r="4" fill="var(--m-ink)" opacity="0.7" />
      <circle cx="84" cy="80" r="3" fill="var(--m-ink)" opacity="0.7" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="var(--m-ink)" stroke-width="3.5" stroke-dasharray="3 9" stroke-linecap="round" />
      <path d={DROP} transform="translate(51 56) scale(1.1)" fill="var(--parchment)" opacity="0.92" />
    </g>
  {/if}

  <!-- Pool: oil on the tile, rippling out to its neighbours -->
  {#if tile.state === 'pool'}
    <g data-state="pool">
      <rect x="1" y="1" width="98" height="98" fill="var(--m-oil-tint)" />
      <g stroke="var(--m-oil)" stroke-width="3" stroke-linecap="round" opacity="0.6" fill="none">
        <path d="M14 46 46 14" />
        <path d="M44 88 88 44" />
      </g>
      <g fill="none" stroke="var(--m-oil)" stroke-width="4.5" opacity="0.85">
        <ellipse cx="50" cy="52" rx="14" ry="11" />
        <ellipse cx="50" cy="52" rx="28" ry="22" stroke-dasharray="14 7" />
        <ellipse cx="50" cy="52" rx="42" ry="34" stroke-dasharray="5 11" stroke-linecap="round" />
      </g>
      <path d="M50 42c-4 5-6 7-6 10a6 6 0 0 0 12 0c0-3-2-5-6-10z" fill="var(--m-oil)" />
    </g>
  {/if}

  <!-- Skid plate: a plate tipped on grease, sheen lines trailing from it -->
  {#if tile.state === 'skidPlate'}
    <g data-state="skidPlate">
      <g stroke="var(--m-oil)" stroke-width="4" stroke-linecap="round" opacity="0.8">
        <path d="M6 70 22 54M2 88 28 62M78 94 96 76" />
      </g>
      <g transform="rotate(-6 50 50)">
        <rect x="14" y="14" width="72" height="72" rx="6" fill="var(--m-brass)" stroke="var(--m-brass-dark)" stroke-width="4" />
        <g fill="none" stroke="var(--m-brass-dark)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M34 36 52 50 34 64" />
          <path d="M52 36 70 50 52 64" />
        </g>
      </g>
    </g>
  {/if}

  <!-- Kettle: a hot plate with a kettle on it, steam from the spout -->
  {#if tile.state === 'kettle'}
    <g data-state="kettle">
      <rect x="8" y="8" width="84" height="84" rx="6" fill="var(--m-brass)" stroke="var(--m-brass-dark)" stroke-width="4" />
      <path d="M24 70c0-16 11-24 26-24s26 8 26 24c0 4-2 6-6 6H30c-4 0-6-2-6-6z" fill="var(--vent)" stroke="var(--ink)" stroke-width="3.5" stroke-linejoin="round" />
      <path d="M72 58l14-9 3 5-14 11z" fill="var(--vent)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round" />
      <path d="M27 58c-10-3-12-14-3-17" fill="none" stroke="var(--ink)" stroke-width="4" stroke-linecap="round" />
      <circle cx="50" cy="43" r="4.5" fill="var(--ink)" />
      <g fill="none" stroke="var(--m-steam)" stroke-width="4.5" stroke-linecap="round">
        <path d="M90 44c-5-5 4-8-1-14" />
        <path d="M44 34c-4-5 3-7-1-12M58 34c-4-5 3-7-1-12" />
      </g>
    </g>
  {/if}

  <!-- Wall: courses of brass bricks; a damaged wall shows its crack -->
  {#if tile.state === 'wall'}
    <g data-state="wall">
      <rect x="5" y="12" width="90" height="76" rx="3" fill="var(--m-brass)" stroke="var(--m-brass-dark)" stroke-width="4.5" />
      <g stroke="var(--m-brass-dark)" stroke-width="3.5" stroke-linecap="round">
        <path d="M5 37H95M5 63H95" />
        <path d="M50 12V37M28 37V63M72 37V63M50 63V88" />
      </g>
      {#if worn}
        <path d="M46 12 55 31 41 47 57 66 47 88" fill="none" stroke="var(--parchment)" stroke-width="7" stroke-linejoin="round" />
        <path d="M46 12 55 31 41 47 57 66 47 88" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round" />
      {/if}
    </g>
  {/if}

  {#if pips > 0}
    <g data-trait="hits" fill="var(--ink)" stroke="var(--parchment)" stroke-width="2.5">
      {#each { length: pips } as _, i (i)}
        <circle cx={14 + i * 14} cy="14" r="5.5" />
      {/each}
    </g>
  {/if}

  {#if timed > 0}
    <text x="91" y="95" text-anchor="end" font-size="22" font-weight="bold" fill="var(--ink)" stroke="var(--parchment)" stroke-width="4" paint-order="stroke" font-family="var(--mono)">{timed}</text>
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
