<script lang="ts">
  import type { Snippet } from 'svelte';

  /** C7 (frozen props). Stub look: tokens only; Pack B (UF-8) styles the kinds per world. */
  interface Props {
    kind?: 'primary' | 'secondary' | 'quiet';
    danger?: boolean;
    disabled?: boolean;
    onclick: () => void;
    label?: string;
    testid?: string;
    children?: Snippet;
  }

  let {
    kind = 'primary',
    danger = false,
    disabled = false,
    onclick,
    label,
    testid,
    children,
  }: Props = $props();
</script>

<button
  type="button"
  class={['action', kind, { danger }]}
  {disabled}
  {onclick}
  data-testid={testid}
>
  {#if children}{@render children()}{:else}{label}{/if}
</button>

<style>
  .action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-width: var(--tap);
    min-height: var(--tap);
    padding: 0 var(--space-3);
    border: 2px solid var(--ink);
    border-radius: var(--radius);
    font-family: var(--font-serif);
    font-size: var(--type-md);
    cursor: pointer;
  }
  .primary {
    background: var(--ink);
    color: var(--parchment);
  }
  .secondary {
    background: transparent;
    color: var(--ink);
  }
  .quiet {
    border-color: transparent;
    background: transparent;
    color: var(--ink);
    text-decoration: underline;
  }
  .danger {
    border-color: var(--danger);
  }
  .primary.danger {
    background: var(--danger);
    color: var(--parchment);
  }
  .secondary.danger,
  .quiet.danger {
    color: var(--danger);
  }
  .quiet.danger {
    border-color: transparent;
  }
  .action:active:not(:disabled) {
    transform: translateY(1px);
  }
  .action:disabled {
    opacity: 0.4;
    border-style: dashed;
    cursor: default;
  }
  .action:focus-visible {
    outline: 3px solid var(--select);
    outline-offset: 2px;
  }
</style>
