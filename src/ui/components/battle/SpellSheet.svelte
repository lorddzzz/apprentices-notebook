<script lang="ts">
  import { describeSpell, type Spell, type SpellKey } from '$engine';
  import { armFromSheet, type SpellChipModel } from '../../../app/spellChip';
  import Pips from '../common/Pips.svelte';
  import Sheet from '../common/Sheet.svelte';
  import RuneGlyph from '../RuneGlyph.svelte';

  interface Props {
    open: boolean;
    /** Whose spells these are, for the title. */
    who: string;
    spells: { spell: Spell; charges: number; usable: boolean }[];
    chip: SpellChipModel;
    onchoose: (key: SpellKey) => void;
    onclose: () => void;
  }

  let { open, who, spells, chip, onchoose, onclose }: Props = $props();

  function pick(key: SpellKey): void {
    if (armFromSheet(chip, key, onchoose)) onclose();
  }
</script>

<Sheet {open} title="{who}'s spells" {onclose}>
  <ul class="spells" data-testid="spell-sheet">
    {#each spells as { spell, charges, usable } (spell.key)}
      <li>
        <button
          type="button"
          class="row"
          class:active={chip.active === spell.key}
          class:unusable={!usable}
          aria-disabled={!usable}
          aria-pressed={chip.active === spell.key}
          data-testid="spell-row"
          onclick={() => pick(spell.key)}
        >
          <RuneGlyph rune={spell.source} dir={spell.path[0]?.dir} size={36} />
          <span class="text">
            <span class="desc">{describeSpell(spell)}</span>
            <span class="meta">
              <Pips value={charges} max={spell.charges} tone="charge" />
              {#if !usable}<span class="why">{charges > 0 ? 'Already acted' : 'No charges left'}</span>{/if}
            </span>
          </span>
        </button>
      </li>
    {/each}
  </ul>
</Sheet>

<style>
  .spells {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    min-height: 56px;
    padding: var(--space-1) var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    font-family: var(--font-serif);
    text-align: left;
    cursor: pointer;
  }
  .row.active {
    border-color: var(--select);
    box-shadow: 0 0 0 2px var(--select);
  }
  .row.unusable {
    border-style: dashed;
    opacity: 0.55;
    cursor: default;
  }
  .row:focus-visible {
    outline: 3px solid var(--select);
    outline-offset: 1px;
  }
  .text {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .desc {
    font-size: var(--type-md);
    line-height: 1.2;
  }
  .meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--type-xs);
  }
  .why {
    font-style: italic;
  }
</style>
