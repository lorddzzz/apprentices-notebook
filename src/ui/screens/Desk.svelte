<script lang="ts">
  import { SOLVENT_IDS, SOLVENTS } from '$data';
  import { endingOf } from '$engine/drawing';
  import { deskGroups, deskRows, KIND_LABEL, marginOf } from '../../app/desk';
  import { DeskStore } from '../../app/desk.svelte';
  import { game } from '../../app/instance';
  import { href } from '../../app/routes';
  import MarginColumn from '../components/desk/MarginColumn.svelte';
  import SubjectEntry from '../components/desk/SubjectEntry.svelte';
  import HomeStrip from '../components/home/HomeStrip.svelte';
  import SolventIcon from '../components/SolventIcon.svelte';

  const desk = new DeskStore(game);
  const profile = $derived(desk.profile);
  const groups = $derived(deskGroups(deskRows(profile)));
  const pot = $derived(groups.reduce((n, g) => n + g.rows.reduce((m, r) => m + r.points, 0), 0));
  let filter = $state<'all' | 'rune' | 'method' | 'solvent'>('all');
  const FILTERS = [
    ['all', 'All'],
    ['rune', 'Runes'],
    ['method', 'Methods'],
    ['solvent', 'Solvents'],
  ] as const;
  const shown = $derived(filter === 'all' ? groups : groups.filter((g) => g.kind === filter));
  const held = $derived(SOLVENT_IDS.filter((s) => profile.solvents[s] > 0));
</script>

<section class="desk" data-testid="desk">
  <HomeStrip
    strip="scenes/home/desk-strip"
    title="The Desk"
    back={{ to: 'study', label: 'Study' }}
  />

  <div class="leaf">
    {#if endingOf(profile).handover}
      <a class="link-row" href={href('drawing')} data-testid="desk-drawing-link">
        <span>The drawing table</span>
        <span aria-hidden="true">&rarr;</span>
      </a>
    {/if}
    {#if held.length > 0}
      <p class="stock" data-testid="desk-stock">
        {#each held as s (s)}
          <span class="held"><SolventIcon solvent={s} size={18} />{SOLVENTS[s].name} <b>×{profile.solvents[s]}</b></span>
        {/each}
      </p>
    {/if}

    {#if groups.length === 0}
      <p class="empty" data-testid="desk-empty">Nothing to footnote yet. Come back after a trip.</p>
    {:else}
      <p class="pot" data-testid="desk-pot">Points earned <b>{pot}</b></p>
      <nav class="filters" aria-label="Show">
        {#each FILTERS as [id, name] (id)}
          <button
            type="button"
            class:on={filter === id}
            aria-pressed={filter === id}
            data-testid="desk-filter-{id}"
            onclick={() => (filter = id)}>{name}</button
          >
        {/each}
      </nav>
      {#each shown as group (group.kind)}
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
  .pot {
    margin: 0 var(--space-1) var(--space-1);
    font-size: 15px;
    font-variant: small-caps;
    letter-spacing: 0.06em;
    color: var(--ink-soft);
  }
  .pot b {
    font-size: 20px;
    color: var(--ink);
  }
  .filters {
    display: flex;
    gap: var(--space-3);
    overflow-x: auto;
    scrollbar-width: none;
    border-bottom: 1px solid var(--line);
  }
  .filters button {
    flex: none;
    min-height: var(--tap);
    padding: 0 2px;
    border: 0;
    border-bottom: 3px solid transparent;
    background: none;
    font: 15px var(--font-serif);
    font-variant: small-caps;
    letter-spacing: 0.06em;
    color: var(--ink-soft);
  }
  .filters button.on {
    border-bottom-color: var(--accent);
    color: var(--ink);
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
  .link-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 48px;
    margin-bottom: var(--space-2);
    padding: 0 var(--space-3);
    border: 2px solid var(--ink);
    border-radius: var(--radius);
    background: var(--parchment-dark);
    color: var(--ink);
    font-family: var(--hand);
    font-size: 20px;
    text-decoration: none;
  }
  .link-row:focus-visible {
    outline: 3px solid var(--select);
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
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 18px;
    line-height: 1.3;
    color: var(--ink-soft);
  }
</style>
