<script lang="ts">
  import { encounterTitle } from '../../app/describe';
  import { game } from '../../app/instance';
  import { href } from '../../app/routes';
  import Button from '../components/common/Button.svelte';
  import OfferCard from '../components/trip/OfferCard.svelte';
  import TripStatus from '../components/trip/TripStatus.svelte';

  const trip = $derived(game.save.trip);
  let chosen = $state<number | null>(null);

  // Offers shrink after each pick (the heart gives two): never keep a stale index.
  const pick = $derived(trip && chosen !== null && chosen < trip.offers.length ? chosen : null);

  function take(): void {
    const index = pick;
    if (index === null) return;
    chosen = null;
    game.take(index);
  }
</script>

{#if trip}
  <section class="loot" data-testid="loot">
    <header>
      <h1>Spoils of {encounterTitle(trip.encounter).toLowerCase()}</h1>
      <p class="picks" data-testid="picks-left">
        {trip.picksLeft === 1 ? 'Take one.' : `Take ${trip.picksLeft}, one at a time.`}
      </p>
    </header>

    <div class="offers" data-testid="offers">
      {#each trip.offers as item, i (`${trip.picksLeft}-${i}`)}
        <OfferCard
          {item}
          selected={pick === i}
          onselect={() => (chosen = i)}
          testid="offer-{i}"
        />
      {/each}
    </div>

    <div class="foot">
      <Button label="Take" onclick={take} disabled={pick === null} testid="take" />
      <a class="link" href={href('codex')}>Read the notebook</a>
    </div>

    <TripStatus {trip} profile={game.profile} />
  </section>
{/if}

<style>
  .loot {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    height: 100%;
    padding: var(--space-3) var(--space-3) calc(var(--space-3) + 14px);
  }
  header {
    flex: none;
  }
  h1 {
    margin: 0;
    font-size: 22px;
    font-weight: normal;
  }
  h1::first-letter {
    text-transform: uppercase;
  }
  .picks {
    margin: 2px 0 0;
    font-size: 14px;
    font-style: italic;
    color: var(--ink-soft);
  }
  .offers {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    flex: 1;
    min-height: 0;
  }
  .offers :global(.card) {
    flex: 1 1 0;
    max-height: 150px;
  }
  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }
  .foot :global(.btn) {
    flex: 1;
    min-height: 52px;
    font-size: 18px;
  }
  .link {
    display: inline-flex;
    align-items: center;
    min-height: var(--tap);
  }
</style>
