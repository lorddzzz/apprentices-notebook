<script lang="ts">
  import { LOWEST_FLOOR_LINE } from '$data/narration';
  import { clearedHeading } from '../../app/drawing';
  import { game } from '../../app/instance';
  import ActionButton from '../components/common/ActionButton.svelte';
  import AppHeader from '../components/common/AppHeader.svelte';
  import CarriedList from '../components/trip/CarriedList.svelte';
  import CityScene from '../components/trip/CityScene.svelte';
  import StakeHeading from '../components/trip/StakeHeading.svelte';
  import { crestFor, DISTRICT_UI } from '../districts';

  const trip = $derived(game.save.trip);
  // The bottom of a trip is this screen, not a Crossroads; a district may add a line above the
  // way home (the lower Seam's door, SM-10).
  const Line = $derived(trip ? DISTRICT_UI[trip.district]?.crossroadsLine : undefined);
  const crest = $derived(trip ? crestFor(trip.district) : undefined);
  // The lower Seam has no heart: its bottom floor is quiet, not the Marginalia's page.
  const lower = $derived(trip?.district === 'lowerSeam');
</script>

{#if trip}
  <section class="cleared" data-world="city" data-district={trip.district} data-testid="cleared">
    <AppHeader variant="city" title="District cleared" {crest} />

    <div class="body">
      <CityScene district={trip.district} kind="stair" />

      <div class="page">
        <StakeHeading
          heading={lower ? 'The stair ends here.' : clearedHeading(trip)}
          line={lower ? LOWEST_FLOOR_LINE : 'Nothing deeper answers. Take it all home.'}
        />

        <div class="finds">
          <h2>Carried home</h2>
          <CarriedList profile={game.profile} loot={trip.loot} />
        </div>

        {#if Line}<Line {trip} profile={game.profile} />{/if}
      </div>
    </div>

    <footer>
      <ActionButton onclick={() => game.returnHome()} testid="return">
        Return home with {trip.loot.length} {trip.loot.length === 1 ? 'find' : 'finds'}
      </ActionButton>
    </footer>
  </section>
{/if}

<style>
  .cleared {
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
    flex: none;
    padding: var(--space-2) var(--space-3) calc(var(--space-3) + 14px);
    border-top: 1px solid var(--line);
    background: var(--parchment);
  }
  footer :global(.action) {
    width: 100%;
    min-height: 52px;
    font-size: 18px;
  }
</style>
