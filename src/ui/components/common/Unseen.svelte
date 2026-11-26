<script lang="ts">
  /** C7 (frozen props). Something not yet seen: a dashed frame with ??? or a silhouette. */
  interface Props {
    shape?: 'box' | 'chip' | 'silhouette';
    label?: string;
  }

  let { shape = 'box', label }: Props = $props();
</script>

<span class="unseen {shape}" role="img" aria-label={label ?? 'Not seen yet'}>
  {#if shape === 'silhouette'}
    <svg viewBox="0 0 24 32" aria-hidden="true">
      <circle cx="12" cy="9" r="6" />
      <path d="M2 32 C2 21 6 17 12 17 C18 17 22 21 22 32 Z" />
    </svg>
  {:else}
    <span aria-hidden="true">???</span>
  {/if}
  {#if label}<span class="text" aria-hidden="true">{label}</span>{/if}
</span>

<style>
  /* One look for chip, box and silhouette: the same dashed frame, faint ink, italic serif. */
  .unseen {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    border: 2px dashed var(--ink-faint);
    background: rgba(43, 33, 24, 0.05);
    color: var(--ink-faint);
    font-family: var(--font-serif);
    font-style: italic;
    letter-spacing: 0.08em;
  }
  .box {
    min-width: var(--tap);
    min-height: var(--tap);
    padding: var(--space-2);
    border-radius: var(--radius);
  }
  .chip {
    padding: 2px var(--space-2);
    border-radius: 999px;
    font-size: var(--type-sm);
  }
  .silhouette {
    flex-direction: column;
    min-width: var(--tap);
    min-height: var(--tap);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius);
  }
  svg {
    width: 24px;
    height: 32px;
    fill: var(--ink-faint);
  }
  .text {
    font-size: var(--type-sm);
    letter-spacing: 0;
  }
</style>
