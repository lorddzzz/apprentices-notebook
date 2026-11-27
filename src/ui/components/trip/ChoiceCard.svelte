<script lang="ts">
  /**
   * UT-8. One way on, 92 px at least, sized to content: where it leads, its risk, and why it is
   * shut. With `onpick` the whole card is the button (a span choice); without, it only informs
   * (Push on, whose button is the screen's primary).
   */
  interface Props {
    label?: string;
    note?: string;
    sub: string;
    warn?: string;
    disabled?: boolean;
    onpick?: () => void;
    testid?: string;
    /** The sub line's test id (the shut way home says why). */
    subTestid?: string;
  }

  let { label, note, sub, warn, disabled = false, onpick, testid, subTestid }: Props = $props();
</script>

{#snippet face()}
  {#if label}<span class="big">{label}</span>{/if}
  {#if note}<span class="line" data-testid="way-note">{note}</span>{/if}
  <span class="line" data-testid={subTestid}>{sub}</span>
  {#if warn}<span class="warn" data-testid="no-way-home"><span aria-hidden="true">!&nbsp;</span>{warn}</span>{/if}
{/snippet}

{#if onpick}
  <button type="button" class="card" class:disabled {disabled} onclick={onpick} data-testid={testid}>
    {@render face()}
  </button>
{:else}
  <div class="card" class:disabled data-testid={testid}>
    {@render face()}
  </div>
{/if}

<style>
  .card {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    width: 100%;
    min-height: 92px;
    padding: 10px var(--space-3);
    border: 1px solid var(--parchment-deep);
    border-radius: var(--radius);
    background: var(--parchment);
    box-shadow: var(--shadow-1);
    color: var(--ink);
    font-family: var(--font-serif);
    text-align: left;
  }
  button.card {
    cursor: pointer;
  }
  button.card:focus-visible {
    outline: 3px solid var(--select);
    outline-offset: 2px;
  }
  button.card:active:not(:disabled) {
    transform: translateY(1px);
  }
  .disabled {
    border-style: dashed;
    box-shadow: none;
    font-style: italic;
    opacity: 0.7;
    cursor: not-allowed;
  }
  .big {
    font-size: 19px;
    line-height: 1.2;
  }
  .line {
    font-size: var(--type-sm);
    line-height: 1.3;
    color: var(--ink-soft);
  }
  .warn {
    font-size: var(--type-sm);
    font-style: italic;
    line-height: 1.3;
    color: var(--danger);
  }
</style>
