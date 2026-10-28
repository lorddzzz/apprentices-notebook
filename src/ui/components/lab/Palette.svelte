<script lang="ts">
  import { APPRENTICE_IDS, APPRENTICES } from '$data';
  import { PALETTE, type PaletteEntry, type PaletteItem } from '../../../app/lab';
  import { pieceArtFor } from '../../districts';
  import { CELL } from '../board/geometry';
  import PieceGlyph from '../board/PieceGlyph.svelte';
  import ApprenticeToken from '../common/ApprenticeToken.svelte';

  interface Props {
    selected: PaletteItem;
    onselect: (item: PaletteItem) => void;
    /** The swatches to show (the Bench offers what the household has met); default: the Lab's. */
    entries?: readonly PaletteEntry[];
  }

  let { selected, onselect, entries = PALETTE }: Props = $props();

  const GLYPH: Partial<Record<PaletteItem, string>> = {
    '.': '⌫',
    'w>': '≈→',
    wv: '≈↓',
    'w<': '←≈',
    'w^': '≈↑',
  };
  // Apprentices paint with their own token (letter, hue, shape), whoever the registry holds.
  const WHO = new Map(APPRENTICE_IDS.map((id) => [APPRENTICES[id].token, APPRENTICES[id]]));
</script>

<!-- biome-ignore lint/a11y/useSemanticElements: a fieldset would drag in browser chrome -->
<div class="palette" data-testid="palette" role="group" aria-label="Board palette">
  {#each entries as { item, name, piece } (item)}
    {@const who = WHO.get(item)}
    {@const Art = piece ? pieceArtFor(piece.art) : undefined}
    <button
      type="button"
      class="swatch t-{item === '.' ? 'clear' : item.charCodeAt(0)}"
      class:on={selected === item}
      aria-pressed={selected === item}
      aria-label={name}
      data-item={item}
      onclick={() => onselect(item)}
    >
      {#if who}
        <ApprenticeToken def={who} size={34} />
      {:else if piece}
        <!-- A registered piece draws itself; one with no art shows the board's fallback glyph. -->
        <svg class="art" viewBox="0 0 {CELL} {CELL}" width="34" height="34" aria-hidden="true">
          {#if Art}
            <Art data={piece.data} size={CELL} />
          {:else}
            <PieceGlyph label={name} size={CELL} />
          {/if}
        </svg>
      {:else}
        <span class="g">{GLYPH[item] ?? (item.startsWith('{') ? name.slice(0, 2) : item)}</span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .palette {
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    grid-auto-rows: 44px;
    flex: none;
    /* Three rows and a half, then scroll: nine apprentices must not squeeze a 7×9 board below 44px cells. */
    max-height: 154px;
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
    font: 700 20px var(--mono);
  }
  /* foes */
  .t-114 .g,
  .t-98 .g,
  .t-102 .g,
  .t-101 .g,
  .t-110 .g,
  .t-109 .g,
  .t-77 .g,
  .t-100 .g {
    color: var(--parchment);
    background: var(--enemy);
    border-radius: 50%;
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    font-size: 17px;
  }
  .t-98 .g {
    background: var(--m-brass);
    color: var(--m-brass-dark);
    border-radius: 6px;
  }
  .t-111 {
    background: var(--m-oil-tint);
  }
  .t-105 .g {
    color: var(--m-ink);
  }
  .t-126 .g {
    color: var(--shield);
  }
  .t-42 {
    background: var(--m-fire-tint);
  }
  .t-61 {
    background: var(--m-brass);
  }
  .t-64 .g {
    color: var(--vent);
  }
  .t-80 .g {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border: 2px dashed var(--select);
    border-radius: 6px;
    color: var(--ink);
    font-size: 17px;
  }
  .on {
    outline: 3px solid var(--select);
    outline-offset: -3px;
    background-color: #f6e3b4;
  }
</style>
