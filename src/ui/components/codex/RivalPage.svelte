<script lang="ts">
  import type { RivalPageRow } from '../../../app/codexRivals';
  import RuneGlyph from '../RuneGlyph.svelte';

  interface Props {
    row: RivalPageRow;
  }

  let { row }: Props = $props();
  const missing = $derived(row.parts.length - row.ownedCount);
</script>

<article class="rival" data-testid="codex-rival-page-{row.id}">
  <header>
    <h3>{row.title}</h3>
    <span class="by">{row.rivalName}'s page</span>
  </header>

  <p class="annotation" data-testid="codex-rival-annotation">{row.annotation}</p>
  <p class="story">{row.story}</p>

  <h4>
    Parts
    <span class="count" data-testid="codex-rival-owned">{row.ownedCount} / {row.parts.length} owned</span>
  </h4>
  <ul class="parts">
    {#each row.parts as part (part.rune)}
      <li class:owned={part.owned} data-testid="codex-rival-part-{part.rune}" data-owned={part.owned}>
        <RuneGlyph rune={part.rune} size={32} dim={!part.owned} />
        <span class="name">{part.name}</span>
        <span class="state">{part.owned ? 'Owned' : 'Missing'}</span>
      </li>
    {/each}
  </ul>
  {#if missing > 0}
    <p class="hint">Field use needs every part. {missing} still to find.</p>
  {/if}

  {#if row.trick}
    <div class="trick" data-testid="codex-rival-trick">
      <b>{row.trick.name}</b>
      <span class="tag">Excluded</span>
      <p>{row.trick.text}</p>
    </div>
  {/if}
</article>

<style>
  .rival {
    padding: var(--space-2) 0 var(--space-3);
    border-bottom: 1px solid var(--line);
  }
  h3 {
    margin: 0;
    font-family: var(--hand);
    font-size: 22px;
    font-weight: normal;
    color: var(--accent);
  }
  .by {
    font: 700 11px var(--mono);
    text-transform: uppercase;
    color: var(--ink-faint);
  }
  .annotation {
    margin: var(--space-2) 0 var(--space-1);
    font-family: var(--hand);
    font-size: 17px;
    line-height: 1.3;
    color: var(--ink);
  }
  .story {
    margin: 0 0 var(--space-2);
    font-size: 14px;
    font-style: italic;
    color: var(--ink-soft);
  }
  h4 {
    display: flex;
    justify-content: space-between;
    margin: var(--space-2) 0 var(--space-1);
    font-size: 12px;
    font-weight: normal;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .count {
    font: 700 12px var(--mono);
    letter-spacing: 0;
  }
  .parts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .parts li {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-width: 0;
    padding: 4px;
    border: 1px dashed var(--ink-faint);
    border-radius: 6px;
    color: var(--ink-faint);
  }
  .parts li.owned {
    border: 1px solid var(--ink);
    color: var(--ink);
  }
  .name {
    flex: 1;
    min-width: 0;
    font-size: 14px;
  }
  .state {
    font: 700 10px var(--mono);
    text-transform: uppercase;
  }
  .hint {
    margin: var(--space-1) 0 0;
    font-size: 13px;
    color: var(--ink-soft);
  }
  .trick {
    margin-top: var(--space-2);
    padding: var(--space-1) var(--space-2);
    border: 1px dashed var(--ink-faint);
    border-radius: 6px;
    color: var(--ink-soft);
  }
  .trick b {
    text-decoration: line-through;
    text-decoration-thickness: 1px;
  }
  .tag {
    margin-left: var(--space-1);
    font: 700 10px var(--mono);
    text-transform: uppercase;
    color: var(--ink-faint);
  }
  .trick p {
    margin: 2px 0 0;
    font-size: 13px;
  }
</style>
