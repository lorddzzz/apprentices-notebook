<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    title: string;
    onclose: () => void;
    children: Snippet;
  }

  let { open, title, onclose, children }: Props = $props();
</script>

<svelte:window onkeydown={(e) => open && e.key === 'Escape' && onclose()} />

{#if open}
  <div class="overlay">
    <button type="button" class="scrim" aria-label="Close" onclick={onclose}></button>
    <div class="sheet panel" role="dialog" aria-modal="true" aria-label={title}>
      <header>
        <h2>{title}</h2>
        <button type="button" class="close tap" aria-label="Close" onclick={onclose}>&times;</button>
      </header>
      <div class="body">{@render children()}</div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: absolute;
    inset: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }
  .scrim {
    position: absolute;
    inset: 0;
    border: 0;
    padding: 0;
    background: rgba(43, 33, 24, 0.5);
    cursor: default;
  }
  .panel {
    position: relative;
    max-height: 70%;
    display: flex;
    flex-direction: column;
    padding-bottom: var(--safe-bottom);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-2) 0 var(--space-3);
    border-bottom: 1px solid var(--line);
  }
  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: normal;
  }
  .close {
    border: 0;
    background: none;
    font-size: 28px;
    line-height: 1;
    cursor: pointer;
  }
  .body {
    overflow-y: auto;
    padding: var(--space-3);
    -webkit-user-select: text;
    user-select: text;
  }
</style>
