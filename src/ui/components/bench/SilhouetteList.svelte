<script lang="ts">
  import type { Silhouette } from '$engine';
  import AspectMark from '../AspectMark.svelte';

  interface Props {
    silhouettes: readonly Silhouette[];
  }

  let { silhouettes }: Props = $props();

  const family = (f: string): string => f.charAt(0).toUpperCase() + f.slice(1);
</script>

<section class="sil" aria-label="Silhouettes" data-testid="silhouettes">
  <h2>Silhouettes <small>{silhouettes.length} left to find</small></h2>
  {#if silhouettes.length === 0}
    <p class="hand">Every page is filled in.</p>
  {:else}
    <ul>
      {#each silhouettes as s (s.recipe)}
        <li data-testid="silhouette">
          <span class="marks">
            <AspectMark aspect={s.aspects[0]} size={20} />
            <AspectMark aspect={s.aspects[1]} size={20} />
          </span>
          <span class="body">
            <span class="top"><b>{family(s.family)}</b> <span class="ink">{s.ink} ink</span></span>
            <span class="sum">[{family(s.parents[0])}] + [{family(s.parents[1])}] + [?]</span>
            {#if s.torn}<span class="torn hand">{s.torn}</span>{/if}
          </span>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .sil {
    min-height: 0;
    overflow-y: auto;
    border-top: 1px solid var(--line);
    padding-top: var(--space-1);
  }
  h2 {
    margin: 0 0 var(--space-1);
    font-size: 14px;
    font-weight: normal;
    font-style: italic;
    color: var(--ink-soft);
  }
  h2 small {
    font-size: 12px;
    font-style: normal;
    color: var(--ink-faint);
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    padding: 6px 0;
    border-bottom: 1px dotted var(--line);
  }
  .marks {
    display: flex;
    gap: 2px;
    padding-top: 1px;
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .top {
    font-size: 14px;
  }
  .ink {
    font: 12px var(--mono);
    color: var(--ink-soft);
  }
  .sum {
    font: 13px var(--mono);
    color: var(--ink-soft);
  }
  .hand {
    font-family: var(--hand);
  }
  .torn {
    font-size: 16px;
    color: var(--accent);
  }
  p {
    margin: 0;
    color: var(--ink-soft);
  }
</style>
