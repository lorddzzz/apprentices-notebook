<script lang="ts">
  import { ASPECTS, type Aspect, type CodexEntryDef, SOLVENTS } from '$data';
  import AspectMark from '../AspectMark.svelte';
  import SolventIcon from '../SolventIcon.svelte';

  interface Props {
    entry: CodexEntryDef;
    known: boolean;
  }

  let { entry, known }: Props = $props();

  const aspect = $derived(entry.ref as Aspect);
  const solvent = $derived(SOLVENTS[ASPECTS[aspect].solvent]);
</script>

<article class="entry" class:unknown={!known} data-testid="codex-entry" data-known={known} data-id={entry.id}>
  <div class="mark">
    <AspectMark {aspect} size={32} />
  </div>

  <div class="text">
    <h3>{ASPECTS[aspect].name}</h3>
    <p class="rule">{entry.text}</p>
    {#if !known && entry.hint}
      <p class="note">{entry.hint}</p>
    {/if}
    <p class="solvent">
      <SolventIcon solvent={solvent.id} size={16} />
      <span>Solvent: {solvent.name}</span>
    </p>
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
  .unknown {
    opacity: 0.45;
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
  .solvent {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    margin: 4px 0 0;
    font-family: var(--hand);
    font-size: 16px;
    color: var(--ink-soft);
  }
</style>
