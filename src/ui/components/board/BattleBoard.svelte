<script lang="ts">
  import type { Coord } from '$engine';
  import type { Beat } from '../../../app/beats';
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
  import { boardLayersFor } from '../../districts';
  import BadgeLayer from './BadgeLayer.svelte';
  import FxLayer from './FxLayer.svelte';
  import type { FightArtContext } from './fightArt';
  import { byRow } from './figure';
  import { boardLayout, boardViewBox, CELL, GUTTER } from './geometry';
  import HighlightLayer from './HighlightLayer.svelte';
  import HpPips from './HpPips.svelte';
  import IntentLayer from './IntentLayer.svelte';
  import JarLayer from './JarLayer.svelte';
  import { cellLabel } from './label';
  import MarksLayer from './MarksLayer.svelte';
  import PieceLayer from './PieceLayer.svelte';
  import RivalMarks from './RivalMarks.svelte';
  import RulePreviewLayer from './RulePreviewLayer.svelte';
  import SceneLayer from './SceneLayer.svelte';
  import SteamLayer from './SteamLayer.svelte';
  import StepLayer from './StepLayer.svelte';
  import StepMarkerLayer from './StepMarkerLayer.svelte';
  import TileLayer from './TileLayer.svelte';
  import UnitFigure from './UnitFigure.svelte';

  interface Props {
    view: BoardView;
    overlay?: Overlay;
    fx?: Fx[];
    fxKey?: number;
    /** A fight discards float timers when its playback ends. */
    playbackActive?: boolean;
    /** Playback: draw intents as chevrons from the view instead of full paths from the overlay. */
    minimal?: boolean;
    /** Draw the active rules' "Next round" preview: the current's floats, cracks, outlines, ghosts. */
    showNext?: boolean;
    /** Not needed when `readonly`. */
    ontap?: (at: Coord, pressedAt?: number) => void;
    /** Record which session input period began this pointer press. */
    cellInputEpoch?: () => number;
    /** Press and hold on a tile (J3: read out a jar or a mark). The tap that ends the hold is swallowed. */
    onhold?: (at: Coord, pressedAt?: number) => void;
    /** Playback step markers (numbers dropped on the cells in order), drawn in the overlay. */
    markers?: readonly { n: number; at: Coord; first: boolean }[];
    /** A held beat: the board dims 30% (scene, tiles and figures; never the overlay or the markers). */
    beat?: Beat | null;
    /** The room's district and arena flag: scene and tile art (FT-D7). None = no scene, shared tiles. */
    kit?: FightArtContext;
    /** UT's "See it" and the Lab placeholder: no taps, no hit rects, no focusable cells. */
    readonly?: boolean;
  }

  let {
    view,
    overlay = EMPTY_OVERLAY,
    fx = [],
    fxKey = 0,
    playbackActive,
    minimal = false,
    showNext = false,
    ontap,
    onhold,
    cellInputEpoch,
    markers = [],
    beat = null,
    kit,
    readonly = false,
  }: Props = $props();

  let boxW = $state(0);
  let boxH = $state(0);
  // The cell's size in px at the board's current box (the visual size; the hit rect is the same cell).
  const layout = $derived(boardLayout(view.width, view.height, boxW, boxH));

  // The districts' own layers (KIT-R2): each draws its `layer` or nothing.
  const layers = boardLayersFor();

  const HOLD_MS = 450;
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  let held = false;
  let pressedAt: number | undefined;

  function startHold(at: Coord): void {
    held = false;
    cancelHold();
    const epoch = cellInputEpoch?.();
    pressedAt = epoch;
    if (!onhold) return;
    holdTimer = setTimeout(() => {
      holdTimer = null;
      held = true;
      onhold(at, epoch);
    }, HOLD_MS);
  }

  function cancelHold(): void {
    if (holdTimer !== null) clearTimeout(holdTimer);
    holdTimer = null;
  }

  function tapped(at: Coord, event: MouseEvent): void {
    cancelHold();
    const epoch = event.detail > 0 ? pressedAt : undefined;
    pressedAt = undefined;
    if (held) {
      held = false;
      return;
    }
    ontap?.(at, epoch);
  }

  const cells = $derived(
    Array.from({ length: view.width * view.height }, (_, i) => ({
      at: { x: i % view.width, y: Math.floor(i / view.width) },
      tile: view.tiles[i],
    })),
  );
  const living = $derived(view.units.filter((u) => u.alive));
  // Drawn by row, then column: a lower figure overdraws the row above (FT-D10).
  const figures = $derived(byRow(living));
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
  data-district={kit?.district}
  data-cell={layout.cell > 0 ? layout.cell.toFixed(1) : undefined}
  viewBox={boardViewBox(view.width, view.height)}
  preserveAspectRatio="xMidYMid meet"
  role="group"
  aria-label="Battle board"
  bind:clientWidth={boxW}
  bind:clientHeight={boxH}
>
  <defs>
    <pattern id="hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="5" height="14" fill="var(--danger)" opacity="0.35" />
    </pattern>
  </defs>

  <!-- 1 scene: the district behind the grid -->
  <g data-layer="scene">
    <SceneLayer cols={view.width} rows={view.height} {kit} />
  </g>

  <!-- 2 tiles: labels, floors and materials, district pieces and the districts' surface layers -->
  <g data-layer="tiles">
    <g class="labels" aria-hidden="true">
      {#each columns as c, x (c)}
        <text x={x * CELL + CELL / 2} y="-6" text-anchor="middle">{c}</text>
      {/each}
      {#each rows as r, y (r)}
        <text x="-8" y={y * CELL + CELL / 2 + 6} text-anchor="middle">{r}</text>
      {/each}
    </g>

    {#each cells as { at, tile } (`${at.x},${at.y}`)}
      {#if tile}
        <TileLayer {tile} {at} {kit} />
      {/if}
    {/each}

    <PieceLayer {cells} />
    {#each layers as Layer, i (i)}<Layer {view} layer="under" />{/each}
  </g>

  <!-- 3 units: figures, jars, clouds over them, the districts' badges -->
  <g data-layer="units">
    {#each figures as unit (unit.id)}
      <UnitFigure {unit} selected={overlay.selected === unit.id} dim={false} {view} {kit} />
    {/each}

    <JarLayer {view} />
    <SteamLayer {view} />
    {#each layers as Layer, i (i)}<Layer {view} layer="badges" />{/each}
  </g>

  {#if beat}
    <rect
      class="scrim"
      data-scrim
      x={-GUTTER}
      y={-GUTTER}
      width={view.width * CELL + GUTTER}
      height={view.height * CELL + GUTTER}
      fill="var(--night)"
      opacity="0.3"
      pointer-events="none"
    />
  {/if}

  <!-- 4 overlay: what the next moves mean, always above every figure -->
  <g data-layer="overlay">
    <HighlightLayer highlights={overlay.highlights} />
    <HpPips units={living} />
    {#if next}<RulePreviewLayer shapes={next.shapes} />{/if}
    <StepLayer {steps} layer="under" />
    <IntentLayer {intents} {minimal} layer="paths" />
    <RivalMarks {rivals} layer="under" />
    <MarksLayer {marks} layer="under" />
    <IntentLayer {intents} {minimal} layer="badges" />
    <StepLayer {steps} layer="badges" />
    <RivalMarks {rivals} layer="badges" />
    <MarksLayer {marks} layer="badges" />
    <BadgeLayer badges={overlay.badges} {ghosts} occupied={living.map((u) => u.pos)} />
    <StepMarkerLayer {markers} />
  </g>

  <!-- 5 fx -->
  <g data-layer="fx">
    {#if playbackActive !== false}
      <FxLayer {fx} {fxKey} width={view.width} height={view.height} />
    {/if}
  </g>

  <!-- Hit rects: one cell each, above all artwork. None when the board is read-only. -->
  {#if !readonly}
    <g data-hit>
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
          onclick={(event) => tapped(at, event)}
          onpointerdown={() => startHold(at)}
          onpointerup={cancelHold}
          onpointerleave={cancelHold}
          onpointercancel={() => {
            cancelHold();
            pressedAt = undefined;
          }}
          oncontextmenu={(e) => {
            if (onhold) e.preventDefault();
          }}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              ontap?.(at);
            }
          }}
        />
      {/each}
    </g>
  {/if}
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
    font: 18px var(--mono);
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
