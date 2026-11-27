<script lang="ts">
  import { DISTRICTS } from '$data';
  import { game } from '../../app/instance';
  import { go, router } from '../../app/router.svelte';
  import { planThreshold, thresholdRoom } from '../../app/threshold';
  import { threshold } from '../../app/threshold.svelte';
  import { placeInText } from '../../app/tripviews';
  import BattleView from '../components/battle/BattleView.svelte';
  import ActionButton from '../components/common/ActionButton.svelte';
  import AppHeader from '../components/common/AppHeader.svelte';
  import ThresholdIntro from '../components/trip/ThresholdIntro.svelte';
  import { crestFor } from '../districts';

  const d = $derived(router.params.get('d'));
  const plan = $derived(planThreshold(game.profile, d));
  const session = $derived(threshold.session);
  const burnt = $derived(threshold.solved && threshold.district !== null);
  const gate = $derived(threshold.district ? DISTRICTS[threshold.district] : null);
  const room = $derived(threshold.district ? (thresholdRoom(threshold.district) ?? null) : null);

  // UT-D1: the intro shows first, again for another route or room; Retry keeps the live room.
  // The intro is "entered" only for the route and room it was entered on.
  let enteredKey = $state<string | null>(null);
  const roomKey = $derived(`${d}|${threshold.district}`);
  const entered = $derived(enteredKey === roomKey);
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
      <ActionButton onclick={leave} testid="threshold-map">Back to the map</ActionButton>
    </section>
  {:else if session && room && threshold.district && (plan.ok || threshold.won)}
    {@const district = threshold.district}
    <section class="stage" data-district={district}>
      <AppHeader
        variant="city"
        title={room.name}
        subtitle={DISTRICTS[district].name}
        crest={crestFor(district)}
      >
        {#snippet right()}
          <button type="button" class="tap" data-testid="threshold-leave" onclick={leave}>
            &larr; Leave
          </button>
          {#if entered}
            <button type="button" class="tap" data-testid="threshold-retry" onclick={() => threshold.retry()}>
              Retry
            </button>
          {/if}
        {/snippet}
      </AppHeader>
      {#if entered}
        {#key session}
          {#snippet top()}
            <p class="goal" data-testid="threshold-goal"><b>{room.goalText}</b> {room.note}</p>
          {/snippet}
          <BattleView
            {session}
            {top}
            continueLabel={session.state.phase === 'won' ? 'Onward' : 'Retry'}
            oncontinue={() => threshold.finish()}
          />
        {/key}
      {:else}
        <ThresholdIntro {district} {room} {session} onenter={() => (enteredKey = roomKey)} />
      {/if}
    </section>
  {:else if !plan.ok}
    <section class="moment" data-testid="threshold-note">
      <h1>Nothing to try here</h1>
      <p>{plan.why}</p>
      <ActionButton onclick={() => go('map')} testid="threshold-back">Back to the map</ActionButton>
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
  .stage {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    min-height: 0;
  }
  .tap {
    min-width: 44px;
    min-height: 44px;
    padding: 0 var(--space-1);
    border: 0;
    background: none;
    color: inherit;
    font: 15px Georgia, serif;
    cursor: pointer;
  }
  .goal {
    margin: 0;
    padding: 0 var(--space-2);
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
  h1 {
    margin: 0;
    font-size: 22px;
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
  .moment :global(.action) {
    min-height: 52px;
    min-width: 220px;
  }
</style>
