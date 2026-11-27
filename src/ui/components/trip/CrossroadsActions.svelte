<script lang="ts">
  import type { CrossroadsView } from '../../../app/crossroads';
  import ActionButton from '../common/ActionButton.svelte';

  /**
   * UT-8 (UT-D7). Push on is the one primary; Go home is outlined above it, full width, with its
   * reason when shut. With no Push (a span, the cleared heart) the way home stands alone and
   * nothing is inferred from a way count.
   */
  interface Props {
    view: CrossroadsView;
    onpush: () => void;
    onhome: () => void;
  }

  let { view, onpush, onhome }: Props = $props();

  const push = $derived(view.ways.find((w) => w.id === 'push'));
</script>

{#if view.home || push}
  <div class="actions">
    {#if view.home}
      {@const h = view.home}
      <ActionButton kind="secondary" disabled={h.disabled} onclick={onhome} testid={h.testid}>
        <span class="stack">
          <span>{h.label}</span>
          <span class="sub" data-testid={h.disabled ? 'no-landing' : undefined}>{h.sub}</span>
        </span>
      </ActionButton>
    {/if}
    {#if push}
      <ActionButton disabled={push.disabled} onclick={onpush} testid={push.testid} label={push.label} />
    {/if}
  </div>
{/if}

<style>
  .actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .actions :global(.action) {
    width: 100%;
    padding-block: var(--space-1);
  }
  .actions :global(.action.primary) {
    min-height: 52px;
    font-size: 18px;
  }
  .stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.2;
    text-align: center;
  }
  .sub {
    font-size: 13px;
    opacity: 0.85;
  }
</style>
