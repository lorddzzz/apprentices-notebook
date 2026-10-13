<script lang="ts">
  import Button from '../common/Button.svelte';

  interface Props {
    phase: 'won' | 'lost';
    label: string;
    oncontinue: () => void;
    onlog: () => void;
  }

  let { phase, label, oncontinue, onlog }: Props = $props();
</script>

<div class="end" data-testid="end-overlay" role="dialog" aria-label={phase === 'won' ? 'Victory' : 'Defeat'}>
  <div class="card" class:lost={phase === 'lost'}>
    <h2>{phase === 'won' ? 'The party wins' : 'The party is wiped out'}</h2>
    <div class="buttons">
      <Button variant="quiet" label="Log" onclick={onlog} />
      <Button label={label} onclick={oncontinue} testid="continue" />
    </div>
  </div>
</div>

<style>
  .end {
    position: absolute;
    inset: 0;
    z-index: 5;
    display: grid;
    place-items: center;
    background: rgba(241, 230, 204, 0.55);
  }
  .card {
    padding: var(--space-3) var(--space-4);
    border: 2px solid var(--ink);
    border-radius: var(--radius);
    background: var(--parchment);
    box-shadow: 0 6px 20px rgba(43, 33, 24, 0.35);
    text-align: center;
  }
  .lost {
    border-color: var(--danger);
  }
  h2 {
    margin: 0 0 var(--space-3);
    font-size: 22px;
    font-weight: normal;
  }
  .buttons {
    display: flex;
    gap: var(--space-2);
    justify-content: center;
  }
</style>
