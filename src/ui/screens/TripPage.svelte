<script lang="ts">
  import { DISTRICTS, MEMBERS } from '$data';
  import { compiledFor } from '$engine';
  import { tripHighlights } from '../../app/flow';
  import { game } from '../../app/instance';
  import { deadCellNotes, heardHighlights, placeInText, tierUpLine } from '../../app/tripviews';
  import Button from '../components/common/Button.svelte';

  const recap = $derived(game.save.lastTrip);
  const highlights = $derived(
    recap ? [...tripHighlights(recap, game.profile), ...heardHighlights(recap)] : [],
  );
  const spells = $derived(recap?.stats.spells ?? []);
  const tierUps = $derived(recap?.stats.elegance ?? []);
  // Dead-cell notes show only while each spell is still wired as it was fought (M15).
  const notes = $derived(
    spells.map((s) =>
      deadCellNotes(s, compiledFor(game.profile, s.member).spells, game.profile.lattices[s.member]),
    ),
  );
</script>

{#if recap}
  <section class="page" data-testid="trip-page">
    <header>
      <h1>
        {recap.outcome === 'returned'
          ? recap.district === 'seam'
            ? 'Home from the Seam.'
            : `Home from ${placeInText(DISTRICTS[recap.district].name)}.`
          : 'The trip, as it went.'}
      </h1>
      <p>
        Deepest: {recap.place} · {recap.stats.fights}
        {recap.stats.fights === 1 ? 'fight' : 'fights'} fought
      </p>
    </header>

    <div class="mid">
      {#if tierUps.length}
        <ul class="highlights" data-testid="tier-ups">
          {#each tierUps as up (`${up.glyph}|${up.version}|${up.metric}|${up.tier}`)}
            <li class="note tier">
              <h2>A Glyph proved itself</h2>
              <p>{tierUpLine(up)}</p>
            </li>
          {/each}
        </ul>
      {/if}
      {#if highlights.length}
        <ul class="highlights" data-testid="highlights">
          {#each highlights as h (`${h.kind}|${h.title}|${h.text}`)}
            <li class="note {h.kind}">
              <h2>{h.title}</h2>
              <p>{h.text}</p>
            </li>
          {/each}
        </ul>
      {:else}
        {#if !tierUps.length}
          <p class="none" data-testid="no-highlights">Nothing stood out this time.</p>
        {/if}
      {/if}

      <details class="ledger" data-testid="ledger">
        <summary>The ledger</summary>
        {#if spells.length}
          <table>
            <thead>
              <tr><th>Spell</th><th>Casts</th><th>Damage</th><th>Kills</th></tr>
            </thead>
            <tbody>
              {#each spells as s, i (`${s.member}|${s.spell}`)}
                <tr>
                  <td>
                    <span class="who" style:color="var(--member-{s.member})"
                      >{MEMBERS[s.member].name}</span
                    >
                    {s.name}
                    {#each notes[i] ?? [] as n (n)}
                      <span class="dead" data-testid="dead-note">{n}</span>
                    {/each}
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
  .dead {
    display: block;
    font-size: 12px;
    font-style: italic;
    color: var(--ink-soft);
  }
  .note.tier {
    border-left-color: var(--lamp);
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
