<script lang="ts">
  import type { CodexEntryDef } from '$data';
  import type { NoteView } from '$engine/margins';
  import Unseen from '../common/Unseen.svelte';

  interface Props {
    entry: CodexEntryDef;
    known: boolean;
    /** The page's note: the first note, or the owner's answer once it has come (SM-14). */
    note?: NoteView;
  }

  let { entry, known, note }: Props = $props();

  const initial = $derived(entry.title.charAt(0));
</script>

<article class="entry" class:unknown={!known} data-testid="codex-entry" data-known={known} data-id={entry.id}>
  <div class="mark">
    {#if known}
      <svg width="44" height="44" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="17" fill="var(--parchment)" stroke="var(--accent)" stroke-width="2" />
        <text x="20" y="27" text-anchor="middle" font-size="20" fill="var(--accent)" font-family="var(--font-script)">{initial}</text>
      </svg>
    {:else}
      <Unseen shape="box" />
    {/if}
  </div>

  <div class="text">
    {#if known}
      <h3>{entry.title}</h3>
      <p class="rule">{entry.text}</p>
      {#if note?.answered}
        <p class="note first" data-testid="codex-first-note">{entry.ownerNote}</p>
        <p class="answered" data-testid="codex-answered">answered</p>
        <p class="note answer" data-testid="codex-answer">{note.text}</p>
      {:else}
        <p class="note">{entry.ownerNote}</p>
      {/if}
    {:else}
      <h3 class="blank" aria-label="Not found yet">???</h3>
      {#if entry.hint}
        <p class="hint">{entry.hint}</p>
      {/if}
    {/if}
  </div>
</article>

<style>
  .entry {
    display: flex;
    gap: var(--space-3);
    align-items: flex-start;
    padding: var(--space-2) var(--space-1);
    border-bottom: 1px solid var(--line);
  }
  .mark {
    flex: none;
    width: 44px;
    padding-top: 2px;
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  h3 {
    margin: 0;
    font-size: 17px;
    font-weight: normal;
    font-variant: small-caps;
    letter-spacing: 0.04em;
  }
  .blank {
    padding-top: 10px;
    font-family: var(--font-serif);
    font-style: italic;
    font-variant: normal;
    font-size: 17px;
    letter-spacing: 0.2em;
    color: var(--ink-faint);
  }
  .hint {
    margin: 2px 0 0;
    font-size: 14px;
    font-style: italic;
    line-height: 1.3;
    color: var(--ink-faint);
  }
  .rule {
    margin: 2px 0 0;
    font-size: 14px;
    line-height: 1.3;
    color: var(--ink-soft);
  }
  .note {
    margin: 6px 0 0;
    padding: 4px var(--space-2);
    border-left: 3px solid rgba(139, 58, 43, 0.45);
    background: var(--parchment-dark);
    font-family: var(--font-script);
    font-size: 20px;
    line-height: 1.25;
    color: var(--accent);
  }
  .note.first {
    opacity: 0.7;
  }
  .answered {
    margin: 6px 0 0 var(--space-1);
    font-size: 13px;
    font-variant: small-caps;
    letter-spacing: 0.06em;
    color: var(--ink-faint);
  }
  .note.answer {
    margin-top: 2px;
  }
</style>
