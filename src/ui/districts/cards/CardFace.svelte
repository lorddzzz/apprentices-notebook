<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    text: string;
    mark: Snippet;
  }

  let { title, text, mark }: Props = $props();
</script>

<span class="mark">{@render mark()}</span>
<span class="words">
  <span class="title">{title}</span>
  <span class="text">{text}</span>
</span>

<style>
  .mark {
    display: grid;
    place-items: center;
    flex: none;
    width: 56px;
  }
  .words {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .title {
    font-size: 19px;
  }
  .text {
    font-size: 13px;
    line-height: 1.25;
    color: var(--ink-soft);
  }
</style>
