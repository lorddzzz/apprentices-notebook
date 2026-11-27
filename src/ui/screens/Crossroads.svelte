<script lang="ts">
  import { crossroadsChoices } from '$engine/districts/api';
  import { crossroadsView } from '../../app/crossroads';
  import { game } from '../../app/instance';
  import { href } from '../../app/routes';
  import AppHeader from '../components/common/AppHeader.svelte';
  import CityScene from '../components/trip/CityScene.svelte';
  import CrossroadsActions from '../components/trip/CrossroadsActions.svelte';
  import CrossroadsChoices from '../components/trip/CrossroadsChoices.svelte';
  import LootChips from '../components/trip/LootChips.svelte';
  import StakeHeading from '../components/trip/StakeHeading.svelte';
  import TripStrip from '../components/trip/TripStrip.svelte';
  import { crestFor, DISTRICT_UI } from '../districts';

  const trip = $derived(game.save.trip);
  // The district module names the ways on; the Seam and the canals get push and return (P4).
  const Note = $derived(trip ? DISTRICT_UI[trip.district]?.crossroadsNote : undefined);
  const crest = $derived(trip ? crestFor(trip.district) : undefined);
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
  <section class="crossroads" data-world="city" data-district={trip.district} data-testid="crossroads">
    <AppHeader variant="city" title="Crossroads" {crest} />

    <div class="body">
      <CityScene district={trip.district} kind="crossroads" />

      <div class="page">
        <StakeHeading
          heading={view.heading}
          line="You are deeper than the lamplight reaches. Look at what you have left."
        />

        {#if Note}<Note {trip} />{/if}
        <CrossroadsChoices {view} onway={(id) => game.chooseWay(id)} />

        <div class="finds">
          <h2>Carried, not yet safe</h2>
          <LootChips items={trip.loot} />
        </div>

        <TripStrip {trip} profile={game.profile} large />
      </div>
    </div>

    <footer>
      <a class="link" href={href('codex')}>Read the notebook</a>
      <CrossroadsActions {view} onpush={() => game.pushOn()} onhome={() => game.returnHome()} />
    </footer>
  </section>
{/if}

<style>
  .crossroads {
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
    min-height: 0;
    overflow-y: auto;
  }
  .page {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }
  h2 {
    margin: 0 0 var(--space-2);
    font-size: var(--type-sm);
    font-weight: normal;
    font-variant-caps: all-small-caps;
    letter-spacing: 0.06em;
    color: var(--ink-soft);
  }
  footer {
    display: flex;
    flex: none;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-3) calc(var(--space-3) + 14px);
    border-top: 1px solid var(--line);
    background: var(--parchment);
  }
  .link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: var(--tap);
    font-size: var(--type-sm);
  }
</style>
