<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * C7 (frozen props). One primary per screen: a gold-edged lamp fill under a home or city world
   * root, an ink fill on the system world (and anywhere no world is declared). Secondary is
   * outlined in the surrounding text colour, quiet is underlined text, `danger` swaps in --danger.
   * Disabled is dashed, italic and faded (and quiet loses its underline), so it never relies on
   * colour alone.
   */
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
    border: 2px solid currentColor;
    border-radius: var(--radius);
    background: transparent;
    color: inherit;
    font-family: var(--font-serif);
    font-size: var(--type-md);
    cursor: pointer;
  }
  .primary {
    border-color: var(--ink);
    background: var(--ink);
    color: var(--parchment);
  }
  :global([data-world="home"]) .primary,
  :global([data-world="city"]) .primary {
    border-color: var(--gold);
    background: linear-gradient(var(--home-lamp), color-mix(in srgb, var(--home-lamp) 78%, #8f5a00));
    box-shadow: 0 0 10px rgba(232, 176, 74, 0.35);
    color: var(--home-ink);
  }
  :global([data-world="system"]) .primary {
    border-color: var(--system-ink);
    background: var(--system-ink);
    box-shadow: none;
    color: var(--system-paper);
  }
  .quiet {
    border-color: transparent;
    text-decoration: underline;
  }
  .danger {
    border-color: var(--danger);
    color: var(--danger);
  }
  .primary.danger {
    background: var(--danger);
    box-shadow: none;
    color: var(--parchment);
  }
  :global([data-world="system"]) .primary.danger {
    border-color: var(--danger);
    background: var(--danger);
    color: var(--parchment);
  }
  .quiet.danger {
    border-color: transparent;
  }
  /* --danger is dark: on the dark home and city worlds it sits on a paper chip to stay readable. */
  :global([data-world="home"]) .danger:not(.primary),
  :global([data-world="city"]) .danger:not(.primary) {
    background: var(--world-paper);
  }
  .action:active:not(:disabled) {
    transform: translateY(1px);
  }
  .action:disabled,
  :global([data-world]) .action:disabled {
    border-style: dashed;
    box-shadow: none;
    font-style: italic;
    opacity: 0.45;
    cursor: not-allowed;
  }
  .primary:disabled,
  :global([data-world]) .primary:disabled {
    border-color: var(--ink-faint);
    background:
      repeating-linear-gradient(-45deg, transparent 0 6px, rgba(43, 33, 24, 0.14) 6px 8px),
      var(--parchment-dark);
    color: var(--ink-soft);
  }
  .quiet:disabled {
    text-decoration: none;
  }
  .action:focus-visible {
    outline: 3px solid var(--select);
    outline-offset: 2px;
  }
</style>
