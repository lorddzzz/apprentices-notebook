<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    round: number;
    children?: Snippet;
  }

  let { title, round, children }: Props = $props();
</script>

<header class="top" data-testid="topbar">
  <span class="title">Round {round} · {title}</span>
  {#if children}{@render children()}{/if}
</header>

<style>
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    min-height: 32px;
    font-size: 15px;
  }
  .title {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
