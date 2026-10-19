<script lang="ts">
  import { SOLVENT_IDS, SOLVENTS, type SolventId } from '$data';
  import SolventIcon from '../SolventIcon.svelte';

  interface Props {
    counts: Record<SolventId, number>;
    chosen: SolventId | null;
    onpick: (s: SolventId | null) => void;
  }

  let { counts, chosen, onpick }: Props = $props();
  const owned = $derived(SOLVENT_IDS.filter((s) => counts[s] > 0));
</script>

<div class="row" data-testid="solvents">
  <button
    type="button"
    class="chip"
    class:on={chosen === null}
    aria-pressed={chosen === null}
    data-testid="solvent-plain"
    onclick={() => onpick(null)}>Plain</button
  >
  {#each owned as s (s)}
    <button
      type="button"
      class="chip"
      class:on={chosen === s}
      aria-pressed={chosen === s}
      data-testid="solvent-{s}"
      onclick={() => onpick(s)}
    >
      <SolventIcon solvent={s} size={20} />
      {SOLVENTS[s].name} <b>×{counts[s]}</b>
    </button>
  {/each}
</div>

<style>
  .row {
    display: flex;
    gap: var(--space-2);
    overflow-x: auto;
    flex: none;
  }
  .chip {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 40px;
    padding: 0 var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    font: 14px Georgia, serif;
    cursor: pointer;
  }
  .on {
    border-color: var(--ink);
    background: #f6e3b4;
  }
</style>
