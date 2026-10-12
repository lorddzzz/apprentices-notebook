<script lang="ts">
  import { toasts } from '../../../app/toasts.svelte';
</script>

<div class="toasts" role="status" aria-live="polite" data-testid="toasts">
  {#each toasts.items as t (t.id)}
    <div class="toast {t.tone}">{t.text}</div>
  {/each}
</div>

<style>
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
    max-width: 100%;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius);
    background: var(--ink);
    color: var(--parchment);
    font-size: 14px;
    box-shadow: 0 2px 8px rgba(43, 33, 24, 0.4);
    animation: rise 160ms ease-out;
  }
  .warn {
    background: var(--danger);
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .toast {
      animation: none;
    }
  }
</style>
