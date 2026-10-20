<script lang="ts">
  import { onMount } from 'svelte';
  import Toasts from '../ui/components/common/Toasts.svelte';
  import Bench from '../ui/screens/Bench.svelte';
  import Cleared from '../ui/screens/Cleared.svelte';
  import Codex from '../ui/screens/Codex.svelte';
  import Combat from '../ui/screens/Combat.svelte';
  import Crossroads from '../ui/screens/Crossroads.svelte';
  import Desk from '../ui/screens/Desk.svelte';
  import Gallery from '../ui/screens/Gallery.svelte';
  import Lab from '../ui/screens/Lab.svelte';
  import Loot from '../ui/screens/Loot.svelte';
  import CityMap from '../ui/screens/Map.svelte';
  import Study from '../ui/screens/Study.svelte';
  import Threshold from '../ui/screens/Threshold.svelte';
  import TripPage from '../ui/screens/TripPage.svelte';
  import Wiped from '../ui/screens/Wiped.svelte';
  import { BUILD } from './build';
  import { resolveScreen } from './flow';
  import { game } from './instance';
  import { go, router } from './router.svelte';
  import { toast } from './toasts.svelte';

  const resolved = $derived(resolveScreen(router.route, game.save.trip, game.wipe, game.save.lastTrip));

  onMount(() => {
    if (game.recovered) {
      toast(
        game.older
          ? 'This notebook is from an older edition. Starting a fresh one; the old text is kept.'
          : 'The saved notebook could not be read. Starting fresh; the old text is kept.',
        'warn',
      );
    }
  });

  function downloadRetainedSave(): void {
    const url = URL.createObjectURL(new Blob([game.exportText()], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'apprentices-notebook.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  // The trip (or a pending wipe) decides the screen; rewrite the URL to match without piling up history.
  $effect(() => {
    if (!game.refusal && resolved.redirect) go(resolved.redirect, undefined, { replace: true });
  });
</script>

<main>
  {#if game.refusal}
    <section class="refusal" aria-labelledby="refusal-title">
      <h1 id="refusal-title">Your notebook is safe</h1>
      <p>This notebook is too large for this edition to open. Your saved text has been kept in place.</p>
      <p>{game.refusal}</p>
      <button type="button" class="tap" onclick={downloadRetainedSave}>Download saved notebook</button>
    </section>
  {:else if resolved.screen === 'study'}
    <Study />
  {:else if resolved.screen === 'codex'}
    <Codex />
  {:else if resolved.screen === 'bench'}
    <Bench />
  {:else if resolved.screen === 'desk'}
    <Desk />
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
  {:else if resolved.screen === 'tripPage'}
    <TripPage />
  {:else if resolved.screen === 'map'}
    <CityMap />
  {:else if resolved.screen === 'threshold'}
    <Threshold />
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
  .refusal {
    height: 100%;
    overflow-y: auto;
    padding: var(--space-4);
    overflow-wrap: anywhere;
  }
  .refusal button {
    min-height: 44px;
    max-width: 100%;
    margin-top: var(--space-3);
    padding: var(--space-3);
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
