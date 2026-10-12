<script lang="ts">
  import { RUNES, type RuneId } from '$data';
  import type { Dir } from '$engine';
  import { DIRECTIONAL_GLYPHS, FILLED_GLYPHS, RUNE_GLYPH } from '../glyphs';

  interface Props {
    rune: RuneId | null;
    dir?: Dir;
    size?: number;
    dim?: boolean;
    selected?: boolean;
  }

  let { rune, dir, size = 48, dim = false, selected = false }: Props = $props();

  const DEG: Record<Dir, number> = { up: 0, right: 90, down: 180, left: 270 };

  const def = $derived(rune ? RUNES[rune] : null);
  const family = $derived(def?.family ?? null);
  const frameColor = $derived(
    rune && family === 'material'
      ? `var(--m-${rune})`
      : family
        ? `var(--f-${family})`
        : 'var(--ink-faint)',
  );
  const notch = $derived(def?.arrow && dir ? DEG[dir] : null);
  const glyphTurn = $derived(
    rune && dir && DIRECTIONAL_GLYPHS.has(rune) ? DEG[dir] - 90 : 0,
  );
  const label = $derived(rune && def ? `${def.name}${dir ? ` ${dir}` : ''}` : 'Unknown rune');
</script>

<svg
  class="glyph"
  class:dim={dim}
  width={size}
  height={size}
  viewBox="0 0 40 40"
  role="img"
  aria-label={label}
  style:color="var(--ink)"
>
  {#if selected}
    <circle cx="20" cy="20" r="19" fill="var(--select)" opacity="0.35" />
    <circle cx="20" cy="20" r="19" fill="none" stroke="var(--select)" stroke-width="2" />
  {/if}

  {#if !rune}
    <circle cx="20" cy="20" r="16" fill="none" stroke={frameColor} stroke-width="2" stroke-dasharray="4 3" />
    <text x="20" y="26.5" text-anchor="middle" font-size="18" fill={frameColor} font-family="var(--hand)">?</text>
  {:else}
    {#if family === 'source'}
      <circle cx="20" cy="20" r="16.5" fill="var(--parchment)" stroke={frameColor} stroke-width="2.5" />
    {:else if family === 'material'}
      <rect x="4.5" y="4.5" width="31" height="31" rx="7" fill={frameColor} fill-opacity="0.25" stroke={frameColor} stroke-width="2" />
    {:else if family === 'shape'}
      <rect x="5" y="5" width="30" height="30" fill="var(--parchment)" stroke={frameColor} stroke-width="2" />
    {:else if family === 'trigger'}
      <path d="M20 2 38 20 20 38 2 20z" fill="var(--parchment)" stroke={frameColor} stroke-width="2" stroke-linejoin="round" />
    {:else}
      <circle cx="20" cy="20" r="18" fill={frameColor} fill-opacity="0.18" />
      <circle cx="20" cy="20" r="15" fill="none" stroke={frameColor} stroke-width="2" stroke-dasharray="3.5 2.5" />
    {/if}

    {#if notch !== null}
      <path d="M20 0.5 15.5 6.5h9z" fill={frameColor} transform="rotate({notch} 20 20)" />
    {/if}

    <g transform="translate(20 20) rotate({glyphTurn}) scale(0.7) translate(-12 -12)">
      <path
        d={RUNE_GLYPH[rune]}
        fill={FILLED_GLYPHS.has(rune) ? 'currentColor' : 'none'}
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </g>
  {/if}
</svg>

<style>
  .glyph {
    display: block;
    flex: none;
    overflow: visible;
  }
  .dim {
    opacity: 0.35;
  }
</style>
