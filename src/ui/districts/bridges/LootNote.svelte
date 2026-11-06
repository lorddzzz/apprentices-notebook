<script lang="ts">
  import type { Trip } from '$engine';
  import { passView, watchpostView } from './ledger';

  let { trip }: { trip: Trip } = $props();
  const post = $derived(watchpostView(trip));
  const pass = $derived(passView(trip));
</script>

{#if post}
  <div class="note" data-testid="watchpost">
    <p class="scene">{post.scene}</p>
    <p class="ledger">{post.ledger}</p>
    <p class="hand">{post.hand}</p>
  </div>
{/if}
{#if pass}
  <p class="note pass" data-testid="pass-note"><strong>{pass.title}.</strong> {pass.text}</p>
{/if}

<style>
  .note {
    margin: 4px 0 0;
    font-size: 13px;
    line-height: 1.3;
    color: var(--ink-soft);
  }
  .scene {
    margin: 0;
    font-style: italic;
    color: var(--ink);
  }
  .ledger {
    margin: 2px 0 0;
  }
  .hand {
    margin: 0;
    font-size: 12px;
    text-align: right;
  }
  strong {
    font-weight: normal;
    color: var(--ink);
  }
</style>
