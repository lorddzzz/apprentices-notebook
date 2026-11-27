<script lang="ts">
  import { tick } from 'svelte';
  import type { DistrictId } from '$data';
  import { MAP_HEADING } from '$data/narration';
  import { seeMap } from '$engine';
  import type { StartAt } from '$engine/districts/types';
  import { MAP_PAGE_HEIGHT, mapNodes, mapPageHeight, mapPaths, pagesExtra, underSeam } from '../../app/city';
  import { game } from '../../app/instance';
  import { href } from '../../app/routes';
  import { toast } from '../../app/toasts.svelte';
  import { frontierMarks } from '../../app/tripUx';
  import ArtImage from '../art/ArtImage.svelte';
  import { artMeta } from '../art/meta';
  import { type ArtId, artUrl } from '../art/registry';
  import AppHeader from '../components/common/AppHeader.svelte';
  import Unseen from '../components/common/Unseen.svelte';
  import DistrictNode from '../components/map/DistrictNode.svelte';
  import SetOutSheet from '../components/map/SetOutSheet.svelte';
  import { DISTRICT_UI } from '../districts';

  // New ink shows once: remember what was fresh on arrival, then mark the map seen.
  const freshOnArrival = new Set<DistrictId>(game.profile.city.fresh);
  const nodes = $derived(mapNodes(game.profile).map((n) => ({ ...n, fresh: freshOnArrival.has(n.id) })));
  const paths = $derived(mapPaths(nodes));
  const marks = $derived(frontierMarks(game.profile));
  // One transform for every layer (UT-D8): the plate, each ink crop, the paths and the marks are
  // placed in percents of the node layer, which is its real width x MAP_PAGE_HEIGHT. A crop's
  // bbox is in 750x3800 master pixels, so the same percents hold at 375, 430 and the 480 column.
  const PLATE_W = 750;
  const PLATE_H = 3800;
  interface Crop {
    id: DistrictId;
    art: ArtId;
    left: number;
    top: number;
    width: number;
    height: number;
    fresh: boolean;
  }
  const crops = $derived(
    nodes.flatMap((n): Crop[] => {
      if (n.state !== 'open') return [];
      const art: ArtId = `map/city/ink-${n.id}`;
      const box = artUrl(art) ? artMeta(art)?.bbox : undefined;
      if (!box) return [];
      return [
        {
          id: n.id,
          art,
          left: (box.x / PLATE_W) * 100,
          top: (box.y / PLATE_H) * 100,
          width: (box.w / PLATE_W) * 100,
          height: (box.h / PLATE_H) * 100,
          fresh: n.fresh,
        },
      ];
    }),
  );
  const UnderNode = DISTRICT_UI.lowerSeam?.underNode;
  const UnderPages = DISTRICT_UI.inkedPage?.underPages;
  // Dev check only: `window.__lowerFloors = [...]` draws fixture floors under the Seam.
  const fixtureFloors = import.meta.env.DEV ? (window as { __lowerFloors?: DistrictId[] }).__lowerFloors : undefined;
  // The page grows with what hangs under the Seam (pages, the door row); the nodes keep their layer.
  const pageHeight = $derived(mapPageHeight(pagesExtra(underSeam(game.profile, undefined, fixtureFloors))));
  let target = $state<DistrictId | null>(null);
  /** The drawn page Set out is open for (EN-7), when `target` is 'inkedPage'. */
  let pageSlot = $state<0 | 1 | 2 | null>(null);
  /** A district's own map sheet (the Seam's margin) that is open. */
  let sheetOf = $state<DistrictId | null>(null);
  const Sheet = $derived(sheetOf ? DISTRICT_UI[sheetOf]?.mapSheet?.sheet : undefined);
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
      // The frontier: new ink, else a genuine frontier mark; the highest of them.
      const topFresh = [
        ...[...freshOnArrival].map((id) => `[data-testid="node-${id}"]`),
        ...marks.map((m) => `[data-testid="frontier-${m.id}"]`),
      ]
        .map((q) => el.querySelector<HTMLElement>(q))
        .filter((e): e is HTMLElement => e !== null)
        .sort((a, b) => a.offsetTop - b.offsetTop)[0];
      topFresh?.scrollIntoView({ block: 'center' });
    });
  });

  function setOut(at: StartAt): void {
    if (!target) return;
    const why = game.setOut(target, at, target === 'inkedPage' ? (pageSlot ?? undefined) : undefined);
    target = null;
    pageSlot = null;
    if (why) toast(why, 'warn');
  }
</script>

<div class="map" data-testid="map" data-world="city">
  <AppHeader variant="city" title={MAP_HEADING}>
    {#snippet crest()}
      <a class="back" href={href('study')} data-testid="map-back">&larr; Study</a>
    {/snippet}
  </AppHeader>
  <div class="scroll" bind:this={scroller}>
    <div class="page" style:height="{pageHeight}px">
      <div class="layer" style:height="{MAP_PAGE_HEIGHT}px">
        <div class="plate" aria-hidden="true" data-testid="map-plate">
          <ArtImage id="map/city/halvemeer" fit="cover" />
        </div>
        {#each crops as c (c.id)}
          <div
            class="ink"
            class:fresh={c.fresh}
            data-testid={`ink-${c.id}`}
            style:left="{c.left}%"
            style:top="{c.top}%"
            style:width="{c.width}%"
            style:height="{c.height}%"
            aria-hidden="true"
          >
            <ArtImage id={c.art} fit="cover" />
          </div>
        {/each}
        <svg class="paths" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {#each paths as p (p.id)}
            <line
              x1={p.x1}
              y1={p.y1}
              x2={p.x2}
              y2={p.y2}
              class:dashed={!p.open}
              class:fresh={freshOnArrival.has(p.id as DistrictId)}
              vector-effect="non-scaling-stroke"
            />
          {/each}
        </svg>
        {#each marks as m (m.id)}
          <span class="frontier" style:left="{m.x}%" style:top="{m.y}%" data-testid={`frontier-${m.id}`}>
            <Unseen shape="chip" />
          </span>
        {/each}
        {#each nodes as n (n.id)}
          {#if n.id === 'seam'}
            <DistrictNode node={n} onopen={() => (target = n.id)} onsheet={() => (sheetOf = n.id)} under={underSeamSlot} />
          {:else}
            <DistrictNode node={n} onopen={() => (target = n.id)} onsheet={() => (sheetOf = n.id)} />
          {/if}
        {/each}
      </div>
    </div>
  </div>
  <SetOutSheet
    open={target !== null}
    district={target}
    page={pageSlot}
    profile={game.profile}
    onclose={() => {
      target = null;
      pageSlot = null;
    }}
    onsetout={setOut}
  />
  {#if Sheet}
    <Sheet open={true} profile={game.profile} onclose={() => (sheetOf = null)} />
  {/if}
</div>

<!-- The slot under the Seam (DK-E5, SM-11): the lower Seam draws its stair, floors and the owner's door into it. -->
{#snippet underSeamSlot()}
  {#if UnderNode}
    <UnderNode profile={game.profile} floors={fixtureFloors} onsetout={() => (target = 'lowerSeam')} />
  {/if}
  {#if UnderPages}
    <UnderPages
      profile={game.profile}
      onopen={(slot) => {
        pageSlot = slot;
        target = 'inkedPage';
      }}
    />
  {/if}
{/snippet}

<style>
  .map {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    height: 100%;
    padding-top: var(--safe-top);
    background: var(--wall);
    overflow-x: hidden;
  }
  .back {
    display: inline-flex;
    align-items: center;
    min-width: 44px;
    min-height: 44px;
    padding: 0 var(--space-1);
    white-space: nowrap;
    color: inherit;
    text-decoration: none;
  }
  /* The page is taller than the screen: the Seam sits low and the districts climb above it. */
  .scroll {
    flex: 1;
    min-height: 0;
    box-sizing: border-box;
    padding: var(--space-2) var(--space-3) var(--space-3);
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
  .layer {
    position: relative;
  }
  /* Base plate: the node layer's real width x 1900 px, whatever the width (stretched, not cropped). */
  .plate,
  .ink {
    position: absolute;
    pointer-events: none;
  }
  .plate {
    inset: 0;
  }
  .plate :global(img),
  .ink :global(img) {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: fill !important;
  }
  .ink.fresh {
    animation: ink-in var(--dur-base) ease-out;
  }
  .paths {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .frontier {
    position: absolute;
    transform: translate(-50%, -50%);
    pointer-events: none;
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
  line.fresh {
    animation: ink-in var(--dur-base) ease-out;
  }
  @keyframes ink-in {
    from {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ink.fresh,
    line.fresh {
      animation: none;
    }
  }
</style>
