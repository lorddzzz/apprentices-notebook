<script lang="ts">
  import { type CodexEntryDef, type LineDef, type LineId, type MethodId, RUNES, type RuneId } from '$data';
  import type { NoteView } from '$engine/margins';
  import type { MarginView } from '../../../app/desk';
  import { METHOD_ART } from '../../runeArt';
  import Unseen from '../common/Unseen.svelte';
  import RuneGlyph from '../RuneGlyph.svelte';
  import CodexMargin from './CodexMargin.svelte';

  interface Props {
    entry: CodexEntryDef;
    known: boolean;
    /** A rune page's fine print: the witnessed lines and how many exist (D1). */
    fine?: { seen: LineDef[]; total: number };
    /** The read-only margin column (FN-5); fine-print sentences read in the owner's hand via `lineText`. */
    margin?: MarginView;
    lineText?: (id: LineId) => string;
    /** The page's note: the first note, or the owner's answer once it has come (SM-14). */
    note?: NoteView;
  }

  let { entry, known, fine, margin, lineText, note }: Props = $props();

  const rune = $derived(entry.kind === 'rune' ? (entry.ref as RuneId) : null);
  const method = $derived(entry.kind === 'method' ? (entry.ref as MethodId) : null);
</script>

<article class="entry" class:unknown={!known} data-testid="codex-entry" data-known={known} data-id={entry.id}>
  <div class="mark">
    {#if !known}
      <Unseen shape="box" />
    {:else if rune}
      <RuneGlyph {rune} dir={RUNES[rune].arrow ? 'right' : undefined} size={44} />
    {:else}
      <svg width="44" height="44" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="17" fill="var(--parchment)" stroke="var(--accent)" stroke-width="2" />
        {#if method}
          <g transform="translate(20 20) scale(0.68) translate(-12 -12)">
            <path
              d={METHOD_ART[method]}
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              color="var(--accent)"
            />
          </g>
        {/if}
      </svg>
    {/if}
  </div>

  <div class="text">
    {#if known}
      <h3>{entry.title}</h3>
      <p class="rule">{entry.text}</p>
      {#if fine && fine.total > 0}
        <p class="fine" data-testid="fine-count">Fine print, {fine.seen.length} / {fine.total}</p>
        {#each fine.seen as line (line.id)}
          <p class="line" data-testid="fine-line">{lineText ? lineText(line.id) : line.text}</p>
        {/each}
      {/if}
      {#if margin}<CodexMargin {margin} />{/if}
      {#if note?.answered}
        <p class="note first" data-testid="codex-first-note">{entry.ownerNote}</p>
        <p class="answered" data-testid="codex-answered">answered</p>
        <p class="note answer" data-testid="codex-answer">{note.text}</p>
      {:else if entry.ownerNote}
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
  .unknown {
    min-height: 60px;
  }
  .rule {
    margin: 2px 0 0;
    font-size: 14px;
    line-height: 1.3;
    color: var(--ink-soft);
  }
  .fine {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--ink-faint);
  }
  .line {
    margin: 2px 0 0;
    padding-left: var(--space-2);
    border-left: 2px solid var(--line);
    font-size: 13px;
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
  .entry:nth-of-type(odd) .note {
    transform: rotate(-0.5deg);
  }
  .entry:nth-of-type(even) .note {
    transform: rotate(0.4deg);
  }
</style>
