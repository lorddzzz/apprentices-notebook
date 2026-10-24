<script lang="ts">
  import type { CrossroadsView } from '../../../app/crossroads';
  import Button from '../common/Button.svelte';

  interface Props {
    view: CrossroadsView;
    onway: (id: string) => void;
    onhome: () => void;
  }

  let { view, onway, onhome }: Props = $props();
</script>

<div class="ways" data-testid="ways">
  {#each view.ways as w (w.id)}
    <Button disabled={w.disabled} onclick={() => onway(w.id)} testid={w.testid}>
      <span class="big">{w.label}</span>
      <span class="sub">{w.sub}</span>
      {#if w.warn}<span class="warn" data-testid="no-way-home">{w.warn}</span>{/if}
    </Button>
  {/each}
  {#if view.home}
    {@const h = view.home}
    <Button variant="quiet" disabled={h.disabled} onclick={onhome} testid={h.testid}>
      <span class="big">{h.label}</span>
      <span class="sub" data-testid={h.disabled ? 'no-landing' : undefined}>{h.sub}</span>
    </Button>
  {/if}
</div>

<style>
  .ways {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .ways :global(.btn) {
    flex-direction: column;
    gap: 0;
    min-height: 60px;
    width: 100%;
    padding-block: var(--space-2);
    text-align: center;
  }
  .big {
    font-size: 19px;
  }
  .sub {
    font-size: 13px;
    opacity: 0.85;
  }
  .warn {
    margin-top: 2px;
    font-size: 13px;
    font-style: italic;
    color: var(--lamp);
  }
</style>
