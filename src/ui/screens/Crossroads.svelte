<script lang="ts">
  import { crossroadsChoices } from '$engine/districts/api';
  import { crossroadsView } from '../../app/crossroads';
  import { game } from '../../app/instance';
  import { href } from '../../app/routes';
  import CrossroadsChoices from '../components/trip/CrossroadsChoices.svelte';
  import LootChips from '../components/trip/LootChips.svelte';
  import TripStatus from '../components/trip/TripStatus.svelte';
  import { DISTRICT_UI } from '../districts';

  const trip = $derived(game.save.trip);
  // The district module names the ways on; the Seam and the canals get push and return (P4).
  const Note = $derived(trip ? DISTRICT_UI[trip.district]?.crossroadsNote : undefined);
  // A choice's ledger note (BR-7) leads its second line; a choice without one reads as before.
  const view = $derived.by(() => {
    if (!trip) return null;
    const v = crossroadsView(trip);
    const notes = new Map(crossroadsChoices(trip).map((c) => [c.id, c.note]));
    const withNote = (w: (typeof v.ways)[number]) => {
      const note = notes.get(w.id);
      return note ? { ...w, sub: `${note} ${w.sub}` } : w;
    };
    return { ...v, ways: v.ways.map(withNote) };
  });
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
      {#if Note}<Note {trip} />{/if}
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
    overflow-y: auto;
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
    flex: 1 0 auto;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-3);
  }
  .crossroads > :global(*) {
    flex-shrink: 0;
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
