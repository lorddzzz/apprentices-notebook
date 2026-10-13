<script lang="ts">
  import { MEMBERS } from '$data';
  import { encounterTitle } from '../../app/describe';
  import { tripHighlights } from '../../app/flow';
  import { game } from '../../app/instance';
  import Button from '../components/common/Button.svelte';

  const recap = $derived(game.save.lastTrip);
  const highlights = $derived(recap ? tripHighlights(recap, game.profile) : []);
  const spells = $derived(recap?.stats.spells ?? []);
</script>

{#if recap}
  <section class="page" data-testid="trip-page">
    <header>
      <h1>{recap.outcome === 'returned' ? 'Home from the Seam.' : 'The trip, as it went.'}</h1>
      <p>
        Deepest: {encounterTitle(recap.encounter)} · {recap.stats.fights}
        {recap.stats.fights === 1 ? 'fight' : 'fights'} fought
      </p>
    </header>

    <div class="mid">
      {#if highlights.length}
        <ul class="highlights" data-testid="highlights">
          {#each highlights as h (h.kind)}
            <li class="note {h.kind}">
              <h2>{h.title}</h2>
              <p>{h.text}</p>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="none" data-testid="no-highlights">Nothing stood out this time.</p>
      {/if}

      <details class="ledger" data-testid="ledger">
        <summary>The ledger</summary>
        {#if spells.length}
          <table>
            <thead>
              <tr><th>Spell</th><th>Casts</th><th>Damage</th><th>Kills</th></tr>
            </thead>
            <tbody>
              {#each spells as s (`${s.member}|${s.spell}`)}
                <tr>
                  <td>
                    <span class="who" style:color="var(--member-{s.member})"
                      >{MEMBERS[s.member].name}</span
                    >
                    {s.name}
                  </td>
                  <td>{s.casts}</td>
                  <td>{s.damage}</td>
                  <td>{s.kills}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {:else}
          <p class="none">No spell was cast.</p>
        {/if}
      </details>
    </div>

    <Button onclick={() => game.leaveTripPage()} testid="back-to-desk">Back to the desk</Button>
  </section>
{/if}

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    height: 100%;
    padding: var(--space-4) var(--space-3) calc(var(--space-3) + 14px);
    background: linear-gradient(var(--parchment), var(--parchment-dark));
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
  .mid {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-3);
    min-height: 0;
    overflow-y: auto;
  }
  .highlights {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .note {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--line);
    border-left: 4px solid var(--accent);
    border-radius: var(--radius);
    background: var(--parchment);
  }
  .note.chain {
    border-left-color: var(--m-fire);
  }
  .note.proof {
    border-left-color: var(--m-ink);
  }
  h2 {
    margin: 0 0 2px;
    font: 13px var(--mono);
    color: var(--ink-soft);
  }
  .note p {
    margin: 0;
    font-family: var(--hand);
    font-size: 18px;
  }
  .none {
    margin: 0;
    font-style: italic;
    color: var(--ink-soft);
  }
  summary {
    min-height: var(--tap);
    display: flex;
    align-items: center;
    font: 13px var(--mono);
    color: var(--ink-soft);
    cursor: pointer;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  th {
    font: 12px var(--mono);
    font-weight: normal;
    text-align: right;
    color: var(--ink-soft);
  }
  th:first-child,
  td:first-child {
    text-align: left;
  }
  td {
    padding: 4px 0;
    text-align: right;
    border-top: 1px solid var(--line);
  }
  .who {
    font: 12px var(--mono);
    margin-right: 4px;
  }
  .page :global(.btn) {
    min-height: 56px;
    width: 100%;
    font-size: 18px;
  }
</style>
