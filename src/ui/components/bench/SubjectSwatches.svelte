<script lang="ts">
  import { APPRENTICE_IDS, APPRENTICES, ENEMIES, ENEMY_IDS } from '$data';
  import type { PaletteEntry, PaletteItem } from '../../../app/lab';
  import { pieceArtFor } from '../../districts';
  import { TILE_STAMP } from '../board/art';
  import { CELL } from '../board/geometry';
  import PieceGlyph from '../board/PieceGlyph.svelte';
  import ApprenticeToken from '../common/ApprenticeToken.svelte';

  /**
   * UH-11. The Bench's swatches: every subject (a caster or a foe) shows a shape and a letter, so a
   * swatch reads without colour; terrain and states show their board stamp. The Lab keeps its own
   * Palette; the stamps are read from the board art, never edited.
   */
  interface Props {
    selected: PaletteItem;
    onselect: (item: PaletteItem) => void;
    entries: readonly PaletteEntry[];
  }

  let { selected, onselect, entries }: Props = $props();

  const WHO = new Map(APPRENTICE_IDS.map((id) => [APPRENTICES[id].token, APPRENTICES[id]]));
  const FOES = new Set<string>(ENEMY_IDS.map((id) => ENEMIES[id].token));
  // A swatch's board stamp, by palette token.
  const STAMP: Record<string, string> = {
    o: 'slick',
    i: 'blot',
    '*': 'fire',
    '=': 'plate',
    _: 'drop',
    '@': 'vent',
    l: 'lamp',
    h: 'grate',
    w: 'water',
    '{stain}': 'stain',
    '{pool}': 'pool',
    '{skid}': 'skidPlate',
    '{kettle}': 'kettle',
    '{wall}': 'wall',
  };
  const stampOf = (item: string): { path: string; filled: boolean } | null => {
    const id = STAMP[item] ?? (item.length === 2 && item.startsWith('w') ? 'water' : null);
    return id === null ? null : (TILE_STAMP[id] ?? null);
  };
  const letterOf = (item: string, name: string): string =>
    (/^[A-Za-z]$/.test(item) ? item : name.trim().charAt(0)).toUpperCase();
</script>

<!-- biome-ignore lint/a11y/useSemanticElements: a fieldset would drag in browser chrome -->
<div class="swatches" data-testid="palette" role="group" aria-label="Board palette">
  {#each entries as { item, name, piece } (item)}
    {@const who = WHO.get(item)}
    {@const Art = piece ? pieceArtFor(piece.art) : undefined}
    {@const stamp = stampOf(item)}
    <button
      type="button"
      class="swatch"
      class:on={selected === item}
      aria-pressed={selected === item}
      aria-label={name}
      data-item={item}
      onclick={() => onselect(item)}
    >
      {#if who}
        <ApprenticeToken def={who} size={32} />
      {:else if FOES.has(item)}
        <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" data-shape={item === 'b' ? 'square' : 'circle'}>
          {#if item === 'b'}
            <rect x="3" y="3" width="26" height="26" rx="4" fill="var(--enemy)" stroke="var(--ink)" stroke-width="2" />
          {:else}
            <circle cx="16" cy="16" r="13" fill="var(--enemy)" stroke="var(--ink)" stroke-width="2" />
          {/if}
          <text x="16" y="22" text-anchor="middle" font-size="17" font-weight="bold" fill="var(--parchment)" font-family="Georgia, serif">{letterOf(item, name)}</text>
        </svg>
      {:else if piece}
        <svg viewBox="0 0 {CELL} {CELL}" width="32" height="32" aria-hidden="true">
          {#if Art}
            <Art data={piece.data} size={CELL} />
          {:else}
            <PieceGlyph label={name} size={CELL} />
          {/if}
        </svg>
      {:else if item === 'd' || item === 'D'}
        <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" data-shape="diamond">
          <path d="M16 2 30 16 16 30 2 16z" fill="var(--parchment)" stroke="var(--ink)" stroke-width="2" />
          <text x="16" y="22" text-anchor="middle" font-size="16" font-weight="bold" fill="var(--ink)" font-family="Georgia, serif">{letterOf(item, name)}</text>
        </svg>
      {:else if stamp}
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
          <path d={stamp.path} fill={stamp.filled ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      {:else}
        <span class="g">{item === '.' ? '⌫' : item.startsWith('{') ? name.slice(0, 2) : item}</span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .swatches {
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    grid-auto-rows: 44px;
    flex: none;
    /* Two rows and a half, then scroll: the grid and Trial keep the thumb's reach. */
    max-height: 110px;
    overflow-y: auto;
    overscroll-behavior: contain;
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  .swatch {
    display: grid;
    place-items: center;
    min-width: 0;
    padding: 0;
    border: 0;
    border-right: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    background: var(--parchment-dark);
    color: var(--ink);
    cursor: pointer;
  }
  .g {
    font: bold 20px Georgia, serif;
  }
  .on {
    outline: 3px solid var(--select);
    outline-offset: -3px;
    background: #f6e3b4;
  }
</style>
