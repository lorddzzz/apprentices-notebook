<script lang="ts">
  import type { CodexRow } from '$engine';

  interface Props {
    /** Row-major; null leaves a gap (the lower triangle of the compound table). */
    cells: (CodexRow | null)[];
    cols: number;
    colHeads?: string[];
    rowHeads?: string[];
    label: string;
  }

  let { cells, cols, colHeads, rowHeads, label }: Props = $props();

  let open = $state<string | null>(null);
  const shown = $derived(cells.find((c) => c?.known && c.entry.id === open) ?? null);

  function tap(c: CodexRow): void {
    if (c.known) open = open === c.entry.id ? null : c.entry.id;
  }
</script>

<div class="grid" data-testid="codex-grid" data-label={label} style:--cols={cols + (rowHeads ? 1 : 0)}>
  {#if colHeads}
    {#if rowHeads}<span></span>{/if}
    {#each colHeads as h (h)}<span class="head">{h}</span>{/each}
  {/if}
  {#each cells as c, i (i)}
    {#if rowHeads && i % cols === 0}<span class="head side">{rowHeads[i / cols]}</span>{/if}
    {#if c === null}
      <span class="gap"></span>
    {:else}
      <button
        type="button"
        class="frame"
        class:named={c.known}
        class:open={c.entry.id === open}
        disabled={!c.known}
        data-testid="codex-frame"
        data-known={c.known}
        data-id={c.entry.id}
        aria-label={c.known ? c.entry.title : 'Empty frame'}
        onclick={() => tap(c)}
      >
        {#if c.known}<span class="name">{c.entry.title}</span>{/if}
      </button>
    {/if}
  {/each}
</div>

{#if shown}
  <div class="detail" data-testid="codex-detail">
    <h3>{shown.entry.title}</h3>
    <p class="rule">{shown.entry.text}</p>
    {#if shown.entry.ownerNote}<p class="note">{shown.entry.ownerNote}</p>{/if}
  </div>
{/if}

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    gap: 6px;
    margin-top: var(--space-2);
  }
  .head {
    align-self: center;
    text-align: center;
    font: 700 11px var(--mono);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .side {
    text-align: left;
  }
  .frame {
    min-height: 58px;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px dashed var(--ink-faint);
    border-radius: 6px;
    background: none;
    color: inherit;
  }
  .frame.named {
    border: 2px solid var(--accent);
    background: var(--parchment);
  }
  .frame.open {
    background: var(--parchment-dark);
  }
  .name {
    font-family: var(--hand);
    font-size: 17px;
    line-height: 1.05;
    color: var(--accent);
    transform: rotate(-2deg);
    overflow-wrap: anywhere;
  }
  .detail {
    margin-top: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--parchment);
  }
  h3 {
    margin: 0;
    font-family: var(--hand);
    font-size: 20px;
    font-weight: normal;
    color: var(--accent);
  }
  .rule {
    margin: 2px 0 0;
    font-size: 14px;
    line-height: 1.3;
    color: var(--ink-soft);
  }
  .note {
    margin: 6px 0 0;
    padding-left: var(--space-2);
    border-left: 2px solid rgba(139, 58, 43, 0.45);
    font-family: var(--hand);
    font-size: 16px;
    line-height: 1.25;
    color: var(--accent);
  }
</style>
