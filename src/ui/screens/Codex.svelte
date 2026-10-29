<script lang="ts">
  import { type FootnoteSubject, type LineId, METHODS } from '$data';
  import { type CodexRow, codexView, compoundTable, headlineOf, inventionLibrary, nameOf } from '$engine';
  import { lineTextFor } from '../../app/bench';
  import { householdRows } from '../../app/codexHousehold';
  import { rivalPageRows } from '../../app/codexRivals';
  import { marginOf } from '../../app/desk';
  import { game } from '../../app/instance';
  import CodexEntry from '../components/codex/CodexEntry.svelte';
  import CodexGrid from '../components/codex/CodexGrid.svelte';
  import CodexHousehold from '../components/codex/CodexHousehold.svelte';
  import CodexIdiom from '../components/codex/CodexIdiom.svelte';
  import RivalPage from '../components/codex/RivalPage.svelte';
  import BackLink from '../components/common/BackLink.svelte';
  import RuneGlyph from '../components/RuneGlyph.svelte';

  const TABS = [
    ['runes', 'Runes'],
    ['made', 'Made'],
    ['table', 'Table'],
    ['bursts', 'Bursts'],
    ['methods', 'Methods'],
    ['solvents', 'Solvents'],
    ['idioms', 'Idioms'],
    ['household', 'Household'],
    ['pages', 'Pages'],
  ] as const;
  type Tab = (typeof TABS)[number][0];
  let tab = $state<Tab>('runes');

  const KINDS = ['Ink', 'Oil', 'Steam', 'Brass'];
  const entries = $derived(codexView(game.profile));
  const of = (kind: string) => entries.filter((e) => e.entry.kind === kind);
  const bursts = $derived(of('burst'));
  const table = $derived(compoundTable(game.profile).flat());
  const lib = $derived(inventionLibrary(game.profile));
  const made = $derived(game.profile.inventions);
  // Outside `entries`, so the count above never hints at anyone unmet (recruitment P13).
  const household = $derived(householdRows(game.profile));
  const rivalPages = $derived(rivalPageRows(game.profile));
  const tabs = $derived(TABS.filter(([id]) => id !== 'pages' || rivalPages.length > 0));
  const known = $derived(entries.filter((e) => e.known).length);
  // Out on a trip the notebook opens from the road, and closes back onto it.
  const lineText = (id: LineId) => lineTextFor(game.profile, id);
  const marginFor = (row: CodexRow) =>
    row.known ? marginOf(game.profile, row.entry.ref as FootnoteSubject) : undefined;
  const back = $derived(game.save.trip ? 'trip' : 'study');
</script>

{#snippet page(row: CodexRow)}
  <CodexEntry entry={row.entry} known={row.known} fine={row.fine} margin={marginFor(row)} {lineText} />
{/snippet}

<section class="codex" data-testid="codex">
  <header>
    <BackLink to={back} label={back === 'trip' ? 'Back to the road' : 'Study'} />
    <span class="count" data-testid="codex-count">{known} / {entries.length} known</span>
  </header>

  <nav class="tabs" aria-label="Notebook sections">
    {#each tabs as [id, name] (id)}
      <button
        type="button"
        class:on={tab === id}
        aria-pressed={tab === id}
        data-testid="codex-tab-{id}"
        onclick={() => (tab = id)}>{name}</button
      >
    {/each}
  </nav>

  <div class="page">
    {#if tab === 'runes'}
      {#each of('rune') as row (row.entry.id)}
        {@render page(row)}
      {/each}
    {:else if tab === 'made'}
      <p class="lead">Runes this household has invented.</p>
      {#each made as inv (inv.id)}
        <article class="made" data-testid="codex-invention">
          <RuneGlyph rune={inv.id} inventions={lib} size={44} />
          <div class="text">
            <h3>{inv.name}</h3>
            <p class="mline">{METHODS[inv.method].name}: {inv.parts.map((r) => nameOf(r, lib)).join(', ')}</p>
            <p class="rule">{headlineOf(inv, lib)}</p>
          </div>
        </article>
      {:else}
        <p class="empty">Nothing invented yet. The Bench is where it starts.</p>
      {/each}
    {:else if tab === 'table'}
      <p class="lead">What one kind makes on another. Each cell is named when I first make it.</p>
      <CodexGrid label="Compound table" cells={table} cols={4} colHeads={KINDS} rowHeads={KINDS} />
    {:else if tab === 'bursts'}
      <p class="lead">What Spark does. The lower page waits to be found.</p>
      <CodexGrid label="Bursts" cells={bursts.slice(0, 5)} cols={3} />
      <h2>The burst page</h2>
      <CodexGrid label="Burst page" cells={bursts.slice(5)} cols={3} />
    {:else if tab === 'methods'}
      {#each of('method') as row (row.entry.id)}
        {@render page(row)}
      {/each}
    {:else if tab === 'solvents'}
      {#each of('solvent') as row (row.entry.id)}
        {@render page(row)}
      {/each}
    {:else if tab === 'household'}
      <p class="lead">Everyone who works under this roof.</p>
      {#each household as row (row.card.def.id)}
        <CodexHousehold {row} />
      {/each}
    {:else if tab === 'pages'}
      <p class="lead">Pages taken from rivals, annotated.</p>
      {#each rivalPages as row (row.id)}
        <RivalPage {row} />
      {/each}
    {:else}
      {#each of('idiom') as { entry, known } (entry.id)}
        <CodexIdiom {entry} {known} />
      {/each}
    {/if}
  </div>
</section>

<style>
  .codex {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--parchment);
  }
  header {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-right: var(--space-3);
    border-bottom: 2px solid var(--ink);
    background: var(--parchment-dark);
  }
  .count {
    font: 700 14px var(--mono);
  }
  .tabs {
    flex: none;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: var(--space-1) var(--space-2);
    border-bottom: 1px solid var(--line);
  }
  .tabs button {
    min-height: 32px;
    padding: 0 10px;
    border: 1px solid var(--ink-faint);
    border-radius: 16px;
    background: none;
    font: 700 12px var(--mono);
    color: var(--ink-soft);
  }
  .tabs button.on {
    border-color: var(--ink);
    background: var(--ink);
    color: var(--parchment);
  }
  .made {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-1);
    border-bottom: 1px solid var(--line);
  }
  .made h3 {
    margin: 0;
    font-family: var(--hand);
    font-size: 20px;
    font-weight: normal;
    color: var(--accent);
  }
  .mline {
    margin: 0;
    font: 700 11px var(--mono);
    text-transform: uppercase;
    color: var(--ink-faint);
  }
  .rule {
    margin: 2px 0 0;
    font-size: 14px;
    line-height: 1.3;
    color: var(--ink-soft);
  }
  .empty {
    font-family: var(--hand);
    font-size: 17px;
    color: var(--ink-faint);
  }
  .page {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: var(--space-3) var(--space-3) calc(var(--space-4) + 24px);
    background: repeating-linear-gradient(to bottom, transparent 0 27px, rgba(43, 33, 24, 0.06) 27px 28px);
  }
  .lead {
    margin: var(--space-1) 0 var(--space-3);
    font-family: var(--hand);
    font-size: 17px;
    color: var(--ink-soft);
  }
  h2 {
    margin: var(--space-3) 0 var(--space-1);
    padding-bottom: var(--space-1);
    border-bottom: 2px solid var(--ink);
    font-size: 13px;
    font-weight: normal;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
</style>
