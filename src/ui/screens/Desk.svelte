<script lang="ts">
  import { FOOTNOTES, SOLVENT_IDS, SOLVENTS } from '$data';
  import { deskRows, offerViews } from '../../app/desk';
  import { DeskStore } from '../../app/desk.svelte';
  import { game } from '../../app/instance';
  import BackLink from '../components/common/BackLink.svelte';
  import OfferCard from '../components/desk/OfferCard.svelte';
  import RuneEntry from '../components/desk/RuneEntry.svelte';
  import SolventIcon from '../components/SolventIcon.svelte';

  const desk = new DeskStore(game);
  const profile = $derived(desk.profile);
  const rows = $derived(deskRows(profile));
  const held = $derived(SOLVENT_IDS.filter((s) => profile.solvents[s] > 0));
</script>

<section class="desk" data-testid="desk">
  <header>
    <BackLink to="study" label="Study" />
    <h1>The Desk</h1>
  </header>

  <div class="leaf">
    {#if held.length > 0}
      <p class="stock" data-testid="desk-stock">
        {#each held as s (s)}
          <span class="held"><SolventIcon solvent={s} size={18} />{SOLVENTS[s].name} <b>×{profile.solvents[s]}</b></span>
        {/each}
      </p>
    {/if}

    {#if rows.length === 0}
      <p class="empty" data-testid="desk-empty">
        Nothing to footnote yet. A rune earns a point each time one of its lines plays out in a
        fight. Come back after a trip.
      </p>
    {:else}
      <ul class="runes">
        {#each rows as row (row.rune)}
          <li>
            <RuneEntry {row} open={desk.open === row.rune} ontoggle={() => desk.toggle(row.rune)} />
            {#if desk.open === row.rune}
              {@const offers = offerViews(profile, row.rune)}
              <div class="offers" data-testid="desk-offers">
                {#each offers as offer (offer.line)}
                  <OfferCard {offer} onwrite={(id) => desk.write(row.rune, offer.line, id)} />
                {:else}
                  <p class="none">
                    {row.level === 0
                      ? `No footnote yet. The first level opens at ${FOOTNOTES.levels.rune[0]} points.`
                      : 'No line of this rune has been witnessed yet. Watch one play out.'}
                  </p>
                {/each}
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>

<style>
  .desk {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--parchment);
    overflow: hidden;
  }
  header {
    flex: none;
    display: flex;
    align-items: center;
    padding-right: var(--space-3);
    border-bottom: 2px solid var(--ink);
    background: var(--parchment-dark);
  }
  h1 {
    margin: 0 auto;
    font-size: 20px;
    font-weight: normal;
    letter-spacing: 0.03em;
  }
  .leaf {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: var(--space-2);
  }
  .stock {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin: 0 0 var(--space-2);
    font-size: 13px;
  }
  .held {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .runes {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .offers {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }
  .empty,
  .none {
    margin: var(--space-3) var(--space-1);
    font-family: var(--hand);
    font-size: 18px;
    line-height: 1.3;
    color: var(--ink-soft);
  }
  .none {
    margin: 0;
    font-size: 15px;
  }
</style>
