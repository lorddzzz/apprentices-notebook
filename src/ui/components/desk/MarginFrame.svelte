<script lang="ts">
  import { type FrameView, levelNumeral, spendText } from '../../../app/desk';
  import SolventIcon from '../SolventIcon.svelte';

  interface Props {
    frame: FrameView;
    /** "Level I", "Capstone". */
    title: string;
    onwrite: (variantId: string) => void;
  }

  let { frame, title, onwrite }: Props = $props();
  const written = $derived(frame.state === 'filled');
</script>

<div class="frame {frame.state}" data-testid="frame-{frame.key}" data-state={frame.state}>
  <p class="head">
    <span class="title">{title}</span>
    <span class="state">
      {#if frame.state === 'filled'}Written{:else if frame.state === 'open'}Open{:else}Locked{/if}
    </span>
  </p>
  {#if frame.state === 'locked'}
    <p class="empty" data-testid="frame-locked-text">
      Level {levelNumeral(frame.level)} at {frame.threshold} points
      <span class="more">{frame.missing} more</span>
    </p>
  {:else}
    <div class="pair">
      {#each frame.variants as v (v.id)}
        <button
          type="button"
          class="variant"
          class:chosen={v.chosen}
          aria-pressed={v.chosen}
          disabled={!written && frame.blocked !== null}
          data-testid="variant-{v.id}"
          onclick={() => onwrite(v.id)}
        >
          <span class="text">{v.text}</span>
          {#if v.credit}<span class="credit">{v.credit}</span>{/if}
          <span class="tag">{v.chosen ? 'Written' : written ? 'Switch, free' : 'Write'}</span>
        </button>
      {/each}
    </div>
    <p class="cost" data-testid="frame-cost">
      {#if written}
        Switching costs nothing.
      {:else if frame.spends.length > 0}
        {#each frame.spends as s (s.solvent)}<SolventIcon solvent={s.solvent} size={16} />{/each}
        <span>
          {spendText(frame.spends)} (you hold
          {frame.spends.length === 1
            ? frame.spends[0]?.count
            : frame.spends.map((s) => `${s.count} ${s.name}`).join(', ')}).
        </span>
      {:else}
        <span class="bad">{frame.blocked}</span>
      {/if}
    </p>
  {/if}
</div>

<style>
  .frame {
    padding: var(--space-2);
    border: 2px solid var(--ink);
    border-radius: var(--radius);
    background: rgba(43, 33, 24, 0.05);
  }
  .frame.open {
    border-style: dashed;
  }
  .frame.locked {
    border-style: dashed;
    border-color: var(--ink-faint);
    background: transparent;
  }
  .head {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    margin: 0 0 var(--space-1);
    font-size: 12px;
    color: var(--ink-soft);
  }
  .title {
    font-weight: bold;
  }
  .state {
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-size: 11px;
  }
  .empty {
    margin: 0;
    padding: var(--space-2) 0;
    font-size: 14px;
    color: var(--ink-soft);
  }
  .more {
    margin-left: 4px;
    font-size: 12px;
    font-style: italic;
  }
  .pair {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: var(--space-2);
  }
  .variant {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 6px;
    min-height: 96px;
    padding: var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    font: 13px/1.3 Georgia, serif;
    text-align: left;
    cursor: pointer;
  }
  .variant:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .chosen {
    border-color: var(--ink);
    background: #f6e3b4;
  }
  .text {
    font-family: var(--hand);
    font-size: 15px;
    line-height: 1.2;
  }
  .credit {
    font-size: 11px;
    font-style: italic;
    color: var(--ink-soft);
  }
  .tag {
    font-size: 12px;
    font-weight: bold;
    color: var(--ink-soft);
  }
  .chosen .tag {
    color: var(--ink);
  }
  .cost {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    margin: var(--space-2) 0 0;
    font-size: 12px;
    color: var(--ink-soft);
  }
  .bad {
    color: var(--danger);
    font-weight: bold;
  }
</style>
