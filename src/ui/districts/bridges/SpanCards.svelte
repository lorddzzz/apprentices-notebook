<script lang="ts">
  import type { Trip } from '$engine';
  import { crossroadsCards } from './ledger';

  let { trip }: { trip: Trip } = $props();
  const cards = $derived(crossroadsCards(trip));
</script>

{#if cards.length > 0}
  <div class="spans" data-testid="span-cards">
    {#each cards as c (c.kind)}
      <article class="span" data-testid="span-card-{c.kind}">
        <h3><span class="name">{c.name}</span> <span class="ttl">{c.title}</span></h3>
        <dl>
          {#if c.foes}<div><dt>Foes</dt><dd>{c.foes}</dd></div>{/if}
          <div><dt>Floor</dt><dd>{c.floor}</dd></div>
          <div><dt>Loot</dt><dd>{c.loot}</dd></div>
        </dl>
        {#if c.ledger}
          <details>
            <summary>Mason's ledger</summary>
            <p class="ledger" data-testid="span-ledger-{c.kind}">{c.ledger}</p>
            <p class="hand">{c.hand}</p>
          </details>
        {/if}
      </article>
    {/each}
  </div>
{/if}

<style>
  .spans {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .span {
    padding: var(--space-2);
    border: 1.5px solid var(--ink-faint);
    border-radius: 10px;
    background: var(--parchment);
  }
  h3 {
    margin: 0 0 2px;
    font-size: 16px;
    font-weight: normal;
  }
  .name {
    font-size: 17px;
  }
  .ttl {
    font-size: 13px;
    font-style: italic;
    color: var(--ink-soft);
  }
  dl {
    display: grid;
    gap: 1px;
    margin: 0;
  }
  dl div {
    display: flex;
    gap: 6px;
    font-size: 13px;
    line-height: 1.25;
  }
  dt {
    flex: none;
    width: 38px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--ink-soft);
  }
  dd {
    margin: 0;
    color: var(--ink);
  }
  summary {
    margin-top: 4px;
    min-height: 24px;
    font-size: 13px;
    color: var(--ink-soft);
  }
  .ledger {
    margin: 2px 0 0;
    font-size: 13px;
    font-style: italic;
    line-height: 1.3;
  }
  .hand {
    margin: 2px 0 0;
    font-size: 12px;
    text-align: right;
    color: var(--ink-soft);
  }
</style>
