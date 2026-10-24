<script lang="ts">
  import { crossroadsView } from '../../app/crossroads';
  import { game } from '../../app/instance';
  import { href } from '../../app/routes';
  import CrossroadsChoices from '../components/trip/CrossroadsChoices.svelte';
  import LootChips from '../components/trip/LootChips.svelte';
  import TripStatus from '../components/trip/TripStatus.svelte';

  const trip = $derived(game.save.trip);
  // The district module names the ways on; the Seam and the canals get push and return (P4).
  const view = $derived(trip ? crossroadsView(trip) : null);
</script>

{#if trip && view}
  <section class="crossroads" data-testid="crossroads">
    <header>
      <h1>{view.heading}</h1>
      <p>You are deeper than the lamplight reaches. Look at what you have left.</p>
    </header>

    <div class="mid">
      <TripStatus {trip} profile={game.profile} large />

      <div class="finds">
        <h2>Carried, not yet safe</h2>
        <LootChips items={trip.loot} />
      </div>
    </div>

    <div class="choices">
      <CrossroadsChoices
        {view}
        onway={(id) => (id === 'push' ? game.pushOn() : game.chooseWay(id))}
        onhome={() => game.returnHome()}
      />
      <a class="link" href={href('codex')}>Read the notebook</a>
    </div>
  </section>
{/if}

<style>
  .crossroads {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    height: 100%;
    padding: var(--space-3) var(--space-3) calc(var(--space-3) + 14px);
  }
  h1 {
    margin: 0;
    font-size: 26px;
    font-weight: normal;
  }
  header p {
    margin: 4px 0 0;
    font-size: 14px;
    font-style: italic;
    color: var(--ink-soft);
  }
  h2 {
    margin: 0 0 var(--space-2);
    font-size: 13px;
    font-weight: normal;
    font-family: var(--mono);
    color: var(--ink-soft);
  }
  .mid {
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-3);
    min-height: 0;
    overflow-y: auto;
  }
  .choices {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: var(--tap);
  }
</style>
