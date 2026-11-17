<script lang="ts">
  import type { Drawing } from '$data';
  import { EMPTY_SLOT, slotName } from '../../../app/drawing';

  interface Props {
    slots: (Drawing | null)[];
    slot: 0 | 1 | 2;
    onslot: (slot: 0 | 1 | 2) => void;
  }

  let { slots, slot, onslot }: Props = $props();
  const SLOTS = [0, 1, 2] as const;
</script>

<div class="tabs">
  {#each SLOTS as s (s)}
    {@const d = slots[s] ?? null}
    <button
      type="button"
      class="tab"
      class:on={slot === s}
      class:empty={d === null}
      aria-pressed={slot === s}
      data-testid="drawing-page-{s}"
      onclick={() => onslot(s)}
    >
      <span class="which">{slotName(s)}</span>
      <span class="what">{d === null ? EMPTY_SLOT : d.name}</span>
    </button>
  {/each}
</div>

<style>
  .tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-2);
  }
  .tab {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-height: 64px;
    padding: 6px var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    font: 13px Georgia, serif;
    text-align: left;
    cursor: pointer;
  }
  .on {
    border-color: var(--ink);
    background: #f6e3b4;
  }
  .which {
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .what {
    overflow-wrap: anywhere;
  }
  .empty .what {
    font-family: var(--hand);
    font-size: 15px;
    color: var(--ink-soft);
  }
</style>
