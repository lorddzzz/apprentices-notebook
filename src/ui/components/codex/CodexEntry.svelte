<script lang="ts">
  import { type CodexEntryDef, type InteractionId, RUNES, type RuneId } from '$data';
  import { FILLED_INTERACTIONS, INTERACTION_GLYPH } from '../../glyphs';
  import AspectMark from '../AspectMark.svelte';
  import RuneGlyph from '../RuneGlyph.svelte';

  interface Props {
    entry: CodexEntryDef;
    known: boolean;
  }

  let { entry, known }: Props = $props();

  const rune = $derived(entry.kind === 'rune' ? (entry.ref as RuneId) : null);
  const interaction = $derived(
    entry.kind === 'interaction' ? (entry.ref as InteractionId) : null,
  );
</script>

<article class="entry" class:unknown={!known} data-testid="codex-entry" data-known={known} data-id={entry.id}>
  <div class="mark">
    {#if entry.kind === 'rune'}
      <RuneGlyph
        rune={known ? rune : null}
        dir={known && rune && RUNES[rune].arrow ? 'right' : undefined}
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
        {#if known && interaction}
          {@const filled = FILLED_INTERACTIONS.has(interaction)}
          <g transform="translate(20 20) scale(0.68) translate(-12 -12)">
            <path
              d={INTERACTION_GLYPH[interaction]}
              fill={filled ? 'currentColor' : 'none'}
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
      {#if rune}
        <div class="marks">
          {#each RUNES[rune].aspects as aspect (aspect)}
            <AspectMark {aspect} size={18} />
          {/each}
        </div>
      {/if}
      <p class="rule">{entry.text}</p>
      <p class="note">{entry.ownerNote}</p>
    {:else}
      <h3 class="blank" aria-label="Not found yet">???</h3>
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
  .marks {
    display: flex;
    gap: var(--space-1);
    margin-top: 2px;
  }
  .rule {
    margin: 2px 0 0;
    font-size: 14px;
    line-height: 1.3;
    color: var(--ink-soft);
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
