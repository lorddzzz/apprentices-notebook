<script lang="ts">
  import { SOLVENT_IDS, SOLVENTS } from '$data';
  import { deskGroups, deskRows, KIND_LABEL, marginOf } from '../../app/desk';
  import { DeskStore } from '../../app/desk.svelte';
  import { game } from '../../app/instance';
  import BackLink from '../components/common/BackLink.svelte';
  import MarginColumn from '../components/desk/MarginColumn.svelte';
  import SubjectEntry from '../components/desk/SubjectEntry.svelte';
  import SolventIcon from '../components/SolventIcon.svelte';

  const desk = new DeskStore(game);
  const profile = $derived(desk.profile);
  const groups = $derived(deskGroups(deskRows(profile)));
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

    {#if groups.length === 0}
      <p class="empty" data-testid="desk-empty">
        Nothing to footnote yet. A rune, method or solvent earns a point each time one of its lines
        plays out in a fight. Come back after a trip.
      </p>
    {:else}
      {#each groups as group (group.kind)}
        <h2 data-testid="desk-group-{group.kind}">{KIND_LABEL[group.kind]}</h2>
        <ul class="subjects">
          {#each group.rows as row (row.subject)}
            <li>
              <SubjectEntry
                {row}
                open={desk.open === row.subject}
                ontoggle={() => desk.toggle(row.subject)}
              />
              {#if desk.open === row.subject}
                <MarginColumn
                  margin={marginOf(profile, row.subject)}
                  name={row.name}
                  onwrite={(id) => desk.write(row.subject, id)}
                />
              {/if}
            </li>
          {/each}
        </ul>
      {/each}
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
  h2 {
    margin: var(--space-3) var(--space-1) var(--space-1);
    font-size: 13px;
    font-weight: normal;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-soft);
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
  .subjects {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .empty {
    margin: var(--space-3) var(--space-1);
    font-family: var(--hand);
    font-size: 18px;
    line-height: 1.3;
    color: var(--ink-soft);
  }
</style>
