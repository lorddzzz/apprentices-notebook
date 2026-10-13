<script lang="ts">
  import { RUNES, type RuneId, SOLVENTS, type SolventId } from '$data';
  import type { SlotName } from '../../../app/bench';
  import RuneGlyph from '../RuneGlyph.svelte';
  import SolventIcon from '../SolventIcon.svelte';

  interface Props {
    left: RuneId | null;
    right: RuneId | null;
    solvent: SolventId | null;
    picking: SlotName | null;
    onslot: (slot: SlotName) => void;
    /** Empties a filled slot. */
    onclear: (slot: SlotName) => void;
  }

  let { left, right, solvent, picking, onslot, onclear }: Props = $props();

  const caption: Record<SlotName, string> = { left: 'Rune', right: 'Rune', solvent: 'Solvent' };
</script>

{#snippet slotButton(slot: SlotName, rune: RuneId | null, sol: SolventId | null)}
  {@const filled = rune !== null || sol !== null}
  <div class="cell">
    <button
      type="button"
      class="slot"
      class:open={picking === slot}
      class:filled
      aria-label="{caption[slot]} slot: {rune ? RUNES[rune].name : sol ? SOLVENTS[sol].name : 'empty'}"
      data-testid="slot-{slot}"
      onclick={() => onslot(slot)}
    >
      {#if rune}
        <RuneGlyph {rune} dir={RUNES[rune].arrow ? 'right' : undefined} size={34} />
        <span class="name">{RUNES[rune].name}</span>
      {:else if sol}
        <SolventIcon solvent={sol} size={32} />
        <span class="name">{SOLVENTS[sol].name}</span>
      {:else}
        <span class="plus" aria-hidden="true">+</span>
        <span class="name faint">{caption[slot]}</span>
      {/if}
    </button>
    {#if filled}
      <button
        type="button"
        class="clear"
        aria-label="Empty the {caption[slot]} slot"
        data-testid="clear-{slot}"
        onclick={() => onclear(slot)}
      >
        &times;
      </button>
    {/if}
  </div>
{/snippet}

<div class="slots" data-testid="slots">
  {@render slotButton('left', left, null)}
  <span class="join" aria-hidden="true">+</span>
  {@render slotButton('right', right, null)}
  <span class="join" aria-hidden="true">+</span>
  {@render slotButton('solvent', null, solvent)}
</div>

<style>
  .slots {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }
  .cell {
    position: relative;
    flex: 1;
    min-width: 0;
  }
  .slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    width: 100%;
    height: 68px;
    padding: 2px;
    border: 2px dashed var(--line);
    border-radius: var(--radius);
    background: transparent;
    color: var(--ink);
    cursor: pointer;
  }
  .slot.filled {
    border-style: solid;
    background: var(--parchment-dark);
  }
  .slot.open {
    border-color: var(--select);
    background: rgba(232, 176, 74, 0.35);
  }
  .slot:focus-visible,
  .clear:focus-visible {
    outline: 3px solid var(--select);
    outline-offset: 1px;
  }
  .plus {
    font-size: 24px;
    line-height: 1;
    color: var(--ink-faint);
  }
  .name {
    font-size: 13px;
    line-height: 1;
  }
  .faint {
    color: var(--ink-soft);
  }
  .join {
    flex: none;
    font-size: 18px;
    color: var(--ink-soft);
  }
  .clear {
    position: absolute;
    top: -6px;
    right: -6px;
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 50%;
    background: var(--parchment);
    color: var(--ink-soft);
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
  }
  /* the visible disc is 24px; the tap area is 44px around it */
  .clear::after {
    content: '';
    position: absolute;
    inset: -10px;
  }
</style>
