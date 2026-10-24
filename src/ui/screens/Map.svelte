<script lang="ts">
  import type { DistrictId } from '$data';
  import { seeMap } from '$engine';
  import type { StartAt } from '$engine/districts/types';
  import { mapNodes, mapPaths } from '../../app/city';
  import { game } from '../../app/instance';
  import { href } from '../../app/routes';
  import { toast } from '../../app/toasts.svelte';
  import DistrictNode from '../components/map/DistrictNode.svelte';
  import SetOutSheet from '../components/map/SetOutSheet.svelte';

  // New ink shows once: remember what was fresh on arrival, then mark the map seen.
  const freshOnArrival = new Set<DistrictId>(game.profile.city.fresh);
  const nodes = $derived(mapNodes(game.profile).map((n) => ({ ...n, fresh: freshOnArrival.has(n.id) })));
  const paths = $derived(mapPaths(nodes));
  let target = $state<DistrictId | null>(null);

  $effect(() => {
    if (game.profile.city.fresh.length) game.updateProfile(seeMap);
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
  <div class="page">
    <svg class="paths" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {#each paths as p (p.id)}
        <line
          x1={p.from.x}
          y1={p.from.y}
          x2={p.to.x}
          y2={p.to.y}
          class:dashed={p.to.state !== 'open'}
          vector-effect="non-scaling-stroke"
        />
      {/each}
    </svg>
    {#each nodes as n (n.id)}
      <DistrictNode node={n} onopen={() => (target = n.id)} />
    {/each}
  </div>
  <SetOutSheet
    open={target !== null}
    district={target}
    profile={game.profile}
    onclose={() => (target = null)}
    onsetout={setOut}
  />
</div>

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
  .page {
    position: relative;
    flex: 1;
    min-height: 0;
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
</style>
