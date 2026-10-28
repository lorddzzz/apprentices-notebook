<script lang="ts">
  import type { Coord } from '$engine';
  import type { Fx } from '../../../app/fx';
  import {
    EMPTY_OVERLAY,
    type IntentDraw,
    type IntentMark,
    marksOf,
    type Overlay,
    type RivalDraw,
    rivalMarksOf,
    type StepDraw,
    stepsOf,
  } from '../../../app/overlay';
  import type { BoardView } from '../../../app/view';
  import BadgeLayer from './BadgeLayer.svelte';
  import FxLayer from './FxLayer.svelte';
  import { boardViewBox, CELL } from './geometry';
  import HighlightLayer from './HighlightLayer.svelte';
  import IntentLayer from './IntentLayer.svelte';
  import JarLayer from './JarLayer.svelte';
  import { cellLabel } from './label';
  import MarksLayer from './MarksLayer.svelte';
  import PieceLayer from './PieceLayer.svelte';
  import RivalMarks from './RivalMarks.svelte';
  import RulePreviewLayer from './RulePreviewLayer.svelte';
  import SteamLayer from './SteamLayer.svelte';
  import StepLayer from './StepLayer.svelte';
  import TileLayer from './TileLayer.svelte';
  import UnitToken from './UnitToken.svelte';

  interface Props {
    view: BoardView;
    overlay?: Overlay;
    fx?: Fx[];
    fxKey?: number;
    /** Playback: draw intents as chevrons from the view instead of full paths from the overlay. */
    minimal?: boolean;
    /** Draw the active rules' "Next round" preview: the current's floats, cracks, outlines, ghosts. */
    showNext?: boolean;
    ontap: (at: Coord) => void;
    /** Press and hold on a tile (J3: read out a jar or a mark). The tap that ends the hold is swallowed. */
    onhold?: (at: Coord) => void;
  }

  let {
    view,
    overlay = EMPTY_OVERLAY,
    fx = [],
    fxKey = 0,
    minimal = false,
    showNext = false,
    ontap,
    onhold,
  }: Props = $props();

  const HOLD_MS = 450;
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  let held = false;

  function startHold(at: Coord): void {
    held = false;
    cancelHold();
    if (!onhold) return;
    holdTimer = setTimeout(() => {
      holdTimer = null;
      held = true;
      onhold(at);
    }, HOLD_MS);
  }

  function cancelHold(): void {
    if (holdTimer !== null) clearTimeout(holdTimer);
    holdTimer = null;
  }

  function tapped(at: Coord): void {
    cancelHold();
    if (held) {
      held = false;
      return;
    }
    ontap(at);
  }

  const cells = $derived(
    Array.from({ length: view.width * view.height }, (_, i) => ({
      at: { x: i % view.width, y: Math.floor(i / view.width) },
      tile: view.tiles[i],
    })),
  );
  const living = $derived(view.units.filter((u) => u.alive));
  const intents = $derived<IntentDraw[]>(
    minimal
      ? living.flatMap((u) =>
          u.intent?.kind === 'attack'
            ? [
                {
                  from: u.pos,
                  path: [],
                  hit: null,
                  order: u.intent.order,
                  attack: u.intent.attack,
                  dir: u.intent.dir,
                  emphasis: 'normal' as const,
                },
              ]
            : [],
        )
      : overlay.intents,
  );

  const rivals = $derived<RivalDraw[]>(
    minimal ? rivalMarksOf(view.units, null) : (overlay.rivals ?? []),
  );
  const marks = $derived<IntentMark[]>(minimal ? marksOf(view.units, null) : (overlay.marks ?? []));
  const steps = $derived<StepDraw[]>(minimal ? stepsOf(view.units) : (overlay.steps ?? []));
  const next = $derived(showNext && !minimal ? (overlay.next ?? null) : null);
  const ghosts = $derived([
    ...overlay.ghosts,
    ...(next?.units.filter((g) => !overlay.ghosts.some((o) => o.unit === g.unit)) ?? []),
  ]);

  const columns = $derived(Array.from({ length: view.width }, (_, x) => String.fromCharCode(65 + x)));
  const rows = $derived(Array.from({ length: view.height }, (_, y) => y + 1));
</script>

<!-- biome-ignore lint/a11y/useSemanticElements: an svg containing focusable cells is a group -->
<svg
  class="board"
  data-testid="board"
  viewBox={boardViewBox(view.width, view.height)}
  preserveAspectRatio="xMidYMid meet"
  role="group"
  aria-label="Battle board"
>
  <defs>
    <pattern id="hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="5" height="14" fill="var(--danger)" opacity="0.35" />
    </pattern>
  </defs>

  <g class="labels" aria-hidden="true">
    {#each columns as c, x (c)}
      <text x={x * CELL + CELL / 2} y="-6" text-anchor="middle">{c}</text>
    {/each}
    {#each rows as r, y (r)}
      <text x="-8" y={y * CELL + CELL / 2 + 7} text-anchor="middle">{r}</text>
    {/each}
  </g>

  {#each cells as { at, tile } (`${at.x},${at.y}`)}
    {#if tile}
      <TileLayer {tile} {at} />
    {/if}
  {/each}

  <PieceLayer {cells} />
  <HighlightLayer highlights={overlay.highlights} />
  {#if next}<RulePreviewLayer shapes={next.shapes} />{/if}
  <StepLayer {steps} layer="under" />
  <IntentLayer {intents} {minimal} layer="paths" />
  <RivalMarks {rivals} layer="under" />
  <MarksLayer {marks} layer="under" />

  {#each living as unit (unit.id)}
    <UnitToken {unit} selected={overlay.selected === unit.id} dim={false} />
  {/each}

  <JarLayer {view} />
  <SteamLayer {view} />
  <IntentLayer {intents} {minimal} layer="badges" />
  <StepLayer {steps} layer="badges" />
  <RivalMarks {rivals} layer="badges" />
  <MarksLayer {marks} layer="badges" />
  <BadgeLayer badges={overlay.badges} {ghosts} />
  <FxLayer {fx} {fxKey} width={view.width} height={view.height} />

  {#each cells as { at } (`${at.x},${at.y}`)}
    <!-- biome-ignore lint/a11y/useSemanticElements: SVG cells cannot be <button> -->
    <rect
      class="hit"
      x={at.x * CELL}
      y={at.y * CELL}
      width={CELL}
      height={CELL}
      role="button"
      tabindex="0"
      aria-label={cellLabel(view, at)}
      onclick={() => tapped(at)}
      onpointerdown={() => startHold(at)}
      onpointerup={cancelHold}
      onpointerleave={cancelHold}
      onpointercancel={cancelHold}
      oncontextmenu={(e) => {
        if (onhold) e.preventDefault();
      }}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          ontap(at);
        }
      }}
    />
  {/each}
</svg>

<style>
  .board {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: manipulation;
    overflow: visible;
  }
  .labels text {
    font: 22px var(--mono);
    fill: var(--ink-soft);
  }
  .hit {
    fill: transparent;
    cursor: pointer;
    outline: none;
  }
  .hit:focus-visible {
    stroke: var(--select);
    stroke-width: 6;
  }
</style>
