<script lang="ts">
  import type { ApprenticeDef, TokenShape } from '$data';

  /** A named size: 'board' fills a 100-unit cell, 'strip' suits chips and rows, 'ledger' sits in text. */
  type Size = 'board' | 'strip' | 'ledger';

  interface Props {
    /** Only `token`, `look` and `name` are read, so any registry entry (or a recruit stub) renders. */
    def: Pick<ApprenticeDef<string>, 'token' | 'look' | 'name'>;
    size?: Size | number;
    /** Set when the token is placed inside another `<svg>` (the board); omitted for inline use. */
    x?: number;
    y?: number;
    /** Decorative next to the name by default; set to label it on its own. */
    label?: boolean;
  }

  let { def, size = 'strip', x, y, label = false }: Props = $props();

  const PX: Record<Size, number> = { board: 100, strip: 22, ledger: 18 };
  const px = $derived(typeof size === 'number' ? size : PX[size]);
  // Small tokens need a heavier outline and a bigger letter to read.
  const small = $derived(px < 40);
  const stroke = $derived(small ? 10 : 7);

  interface Look {
    /** Letter size and baseline shift for the shape's visual centre. */
    fs: number;
    dy: number;
  }
  const LOOK: Record<TokenShape, Look> = {
    circle: { fs: 38, dy: 0 },
    square: { fs: 38, dy: 0 },
    triangle: { fs: 30, dy: 9 },
    diamond: { fs: 30, dy: 0 },
    hexagon: { fs: 36, dy: 0 },
    pentagon: { fs: 34, dy: 3 },
    star: { fs: 28, dy: 3 },
    cross: { fs: 28, dy: 0 },
    drop: { fs: 32, dy: 7 },
    ring: { fs: 30, dy: 0 },
  };
  const DROP = 'M50 12C62 30 78 42 78 60a28 28 0 0 1-56 0C22 42 38 30 50 12z';
  const CROSS = 'M36 14h28v22h22v28H64v22H36V64H14V36h22z';
  const look = $derived(LOOK[def.look.shape]);
  const fs = $derived(small ? look.fs * 1.12 : look.fs);
  const color = $derived(`var(--hue-${def.look.hue})`);
  const shape = $derived(def.look.shape);
</script>

<svg
  class="token"
  {x}
  {y}
  width={px}
  height={px}
  viewBox="0 0 100 100"
  data-shape={shape}
  data-hue={def.look.hue}
  role={label ? 'img' : undefined}
  aria-label={label ? def.name : undefined}
  aria-hidden={label ? undefined : 'true'}
>
  <g fill="var(--token-fill)" stroke={color} stroke-width={stroke} stroke-linejoin="round">
    {#if shape === 'circle'}
      <circle cx="50" cy="50" r="32" />
    {:else if shape === 'square'}
      <rect x="18" y="18" width="64" height="64" rx="8" />
    {:else if shape === 'triangle'}
      <polygon points="50,16 84.6,76 15.4,76" />
    {:else if shape === 'diamond'}
      <polygon points="50,14 86,50 50,86 14,50" />
    {:else if shape === 'hexagon'}
      <polygon points="86,50 68,81.2 32,81.2 14,50 32,18.8 68,18.8" />
    {:else if shape === 'pentagon'}
      <polygon points="50,15 86.1,41.3 72.3,83.7 27.7,83.7 13.9,41.3" />
    {:else if shape === 'star'}
      <polygon points="50,10 64.1,34.6 91.8,40.4 72.8,61.4 75.9,89.6 50,78 24.1,89.6 27.2,61.4 8.2,40.4 35.9,34.6" />
    {:else if shape === 'cross'}
      <path d={CROSS} />
    {:else if shape === 'drop'}
      <path d={DROP} />
    {:else}
      <circle cx="50" cy="50" r="34" />
      <circle cx="50" cy="50" r="22" fill="none" stroke-width={stroke * 0.5} />
    {/if}
  </g>
  <text
    x="50"
    y={63 + look.dy}
    text-anchor="middle"
    font-size={fs}
    font-weight="bold"
    fill={color}
    font-family="Georgia, serif">{def.token}</text
  >
</svg>

<style>
  .token {
    flex: none;
    overflow: visible;
    vertical-align: -0.2em;
  }
</style>
