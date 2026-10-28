<script lang="ts">
  import { tick } from 'svelte';
  import type { DistrictId } from '$data';
  import { seeMap } from '$engine';
  import type { StartAt } from '$engine/districts/types';
  import { MAP_PAGE_HEIGHT, mapNodes, mapPaths, underSeam } from '../../app/city';
  import { game } from '../../app/instance';
  import { href } from '../../app/routes';
  import { toast } from '../../app/toasts.svelte';
  import DistrictNode from '../components/map/DistrictNode.svelte';
  import SetOutSheet from '../components/map/SetOutSheet.svelte';

  // New ink shows once: remember what was fresh on arrival, then mark the map seen.
  const freshOnArrival = new Set<DistrictId>(game.profile.city.fresh);
  const nodes = $derived(mapNodes(game.profile).map((n) => ({ ...n, fresh: freshOnArrival.has(n.id) })));
  const paths = $derived(mapPaths(nodes));
  const under = $derived(underSeam(game.profile));
  let target = $state<DistrictId | null>(null);
  let scroller = $state<HTMLElement | null>(null);

  $effect(() => {
    if (game.profile.city.fresh.length) game.updateProfile(seeMap);
  });

  // The Seam sits low on a tall page: open at the bottom, then bring the highest new ink into view.
  $effect(() => {
    const el = scroller;
    if (!el) return;
    void tick().then(() => {
      el.scrollTop = el.scrollHeight;
      const topFresh = [...freshOnArrival]
        .map((id) => el.querySelector<HTMLElement>(`[data-testid="node-${id}"]`))
        .filter((e): e is HTMLElement => e !== null)
        .sort((a, b) => a.offsetTop - b.offsetTop)[0];
      topFresh?.scrollIntoView({ block: 'center' });
    });
  });

  function setOut(at: StartAt): void {
    if (!target) return;
    const why = game.setOut(target, at);
    target = null;
    if (why) toast(why, 'warn');
  }
</script>

<div class="map" data-testid="map">
  <header>
    <a class="back" href={href('study')} data-testid="map-back">&larr; The study</a>
    <h1>The owner's map</h1>
  </header>
  <div class="scroll" bind:this={scroller}>
    <div class="page" style:height="{MAP_PAGE_HEIGHT}px">
      <svg class="paths" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {#each paths as p (p.id)}
          <line
            x1={p.x1}
            y1={p.y1}
            x2={p.x2}
            y2={p.y2}
            class:dashed={!p.open}
            vector-effect="non-scaling-stroke"
          />
        {/each}
      </svg>
      {#each nodes as n (n.id)}
        {#if n.id === 'seam'}
          <DistrictNode node={n} onopen={() => (target = n.id)} under={underSeamSlot} />
        {:else}
          <DistrictNode node={n} onopen={() => (target = n.id)} />
        {/if}
      {/each}
    </div>
  </div>
  <SetOutSheet
    open={target !== null}
    district={target}
    profile={game.profile}
    onclose={() => (target = null)}
    onsetout={setOut}
  />
</div>

<!-- The slot under the Seam (DK-E5): the lower Seam's stair, and the owner's door beside it. SM draws both into it. -->
{#snippet underSeamSlot()}
  <div class="under" data-testid="under-seam" data-stair={under.stair} data-door={under.door}>
    {#if under.stair}
      <span class="stem"></span>
      <svg class="stair" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 20h5v-4h5v-4h5V8h3" />
      </svg>
    {/if}
  </div>
{/snippet}

<style>
  .map {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    box-sizing: border-box;
    height: 100%;
    padding: var(--space-3);
    padding-top: calc(var(--space-3) + var(--safe-top));
    background: var(--wall);
    overflow-x: hidden;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }
  h1 {
    margin: 0;
    font-family: var(--hand);
    font-size: 22px;
    font-weight: normal;
    color: var(--parchment);
  }
  .back {
    display: inline-flex;
    align-items: center;
    min-height: var(--tap);
    color: var(--parchment);
    text-decoration: none;
  }
  /* The page is taller than the screen: the Seam sits low and the districts climb above it. */
  .scroll {
    flex: 1;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .page {
    position: relative;
    width: 100%;
    background: var(--parchment);
    color: var(--ink);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    clip-path: polygon(0 1%, 8% 0, 22% 1.2%, 40% 0, 61% 1%, 80% 0, 100% 1.4%, 99% 40%, 100% 70%, 98.5% 100%, 70% 99%, 45% 100%, 20% 98.8%, 0 100%, 1% 60%);
  }
  .paths {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  line {
    stroke: var(--ink);
    stroke-width: 2;
    stroke-linecap: round;
  }
  line.dashed {
    stroke: var(--ink-faint);
    stroke-dasharray: 3 6;
  }
  .under {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 90px;
    color: var(--ink-soft);
  }
  .stem {
    width: 0;
    height: 28px;
    border-left: 2px dashed var(--ink-faint);
  }
  .stair {
    width: 32px;
    height: 32px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
