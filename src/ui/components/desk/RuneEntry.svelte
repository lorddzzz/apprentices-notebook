<script lang="ts">
  import type { RuneRow } from '../../../app/desk';
  import RuneGlyph from '../RuneGlyph.svelte';

  interface Props {
    row: RuneRow;
    open: boolean;
    ontoggle: () => void;
  }

  let { row, open, ontoggle }: Props = $props();
  const LEVELS = ['I', 'II', 'III'];
</script>

<button
  type="button"
  class="entry"
  class:open
  aria-expanded={open}
  data-testid="desk-rune-{row.rune}"
  onclick={ontoggle}
>
  <RuneGlyph rune={row.rune} size={40} />
  <span class="body">
    <span class="name">{row.name}</span>
    <span class="pips" role="img" aria-label="Level {row.level} of 3">
      {#each LEVELS as numeral, i (numeral)}
        <span class="pip" class:on={i < row.level}>{numeral}</span>
      {/each}
    </span>
    <span class="points">
      {row.points} points{row.toNext === null ? '' : `, ${row.toNext} to the next level`}
    </span>
  </span>
  {#if row.open > 0}
    <span class="mark" data-testid="desk-offer-{row.rune}">{row.open} to write</span>
  {/if}
</button>

<style>
  .entry {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    min-height: 56px;
    padding: 6px var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    font: 15px Georgia, serif;
    text-align: left;
    cursor: pointer;
  }
  .open {
    border-color: var(--ink);
    background: #f6e3b4;
  }
  .body {
    flex: 1;
    min-width: 0;
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: var(--space-2);
    align-items: center;
  }
  .name {
    font-size: 17px;
  }
  .points {
    grid-column: 1 / -1;
    font-size: 12px;
    color: var(--ink-soft);
  }
  .pips {
    display: inline-flex;
    gap: 3px;
  }
  .pip {
    min-width: 22px;
    padding: 0 3px;
    border: 1.5px solid var(--ink-faint);
    border-radius: 4px;
    font-size: 11px;
    line-height: 16px;
    text-align: center;
    color: var(--ink-faint);
  }
  .pip.on {
    border-color: var(--ink);
    background: var(--ink);
    color: var(--parchment);
  }
  .mark {
    flex: none;
    padding: 2px 8px;
    border-radius: 10px;
    background: var(--lamp);
    font-size: 12px;
    font-weight: bold;
  }
</style>
