<script lang="ts">
  import { toasts } from '../../../app/toasts.svelte';
</script>

<div class="toasts" role="status" aria-live="polite" data-testid="toasts">
  {#each toasts.items as t (t.id)}
    <div class="toast {t.tone}">
      {#if t.tone === 'warn'}<span class="mark" aria-hidden="true">!</span>{/if}
      {t.text}
    </div>
  {/each}
</div>

<style>
  /* Small facts only: one short line each; warn also carries a "!" so it never relies on colour. */
  .toasts {
    position: absolute;
    left: var(--space-3);
    right: var(--space-3);
    bottom: calc(var(--safe-bottom) + 64px);
    z-index: 30;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    pointer-events: none;
  }
  .toast {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    max-width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 1px solid rgba(241, 230, 204, 0.3);
    border-radius: var(--radius);
    background: var(--ink);
    color: var(--parchment);
    font-family: var(--font-serif);
    font-size: var(--type-md);
    box-shadow: var(--shadow-2);
    animation: rise var(--dur-quick) ease-out;
  }
  .warn {
    border-color: var(--parchment);
    border-style: dashed;
    background: var(--danger);
  }
  .mark {
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: 1.5px solid currentColor;
    border-radius: 50%;
    font-size: var(--type-xs);
    font-weight: bold;
    line-height: 1;
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .toast {
      animation-name: fade;
    }
  }
</style>
