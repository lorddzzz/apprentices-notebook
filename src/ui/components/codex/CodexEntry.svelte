<script lang="ts">
  import { type CodexEntryDef, type LineDef, type MethodId, RUNES, type RuneId } from '$data';
  import { METHOD_ART } from '../../runeArt';
  import RuneGlyph from '../RuneGlyph.svelte';

  interface Props {
    entry: CodexEntryDef;
    known: boolean;
    /** A rune page's fine print: the witnessed lines and how many exist (D1). */
    fine?: { seen: LineDef[]; total: number };
  }

  let { entry, known, fine }: Props = $props();

  const rune = $derived(entry.kind === 'rune' ? (entry.ref as RuneId) : null);
  const method = $derived(entry.kind === 'method' ? (entry.ref as MethodId) : null);
</script>

<article class="entry" class:unknown={!known} data-testid="codex-entry" data-known={known} data-id={entry.id}>
  <div class="mark">
    {#if rune}
      <RuneGlyph
        rune={known ? rune : null}
        dir={known && RUNES[rune].arrow ? 'right' : undefined}
        size={44}
      />
    {:else}
      <svg width="44" height="44" viewBox="0 0 40 40" aria-hidden="true">
        <circle
          cx="20"
          cy="20"
          r="17"
          fill={known ? 'var(--parchment)' : 'none'}
          stroke={known ? 'var(--accent)' : 'var(--ink-faint)'}
          stroke-width="2"
          stroke-dasharray={known ? undefined : '4 3'}
        />
        {#if known && method}
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
        {:else}
          <text x="20" y="26.5" text-anchor="middle" font-size="18" fill="var(--ink-faint)" font-family="var(--hand)">?</text>
        {/if}
      </svg>
    {/if}
  </div>

  <div class="text">
    {#if known}
      <h3>{entry.title}</h3>
      <p class="rule">{entry.text}</p>
      {#if fine && fine.total > 0}
        <p class="fine" data-testid="fine-count">fine print {fine.seen.length} / {fine.total}</p>
        {#each fine.seen as line (line.id)}
          <p class="line" data-testid="fine-line">{line.text}</p>
        {/each}
      {/if}
      {#if entry.ownerNote}<p class="note">{entry.ownerNote}</p>{/if}
    {:else}
      <h3 class="blank" aria-label="Not found yet">???</h3>
      {#if entry.hint}
        <p class="note faded">{entry.hint}</p>
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
    font-family: var(--hand);
    font-variant: normal;
    font-size: 20px;
    letter-spacing: 0.2em;
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
    font: 700 11px var(--mono);
    letter-spacing: 0.05em;
    text-transform: uppercase;
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
  .faded {
    opacity: 0.6;
  }
  .note {
    margin: 6px 0 0 var(--space-1);
    padding-left: var(--space-2);
    border-left: 2px solid rgba(139, 58, 43, 0.45);
    font-family: var(--hand);
    font-size: 16px;
    line-height: 1.25;
    color: var(--accent);
  }
  .entry:nth-of-type(odd) .note {
    transform: rotate(-0.5deg);
  }
  .entry:nth-of-type(even) .note {
    transform: rotate(0.4deg);
  }
</style>
