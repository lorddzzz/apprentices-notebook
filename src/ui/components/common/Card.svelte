<script lang="ts">
  import type { Snippet } from 'svelte';

  /** C7 (frozen props). Sizes to its content, no min-height. */
  interface Props {
    tone?: 'paper' | 'plain';
    children: Snippet;
  }

  let { tone = 'paper', children }: Props = $props();
</script>

<div class="card {tone}">{@render children()}</div>

<style>
  .card {
    padding: var(--space-3);
    border-radius: var(--radius);
    color: var(--ink);
  }
  .paper {
    border: 1px solid var(--parchment-deep);
    background: var(--parchment);
    box-shadow: var(--shadow-1);
  }
  .plain {
    border: 1px solid var(--line);
    background: transparent;
  }
</style>
