<script lang="ts">
  import { codexView } from '$engine';
  import { game } from '../../app/instance';
  import CodexEntry from '../components/codex/CodexEntry.svelte';
  import BackLink from '../components/common/BackLink.svelte';

  const entries = $derived(codexView(game.profile));
  const runes = $derived(entries.filter((e) => e.entry.kind === 'rune'));
  const interactions = $derived(entries.filter((e) => e.entry.kind === 'interaction'));
  const known = $derived(entries.filter((e) => e.known).length);
  // Out on a trip the notebook opens from the road, and closes back onto it.
  const back = $derived(game.save.trip ? 'trip' : 'study');
</script>

<section class="codex" data-testid="codex">
  <header>
    <BackLink to={back} label={back === 'trip' ? 'Back to the road' : 'Study'} />
    <span class="count" data-testid="codex-count">{known} / {entries.length} known</span>
  </header>

  <div class="page">
    <h1>The Notebook</h1>
    <p class="lead">The back pages. What I understand gets written down; the rest waits.</p>

    <h2>Runes</h2>
    {#each runes as { entry, known } (entry.id)}
      <CodexEntry {entry} {known} />
    {/each}

    <h2>Interactions</h2>
    {#each interactions as { entry, known } (entry.id)}
      <CodexEntry {entry} {known} />
    {/each}
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
  .page {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: var(--space-3) var(--space-3) calc(var(--space-4) + 24px);
    background: repeating-linear-gradient(to bottom, transparent 0 27px, rgba(43, 33, 24, 0.06) 27px 28px);
  }
  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: normal;
    letter-spacing: 0.03em;
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
