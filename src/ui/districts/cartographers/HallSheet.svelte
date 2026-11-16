<script lang="ts">
  import type { BoardView } from '../../../app/view';
  import BattleBoard from '../../components/board/BattleBoard.svelte';
  import { boardViewBox } from '../../components/board/geometry';
  import { hallOverlay, hallView } from '../../screens/galleryFixtures';
  import BlankPiece from './BlankPiece.svelte';
  import CircleMark from './CircleMark.svelte';
  import OutlinePiece from './OutlinePiece.svelte';
  import PencilPiece from './PencilPiece.svelte';

  // The BF-1 method: the whole sheet under a greyscale or colour-blindness filter.
  const MODES = ['none', 'grayscale', 'protan', 'deutan', 'tritan'] as const;
  type Mode = (typeof MODES)[number];
  let mode = $state<Mode>('none');

  // Machado et al. 2009, severity 1.0
  const MATRIX: Record<Exclude<Mode, 'none' | 'grayscale'>, string> = {
    protan: '0.152 1.053 -0.205 0 0  0.115 0.786 0.099 0 0  -0.004 -0.048 1.052 0 0  0 0 0 1 0',
    deutan: '0.367 0.861 -0.228 0 0  0.280 0.673 0.047 0 0  -0.012 0.043 0.969 0 0  0 0 0 1 0',
    tritan: '1.256 -0.077 -0.179 0 0  -0.078 0.931 0.148 0 0  0.005 0.691 0.304 0 0  0 0 0 1 0',
  };
  const stageFilter = $derived(
    mode === 'none' ? 'none' : mode === 'grayscale' ? 'grayscale(1)' : `url(#hall-${mode})`,
  );

  const view: BoardView = hallView();
  const overlay = hallOverlay();
  const aspect = (v: BoardView): string => {
    const [, , w, h] = boardViewBox(v.width, v.height).split(' ');
    return `${w} / ${h}`;
  };

  // Pieces at the size of a phone tile (47px) and large, one specimen each.
  const SPECIMENS: { label: string; kind: 'pencil' | 'blank' | 'outline'; data: unknown }[] = [
    { label: 'pencil', kind: 'pencil', data: { fate: null, due: null } },
    { label: 'ink @2', kind: 'pencil', data: { fate: 'ink', due: 2 } },
    { label: 'rub @1', kind: 'pencil', data: { fate: 'rub', due: 1 } },
    { label: 'blank', kind: 'blank', data: {} },
    { label: 'surveyor', kind: 'outline', data: { foe: 'surveyor', due: 3 } },
    { label: 'eraser', kind: 'outline', data: { foe: 'eraser', due: 2 } },
    { label: 'tracer', kind: 'outline', data: { foe: 'tracer', due: null } },
  ];
</script>

<div class="sheet">
  <div class="row">
    {#each MODES as m (m)}
      <button type="button" aria-pressed={mode === m} onclick={() => (mode = m)}>{m}</button>
    {/each}
  </div>
  <svg width="0" height="0" aria-hidden="true" style="position:absolute">
    {#each Object.entries(MATRIX) as [id, values] (id)}
      <filter id="hall-{id}" color-interpolation-filters="sRGB">
        <feColorMatrix type="matrix" {values} />
      </filter>
    {/each}
  </svg>
  <div class="stage" style:filter={stageFilter} data-testid="hall-stage" data-mode={mode}>
    <h2>Paper</h2>
    <svg viewBox="0 0 {SPECIMENS.length * 110} 170" role="img" aria-label="Paper specimens">
      {#each SPECIMENS as sp, i (sp.label)}
        <g transform="translate({i * 110 + 5} 5)">
          <rect width="100" height="100" fill="var(--parchment)" stroke="var(--line)" stroke-width="1.5" />
          {#if sp.kind === 'pencil'}
            <PencilPiece data={sp.data} size={100} />
          {:else if sp.kind === 'blank'}
            <BlankPiece data={sp.data} size={100} />
          {:else}
            <OutlinePiece data={sp.data} size={100} />
          {/if}
          <text x="50" y="124" text-anchor="middle" font-size="15" fill="var(--ink)" font-family="var(--mono)">{sp.label}</text>
        </g>
      {/each}
    </svg>
    <h2>Circles</h2>
    <svg viewBox="0 0 540 130" role="img" aria-label="Circle specimens">
      {#each [
        { at: { x: 0, y: 0 }, data: { source: 'registrar', state: 'shown', holder: 'hand' }, label: 'shown' },
        { at: { x: 1, y: 0 }, data: { source: 'registrar', state: 'drawn', holder: 'self' }, label: 'drawn' },
        { at: { x: 2, y: 0 }, data: { source: 'note', state: 'drawn', holder: 'member' }, label: 'note' },
      ] as c, i (c.label)}
        <g transform="translate({i * 180 + 5} 5)">
          <rect width="170" height="100" fill="var(--parchment)" />
          <g transform="translate(35 0)"><CircleMark at={{ x: 0, y: 0 }} to={{ x: 1, y: 0 }} data={c.data} /></g>
          <text x="85" y="122" text-anchor="middle" font-size="15" fill="var(--ink)" font-family="var(--mono)">{c.label}</text>
        </g>
      {/each}
    </svg>
    <h2>The hall, 7 x 9</h2>
    <div class="boardbox" style:aspect-ratio={aspect(view)} data-testid="hall-board">
      <BattleBoard {view} {overlay} showNext ontap={() => {}} />
    </div>
  </div>
</div>

<style>
  .sheet {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .row button {
    min-height: var(--tap);
    padding: 0 var(--space-2);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--parchment);
    color: var(--ink);
  }
  .row button[aria-pressed='true'] {
    background: var(--ink);
    color: var(--parchment);
  }
  .stage {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  h2 {
    margin: var(--space-2) 0 0;
    font-size: 1rem;
  }
  svg {
    width: 100%;
    height: auto;
  }
  .boardbox {
    width: 100%;
  }
</style>
