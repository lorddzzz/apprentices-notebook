<script lang="ts">
  import { placeOf, roomsOf } from '$engine';
  import { shapeOf } from '$engine/trip/shape';
  import { inSentence } from '../../app/describe';
  import { game } from '../../app/instance';
  import { paperNote } from '../../app/lootviews';
  import { href } from '../../app/routes';
  import { offerNovelty } from '../../app/tripUx';
  import ActionButton from '../components/common/ActionButton.svelte';
  import AppHeader from '../components/common/AppHeader.svelte';
  import OfferCard from '../components/trip/OfferCard.svelte';
  import TripStrip from '../components/trip/TripStrip.svelte';
  import { crestFor, DISTRICT_UI } from '../districts';
  import { settledTermLine } from '../districts/inkQuarter/terms';

  const trip = $derived(game.save.trip);
  let chosen = $state<number | null>(null);

  // The room just won filed a paper for the first time (DK-12): one line, until the trip moves on.
  const note = $derived.by(() => {
    const found = game.found;
    if (!trip || !found || found.seed !== trip.seed || found.room !== trip.encounter) return null;
    return paperNote(found.paper);
  });

  const Header = $derived(trip ? DISTRICT_UI[trip.district]?.lootHeader : undefined);
  const crest = $derived(trip ? crestFor(trip.district) : undefined);

  // A met room bonus is the extra pick (CN-10): say so while it is still to be taken.
  const bonus = $derived.by(() => {
    if (!trip?.kit?.bonuses.includes(trip.encounter)) return null;
    const room = shapeOf(trip.district).bonuses?.[trip.encounter];
    const base = roomsOf(trip)[trip.encounter]?.picks ?? 1;
    return room?.reward.kind === 'pick' && trip.picksLeft > base ? room : null;
  });

  // The signed term this room's win settled (IQ-17): paid or broken, until the trip moves on.
  const settled = $derived(trip ? settledTermLine(trip, trip.encounter) : null);

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
  <section class="loot" data-world="city" data-district={trip.district} data-testid="loot">
    <AppHeader variant="city" title="A find" {crest} />

    <div class="body">
      <header>
        <h1>Spoils of {inSentence(placeOf(trip))}</h1>
        <p class="picks" data-testid="picks-left">
          {trip.picksLeft === 1 ? 'Take one.' : `Take ${trip.picksLeft}, one at a time.`}
        </p>
        {#if Header}<Header {trip} />{/if}
      </header>

      {#if bonus}
        <p class="notice" data-testid="bonus-pick">
          <span class="seal" aria-hidden="true">◆</span>
          <span><strong>Bonus pick earned.</strong> <em>{bonus.text}</em> One more to take.</span>
        </p>
      {/if}

      {#if settled}
        <p class="notice" data-testid="term-{settled.status}">
          <span class="seal" aria-hidden="true">{settled.status === 'paid' ? '✓' : '✗'}</span>
          <span>{settled.text}</span>
        </p>
      {/if}

      {#if note}
        <p class="notice" data-testid="paper-found">
          <span class="seal" aria-hidden="true">✎</span>
          <span>
            A paper found: <em>{note.title}</em>, in {note.hand}{note.hand.endsWith('s') ? "'" : "'s"} hand. Filed in the notebook.
          </span>
        </p>
      {/if}

      <div class="offers" data-testid="offers">
        {#each trip.offers as item, i (`${trip.picksLeft}-${i}`)}
          <OfferCard
            {item}
            selected={pick === i}
            isNew={offerNovelty(game.profile, item) === 'new'}
            onselect={() => (chosen = i)}
            testid="offer-{i}"
          />
        {/each}
      </div>

      <TripStrip {trip} profile={game.profile} />
    </div>

    <footer>
      <a class="link" href={href('codex')}>Read the notebook</a>
      <ActionButton onclick={take} disabled={pick === null} testid="take" label="Take" />
    </footer>
  </section>
{/if}

<style>
  .loot {
    display: flex;
    flex-direction: column;
    height: 100%;
    font-family: var(--font-serif);
    color: var(--ink);
  }
  .body {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    gap: var(--space-2);
    min-height: 0;
    overflow-y: auto;
    padding: var(--space-3);
  }
  .body > :global(*) {
    flex-shrink: 0;
  }
  h1 {
    margin: 0;
    font-size: var(--type-lg);
    font-weight: normal;
    line-height: 1.2;
  }
  h1::first-letter {
    text-transform: uppercase;
  }
  .picks {
    margin: 2px 0 0;
    font-size: var(--type-sm);
    font-style: italic;
    color: var(--ink-soft);
  }
  .notice {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    margin: 0;
    padding: var(--space-2) var(--space-3);
    border: 1px dashed var(--line);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    font-size: var(--type-sm);
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
  }
  footer {
    display: flex;
    flex: none;
    flex-direction: column;
    align-items: stretch;
    padding: var(--space-1) var(--space-3) calc(var(--space-3) + 14px);
    border-top: 1px solid var(--line);
    background: var(--parchment);
  }
  footer :global(.action) {
    min-height: 52px;
    font-size: 18px;
  }
  .link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: var(--tap);
    font-size: var(--type-sm);
  }
</style>
