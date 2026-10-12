<script lang="ts">
  import Toasts from '../ui/components/common/Toasts.svelte';
  import Codex from '../ui/screens/Codex.svelte';
  import Combat from '../ui/screens/Combat.svelte';
  import Gallery from '../ui/screens/Gallery.svelte';
  import Lab from '../ui/screens/Lab.svelte';
  import Study from '../ui/screens/Study.svelte';
  import { BUILD } from './build';
  import { router } from './router.svelte';
</script>

<main>
  {#if router.route === 'study'}
    <Study />
  {:else if router.route === 'trip'}
    <Combat />
  {:else if router.route === 'codex'}
    <Codex />
  {:else if router.route === 'gallery'}
    <Gallery />
  {:else}
    <Lab />
  {/if}
  <Toasts />
  <span class="build">{BUILD}</span>
</main>

<style>
  main {
    position: relative;
    height: 100%;
    padding: var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left);
    background: var(--parchment);
    overflow: hidden;
  }
  .build {
    position: absolute;
    right: calc(var(--safe-right) + var(--space-2));
    bottom: calc(var(--safe-bottom) + var(--space-2));
    font: 11px ui-monospace, Menlo, monospace;
    color: var(--ink);
    opacity: 0.55;
    pointer-events: none;
  }
</style>
