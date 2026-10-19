<script lang="ts">
  import { PALETTE, type PaletteItem } from '../../../app/lab';

  interface Props {
    selected: PaletteItem;
    onselect: (item: PaletteItem) => void;
    /** Only these swatches (the Bench offers what the household has met); default: all. */
    items?: readonly PaletteItem[];
  }

  let { selected, onselect, items }: Props = $props();
  const shown = $derived(PALETTE.filter((p) => !items || items.includes(p.item)));

  const GLYPH: Partial<Record<PaletteItem, string>> = { '.': '⌫' };
</script>

<!-- biome-ignore lint/a11y/useSemanticElements: a fieldset would drag in browser chrome -->
<div class="palette" data-testid="palette" role="group" aria-label="Board palette">
  {#each shown as { item, name } (item)}
    <button
      type="button"
      class="swatch t-{item === '.' ? 'clear' : item.charCodeAt(0)}"
      class:on={selected === item}
      aria-pressed={selected === item}
      aria-label={name}
      data-item={item}
      onclick={() => onselect(item)}
    >
      <span class="g">{GLYPH[item] ?? item}</span>
    </button>
  {/each}
</div>

<style>
  .palette {
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    grid-auto-rows: 44px;
    flex: none;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    overflow: hidden;
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
  /* members and enemies */
  .t-68 .g,
  .t-83 .g {
    color: var(--parchment);
    background: var(--member-draughtsman);
    border-radius: 50%;
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    font-size: 17px;
  }
  .t-83 .g {
    background: var(--member-stoker);
  }
  .t-114 .g,
  .t-98 .g,
  .t-102 .g,
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
  .on {
    outline: 3px solid var(--select);
    outline-offset: -3px;
    background-color: #f6e3b4;
  }
</style>
