<script lang="ts">
  import { RUNES } from '$data';
  import type { ShelfSlot, ShelfTool } from '../../../app/study';
  import RuneGlyph from '../RuneGlyph.svelte';

  interface Props {
    slots: ShelfSlot[];
    tool: ShelfTool;
    /** Picks a rune, or drops the tool when the selected one is tapped again. */
    onselect: (tool: ShelfTool) => void;
    /** A slot that can't be picked up was tapped; say why. */
    onreject?: (reason: string) => void;
  }

  let { slots, tool, onselect, onreject }: Props = $props();

  function tap(slot: ShelfSlot): void {
    if (!slot.usable) {
      if (slot.reason) onreject?.(slot.reason);
      return;
    }
    const same = tool.kind === 'rune' && tool.rune === slot.rune;
    onselect(same ? { kind: 'none' } : { kind: 'rune', rune: slot.rune });
  }
</script>

<!-- biome-ignore lint/a11y/useSemanticElements: a fieldset would drag in browser chrome -->
<div class="shelf" data-testid="shelf" role="group" aria-label="Rune shelf">
  {#each slots as slot (slot.rune)}
    {@const selected = tool.kind === 'rune' && tool.rune === slot.rune}
    <button
      type="button"
      class="slot"
      class:selected
      class:spent={slot.known && !slot.usable}
      class:unknown={!slot.known}
      aria-pressed={selected}
      aria-label={slot.known
        ? `${RUNES[slot.rune].name}, ${slot.free === null ? 'unlimited' : `${slot.free} of ${slot.owned} left`}`
        : 'Unknown rune'}
      data-rune={slot.rune}
      onclick={() => tap(slot)}
    >
      <RuneGlyph
        rune={slot.known ? slot.rune : null}
        dir={slot.known && RUNES[slot.rune].arrow ? 'right' : undefined}
        size={30}
        dim={slot.known && !slot.usable}
      />
      {#if slot.known}
        <span class="count" class:poor={slot.usable && !slot.affordable}>
          <b>{slot.free === null ? '∞' : slot.free}</b>{#if slot.owned !== null}<small>/{slot.owned}</small>{/if}
        </span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .shelf {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    grid-auto-rows: 48px;
    gap: 2px;
  }
  .slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0;
    width: 100%;
    height: 48px;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    cursor: pointer;
  }
  .slot.selected {
    border: 2px solid var(--select);
    background: rgba(232, 176, 74, 0.35);
  }
  .slot.unknown {
    cursor: default;
    background: transparent;
    border-style: dashed;
  }
  .slot:focus-visible {
    outline: 3px solid var(--select);
    outline-offset: 1px;
  }
  .count {
    font: 11px/1 var(--mono);
    color: var(--ink);
  }
  .count b {
    font-size: 13px;
  }
  .count small {
    color: var(--ink-soft);
    font-size: 10px;
  }
  .spent .count {
    opacity: 0.5;
  }
  .poor b {
    color: var(--danger);
  }
</style>
