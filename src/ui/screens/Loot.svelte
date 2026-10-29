<script lang="ts">
  import { encountersOf } from '$data';
  import { placeOf } from '$engine';
  import { shapeOf } from '$engine/trip/shape';
  import { inSentence } from '../../app/describe';
  import { game } from '../../app/instance';
  import { paperNote } from '../../app/lootviews';
  import { href } from '../../app/routes';
  import Button from '../components/common/Button.svelte';
  import OfferCard from '../components/trip/OfferCard.svelte';
  import TripStatus from '../components/trip/TripStatus.svelte';

  const trip = $derived(game.save.trip);
  let chosen = $state<number | null>(null);

  // The room just won filed a paper for the first time (DK-12): one line, until the trip moves on.
  const note = $derived.by(() => {
    const found = game.found;
    if (!trip || !found || found.seed !== trip.seed || found.room !== trip.encounter) return null;
    return paperNote(found.paper);
  });

  // A met room bonus is the extra pick (CN-10): say so while it is still to be taken.
  const bonus = $derived.by(() => {
    if (!trip?.kit?.bonuses.includes(trip.encounter)) return null;
    const room = shapeOf(trip.district).bonuses?.[trip.encounter];
    const base = encountersOf(trip.district)[trip.encounter]?.picks ?? 1;
    return room?.reward.kind === 'pick' && trip.picksLeft > base ? room : null;
  });

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
      <h1>Spoils of {inSentence(placeOf(trip))}</h1>
      <p class="picks" data-testid="picks-left">
        {trip.picksLeft === 1 ? 'Take one.' : `Take ${trip.picksLeft}, one at a time.`}
      </p>
    </header>

    {#if bonus}
      <p class="bonus" data-testid="bonus-pick">
        <span class="seal" aria-hidden="true">◆</span>
        <span><strong>Bonus pick earned.</strong> <em>{bonus.text}</em> One more to take.</span>
      </p>
    {/if}

    {#if note}
      <p class="paper" data-testid="paper-found">
        <span class="seal" aria-hidden="true">✎</span>
        <span>
          A paper found: <em>{note.title}</em>, in {note.hand}'s hand. Filed in the notebook.
        </span>
      </p>
    {/if}

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
  .bonus,
  .paper {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    flex: none;
    margin: 0;
    padding: var(--space-2) var(--space-3);
    border: 1px dashed var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    font-size: 14px;
    line-height: 1.3;
    color: var(--ink-soft);
  }
  .seal {
    color: var(--ink);
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
