<script lang="ts">
  import { type CodexEntryDef, RECIPES, RUNES } from '$data';
  import type { Silhouette } from '$engine';
  import AspectMark from '../AspectMark.svelte';
  import RuneGlyph from '../RuneGlyph.svelte';
  import { familyName } from './shapes';

  interface Props {
    entry: CodexEntryDef;
    known: boolean;
    /** The undiscovered recipe's silhouette (absent once known). */
    silhouette?: Silhouette;
  }

  let { entry, known, silhouette }: Props = $props();

  const recipe = $derived(RECIPES.find((r) => r.id === entry.ref));
  const result = $derived(recipe ? RUNES[recipe.result] : null);
</script>

<article class="entry" class:unknown={!known} data-testid="codex-entry" data-known={known} data-id={entry.id}>
  {#if known && recipe}
    <div class="mark">
      <RuneGlyph rune={recipe.result} dir={result?.arrow ? 'right' : undefined} size={44} />
    </div>
    <div class="text">
      <h3>{entry.title}</h3>
      <div class="marks">
        {#each RUNES[recipe.result].aspects as aspect (aspect)}
          <AspectMark {aspect} size={18} />
        {/each}
      </div>
      <p class="rule">{entry.text}</p>
      <p class="note">{entry.ownerNote}</p>
    </div>
  {:else}
    <div class="mark">
      <svg width="44" height="44" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="17" fill="none" stroke="var(--ink-faint)" stroke-width="2" stroke-dasharray="4 3" />
        <text x="20" y="26.5" text-anchor="middle" font-size="18" fill="var(--ink-faint)" font-family="var(--hand)">?</text>
      </svg>
    </div>
    <div class="text">
      <h3 class="blank" aria-label="Not found yet">???</h3>
      {#if silhouette}
        <p class="shape" data-testid="codex-silhouette">
          {familyName(silhouette.parents[0])} + {familyName(silhouette.parents[1])} + <span class="gap">?</span>
        </p>
        <div class="marks">
          {#each silhouette.aspects as aspect (aspect)}
            <AspectMark {aspect} size={18} />
          {/each}
          <span class="ink">Ink {silhouette.ink}</span>
        </div>
        {#if silhouette.torn}
          <p class="torn">{silhouette.torn}</p>
        {/if}
      {/if}
    </div>
  {/if}
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
  .shape {
    margin: 4px 0 0;
    font-size: 14px;
    color: var(--ink-soft);
  }
  .gap {
    font-family: var(--hand);
    color: var(--ink-faint);
  }
  .marks {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1);
    margin-top: 4px;
  }
  .ink {
    margin-left: var(--space-1);
    font: 700 12px var(--mono);
    color: var(--ink-soft);
  }
  .torn {
    margin: 4px 0 0;
    font-family: var(--hand);
    font-size: 16px;
    line-height: 1.25;
    color: var(--accent);
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
</style>
