<script lang="ts">
  import { type CodexEntryDef, IDIOMS } from '$data';
  import { idiomShape } from './shapes';

  interface Props {
    entry: CodexEntryDef;
    known: boolean;
  }

  let { entry, known }: Props = $props();

  const idiom = $derived(IDIOMS.find((i) => i.id === entry.ref));
  const initial = $derived(entry.title.charAt(0));
</script>

<article class="entry" class:unknown={!known} data-testid="codex-entry" data-known={known} data-id={entry.id}>
  <div class="mark">
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
      {#if known}
        <text x="20" y="27" text-anchor="middle" font-size="20" fill="var(--accent)" font-family="var(--hand)">{initial}</text>
      {:else}
        <text x="20" y="26.5" text-anchor="middle" font-size="18" fill="var(--ink-faint)" font-family="var(--hand)">?</text>
      {/if}
    </svg>
  </div>

  <div class="text">
    {#if known}
      <h3>{entry.title}</h3>
      <p class="rule">{entry.text}</p>
      <p class="note">{entry.ownerNote}</p>
    {:else}
      <h3 class="blank" aria-label="Not found yet">???</h3>
      {#if entry.hint}
        <p class="note faded">{entry.hint}</p>
      {/if}
      {#if idiom}
        <p class="shape" data-testid="codex-silhouette">{idiomShape(idiom)}</p>
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
  .shape {
    margin: 4px 0 0;
    font-family: var(--hand);
    font-size: 16px;
    line-height: 1.25;
    color: var(--ink-soft);
  }
  .rule {
    margin: 2px 0 0;
    font-size: 14px;
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
</style>
