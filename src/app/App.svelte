<script lang="ts">
  import { onMount } from 'svelte';
  import Toasts from '../ui/components/common/Toasts.svelte';
  import Bench from '../ui/screens/Bench.svelte';
  import Cleared from '../ui/screens/Cleared.svelte';
  import Codex from '../ui/screens/Codex.svelte';
  import Combat from '../ui/screens/Combat.svelte';
  import Crossroads from '../ui/screens/Crossroads.svelte';
  import Gallery from '../ui/screens/Gallery.svelte';
  import Lab from '../ui/screens/Lab.svelte';
  import Loot from '../ui/screens/Loot.svelte';
  import Study from '../ui/screens/Study.svelte';
  import Wiped from '../ui/screens/Wiped.svelte';
  import { BUILD } from './build';
  import { resolveScreen } from './flow';
  import { game } from './instance';
  import { go, router } from './router.svelte';
  import { toast } from './toasts.svelte';

  const resolved = $derived(resolveScreen(router.route, game.save.trip, game.wipe));

  onMount(() => {
    if (game.recovered) {
      toast('The saved notebook could not be read. Starting fresh; the old text is kept.', 'warn');
    }
  });

  // The trip (or a pending wipe) decides the screen; rewrite the URL to match without piling up history.
  $effect(() => {
    if (resolved.redirect) go(resolved.redirect, undefined, { replace: true });
  });
</script>

<main>
  {#if resolved.screen === 'study'}
    <Study />
  {:else if resolved.screen === 'codex'}
    <Codex />
  {:else if resolved.screen === 'bench'}
    <Bench />
  {:else if resolved.screen === 'gallery'}
    <Gallery />
  {:else if resolved.screen === 'lab'}
    <Lab />
  {:else if resolved.screen === 'battle'}
    <Combat />
  {:else if resolved.screen === 'loot'}
    <Loot />
  {:else if resolved.screen === 'crossroads'}
    <Crossroads />
  {:else if resolved.screen === 'cleared'}
    <Cleared />
  {:else if resolved.screen === 'wiped'}
    <Wiped />
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
