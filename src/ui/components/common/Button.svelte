<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'primary' | 'quiet' | 'danger';
    disabled?: boolean;
    onclick: () => void;
    label?: string;
    testid?: string;
    children?: Snippet;
  }

  let { variant = 'primary', disabled = false, onclick, label, testid, children }: Props = $props();
</script>

<button
  type="button"
  class="btn {variant}"
  {disabled}
  {onclick}
  data-testid={testid}
>
  {#if children}{@render children()}{:else}{label}{/if}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-width: var(--tap);
    min-height: var(--tap);
    padding: 0 var(--space-3);
    border: 2px solid var(--ink);
    border-radius: var(--radius);
    font-size: 16px;
    cursor: pointer;
  }
  .primary {
    background: var(--ink);
    color: var(--parchment);
  }
  .quiet {
    background: transparent;
    color: var(--ink);
    border-color: var(--line);
  }
  .danger {
    background: var(--danger);
    border-color: var(--danger);
    color: var(--parchment);
  }
  .btn:active:not(:disabled) {
    transform: translateY(1px);
    filter: brightness(1.15);
  }
  .btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .btn:focus-visible {
    outline: 3px solid var(--select);
    outline-offset: 2px;
  }
</style>
