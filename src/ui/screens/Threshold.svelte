<script lang="ts">
  import { DISTRICTS } from '$data';
  import { game } from '../../app/instance';
  import { go, router } from '../../app/router.svelte';
  import { href } from '../../app/routes';
  import { planThreshold } from '../../app/threshold';
  import { threshold } from '../../app/threshold.svelte';
  import { placeInText } from '../../app/tripviews';
  import BattleView from '../components/battle/BattleView.svelte';
  import Button from '../components/common/Button.svelte';

  const d = $derived(router.params.get('d'));
  const plan = $derived(planThreshold(game.profile, d));
  const session = $derived(threshold.session);
  const burnt = $derived(threshold.solved && threshold.district !== null);
  const gate = $derived(threshold.district ? DISTRICTS[threshold.district] : null);
  const room = $derived(gate && gate.gate.kind === 'threshold' ? gate.gate.room : null);

  $effect(() => {
    threshold.load(d);
  });

  // However the screen is left (Leave, the back gesture), the room is forgotten: the next visit
  // starts fresh with the current lattices (K-22).
  $effect(() => () => threshold.leave());

  function leave(): void {
    threshold.leave();
    go('map');
  }
</script>

<div class="threshold" data-testid="threshold">
  {#if burnt && gate}
    <section class="moment" data-testid="threshold-solved">
      <h1>The gate burns</h1>
      <p class="line">"{gate.line}"</p>
      <p class="owner">The way to {placeInText(gate.name)} is open.</p>
      <Button label="Back to the map" onclick={leave} testid="threshold-map" />
    </section>
  {:else if session && room && (plan.ok || threshold.won)}
    {#key session}
      {#snippet top()}
        <header class="bar">
          <div class="row">
            <button type="button" class="tap" data-testid="threshold-leave" onclick={leave}>
              &larr; Leave
            </button>
            <h1>{room.name}</h1>
            <button type="button" class="tap" data-testid="threshold-retry" onclick={() => threshold.retry()}>
              Retry
            </button>
          </div>
          <p class="goal" data-testid="threshold-goal"><b>Drop the rat in the canal.</b> {room.note}</p>
        </header>
      {/snippet}
      <BattleView
        {session}
        {top}
        continueLabel={session.state.phase === 'won' ? 'Onward' : 'Retry'}
        oncontinue={() => threshold.finish()}
      />
    {/key}
  {:else if !plan.ok}
    <section class="moment" data-testid="threshold-note">
      <h1>Nothing to try here</h1>
      <p>{plan.why}</p>
      <a class="back" href={href('map')}>Back to the map</a>
    </section>
  {/if}
</div>

<style>
  .threshold {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  .bar {
    flex: none;
    padding: 0 var(--space-1);
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-height: 44px;
  }
  h1 {
    flex: 1;
    margin: 0;
    font-size: 17px;
    text-align: center;
  }
  .tap {
    min-height: 44px;
    padding: 0 var(--space-1);
    border: 0;
    background: none;
    color: var(--ink);
    font: 15px Georgia, serif;
    cursor: pointer;
  }
  .goal {
    margin: 0;
    color: var(--ink-soft);
    font-size: 13px;
    font-style: italic;
  }
  .goal b {
    color: var(--ink);
    font-style: normal;
  }
  .moment {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: 18vh var(--space-4) var(--space-4);
    text-align: center;
  }
  .line {
    margin: 0;
    font-style: italic;
    font-size: 18px;
  }
  .owner {
    margin: 0;
    color: var(--ink-soft);
  }
  .back {
    color: var(--ink);
  }
</style>
