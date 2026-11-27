<script lang="ts">
  import { type FootnoteSubject, type LineId, METHODS } from '$data';
  import { type CodexRow, codexView, compoundTable, headlineOf, inventionLibrary, nameOf, papersView } from '$engine';
  import { endingOf } from '$engine/drawing';
  import { noteFor } from '$engine/margins';
  import { lineTextFor } from '../../app/bench';
  import { householdRows } from '../../app/codexHousehold';
  import { rivalPageRows } from '../../app/codexRivals';
  import { marginOf } from '../../app/desk';
  import { game } from '../../app/instance';
  import { href } from '../../app/routes';
  import CodexEntry from '../components/codex/CodexEntry.svelte';
  import CodexGrid from '../components/codex/CodexGrid.svelte';
  import CodexHousehold from '../components/codex/CodexHousehold.svelte';
  import CodexIdiom from '../components/codex/CodexIdiom.svelte';
  import RivalPage from '../components/codex/RivalPage.svelte';
  import { nextTab } from '../components/codex/tabs';
  import HomeStrip from '../components/home/HomeStrip.svelte';
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
    ['papers', 'Papers'],
    ['ending', 'The owner'],
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
  const paperGroups = $derived(papersView(game.profile));
  const tabs = $derived(
    TABS.filter(
      ([id]) =>
        (id !== 'pages' || rivalPages.length > 0) && (id !== 'papers' || paperGroups.length > 0) &&
        (id !== 'ending' || ending.handover || ending.creditsSeen),
    ),
  );
  const ending = $derived(endingOf(game.profile));
  const known = $derived(entries.filter((e) => e.known).length);
  // Out on a trip the notebook opens from the road, and closes back onto it.
  const lineText = (id: LineId) => lineTextFor(game.profile, id);
  const marginFor = (row: CodexRow) =>
    row.known ? marginOf(game.profile, row.entry.ref as FootnoteSubject) : undefined;
  // The first note, or the owner's answer once its page's margin has answered (SM-14).
  const noteOf = (row: CodexRow) => (row.known ? noteFor(game.profile, row.entry.id) : undefined);
  const back = $derived(game.save.trip ? 'trip' : 'study');
  const following = $derived(nextTab(tabs.map(([id]) => id), tab));
  let page_el = $state<HTMLElement>();
  const turn = (to: Tab) => {
    tab = to;
    page_el?.scrollTo({ top: 0 });
  };
</script>

{#snippet page(row: CodexRow)}
  <CodexEntry
    entry={row.entry}
    known={row.known}
    fine={row.fine}
    margin={marginFor(row)}
    note={noteOf(row)}
    {lineText}
  />
{/snippet}

<section class="codex" data-testid="codex">
  <HomeStrip
    strip="scenes/home/codex-strip"
    title="Codex"
    back={{ to: back, label: back === 'trip' ? 'Back to the road' : 'Study' }}
  >
    {#snippet right()}
      <span class="count" data-testid="codex-count">{known} / {entries.length} known</span>
    {/snippet}
  </HomeStrip>

  <nav class="tabs" aria-label="Notebook sections">
    {#each tabs as [id, name] (id)}
      <button
        type="button"
        class:on={tab === id}
        aria-pressed={tab === id}
        data-testid="codex-tab-{id}"
        onclick={() => turn(id)}>{name}</button
      >
    {/each}
  </nav>

  <div class="page" bind:this={page_el}>
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
    {:else if tab === 'papers'}
      <p class="lead">Papers found along the way, in the order they turned up.</p>
      {#each paperGroups as g (g.group)}
        <h2>{g.group}</h2>
        {#each g.papers as paper (paper.id)}
          <article class="paper" data-testid="codex-paper">
            <h3>{paper.title}</h3>
            <p class="mline">In the hand of {paper.hand}</p>
            <p class="body">{paper.text}</p>
          </article>
        {/each}
      {/each}
    {:else if tab === 'ending'}
      <p class="lead">What the owner left on the desk, to read again.</p>
      {#if game.save.trip}
        <!-- Both routes are closed out on a trip (flow.ts), so the links wait for the study. -->
        <p class="lead" data-testid="codex-replay-away">Out on a trip: these open again in the study.</p>
      {:else}
        {#if ending.handover}
          <a class="replay" href={href('handover', { from: 'codex' })} data-testid="codex-replay-desk">The owner's desk</a>
        {/if}
        {#if ending.creditsSeen}
          <a class="replay" href={href('credits', { from: 'codex' })} data-testid="codex-replay-credits">Credits</a>
        {/if}
      {/if}
    {:else}
      {#each of('idiom') as { entry, known } (entry.id)}
        <CodexIdiom {entry} {known} note={noteFor(game.profile, entry.id)} />
      {/each}
    {/if}
    {#if following}
      <button type="button" class="next" data-testid="codex-next" onclick={() => turn(following)}>
        Next page &rsaquo;
      </button>
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
  .count {
    font-size: 14px;
    font-variant: small-caps;
    letter-spacing: 0.04em;
    color: var(--parchment);
  }
  /* One scroll row; the edges fade where more tabs wait. */
  .tabs {
    flex: none;
    display: flex;
    gap: var(--space-3);
    padding: 0 var(--space-3);
    overflow-x: auto;
    scrollbar-width: none;
    border-bottom: 1px solid var(--line);
    mask-image: linear-gradient(to right, transparent, #000 16px, #000 calc(100% - 24px), transparent);
  }
  .tabs::-webkit-scrollbar {
    display: none;
  }
  .tabs button {
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
  .tabs button.on {
    border-bottom-color: var(--accent);
    color: var(--ink);
  }
  .next {
    display: block;
    min-height: var(--tap);
    margin: var(--space-3) 0 0 auto;
    padding: 0 var(--space-2);
    border: 0;
    background: none;
    font: 17px var(--font-serif);
    font-variant: small-caps;
    letter-spacing: 0.06em;
    color: var(--accent);
  }
  .made {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-1);
    border-bottom: 1px solid var(--line);
  }
  .paper {
    padding: var(--space-2) var(--space-1);
    border-bottom: 1px solid var(--line);
  }
  .paper .body {
    margin: 4px 0 0;
    font-family: var(--font-serif);
    font-size: 16px;
    line-height: 1.35;
    color: var(--ink);
  }
  .paper h3,
  .made h3 {
    margin: 0;
    font-family: var(--hand);
    font-size: 20px;
    font-weight: normal;
    color: var(--accent);
  }
  .mline {
    margin: 0;
    font-size: 13px;
    font-variant: small-caps;
    letter-spacing: 0.05em;
    color: var(--ink-faint);
  }
  .replay {
    display: flex;
    align-items: center;
    min-height: var(--tap);
    padding: 0 var(--space-1);
    border-bottom: 1px solid var(--line);
    font-family: var(--hand);
    font-size: 20px;
    color: var(--accent);
    text-decoration: none;
  }
  .rule {
    margin: 2px 0 0;
    font-size: 14px;
    line-height: 1.3;
    color: var(--ink-soft);
  }
  .empty {
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 16px;
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
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 16px;
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
