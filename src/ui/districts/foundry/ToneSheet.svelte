<script lang="ts">
  import { TONES, type Tone } from '$data/districts/foundry';
  import BellPiece from './BellPiece.svelte';

  const CELL = 47;
  const MODES = ['none', 'grayscale', 'protan', 'deutan', 'tritan'] as const;
  type Mode = (typeof MODES)[number];
  let mode = $state<Mode>('none');
  let dark = $state(false);

  // Machado et al. 2009, severity 1.0
  const MATRIX: Record<Exclude<Mode, 'none' | 'grayscale'>, string> = {
    protan: '0.152 1.053 -0.205 0 0  0.115 0.786 0.099 0 0  -0.004 -0.048 1.052 0 0  0 0 0 1 0',
    deutan: '0.367 0.861 -0.228 0 0  0.280 0.673 0.047 0 0  -0.012 0.043 0.969 0 0  0 0 0 1 0',
    tritan: '1.256 -0.077 -0.179 0 0  -0.078 0.931 0.148 0 0  0.005 0.691 0.304 0 0  0 0 0 1 0',
  };
  const stageFilter = $derived(
    mode === 'none' ? 'none' : mode === 'grayscale' ? 'grayscale(1)' : `url(#tone-${mode})`,
  );

  // A 7 x 9 room: [x, y, tone, hum]
  const BOARD: [number, number, Tone, boolean][] = [
    [1, 1, 'low', false],
    [5, 1, 'low', true],
    [3, 2, 'mid', false],
    [0, 4, 'high', false],
    [6, 4, 'high', true],
    [2, 5, 'mid', true],
    [4, 6, 'low', false],
    [1, 7, 'high', false],
    [5, 7, 'mid', false],
  ];
</script>

<div class="sheet" class:dark>
  <div class="row">
    {#each MODES as m (m)}
      <button type="button" aria-pressed={mode === m} onclick={() => (mode = m)}>{m}</button>
    {/each}
    <button type="button" aria-pressed={dark} onclick={() => (dark = !dark)}>dark</button>
  </div>
  <svg width="0" height="0" aria-hidden="true" style="position:absolute">
    {#each Object.entries(MATRIX) as [id, values] (id)}
      <filter id="tone-{id}" color-interpolation-filters="sRGB">
        <feColorMatrix type="matrix" {values} />
      </filter>
    {/each}
  </svg>
  <div class="stage" style:filter={stageFilter} data-testid="tone-stage" data-mode={mode}>
    <svg width={CELL * 6} height={CELL * 3} viewBox="0 0 {CELL * 6} {CELL * 3}" aria-label="Tones at 47px">
      {#each TONES as tone, i (tone)}
        <rect x={i * 2 * CELL} y="0" width={CELL * 2} height={CELL * 3} fill="var(--tile)" />
        <g transform="translate({i * 2 * CELL} 0)"><BellPiece data={{ tone }} size={CELL} /></g>
        <g transform="translate({i * 2 * CELL + CELL} 0)"><BellPiece data={{ tone, hum: true }} size={CELL} /></g>
        <g transform="translate({i * 2 * CELL} {CELL})"><BellPiece data={{ tone }} size={CELL * 2} /></g>
      {/each}
    </svg>
    <svg width={CELL * 7} height={CELL * 9} viewBox="0 0 {CELL * 7} {CELL * 9}" aria-label="A 7 by 9 sample">
      {#each Array.from({ length: 63 }, (_, i) => i) as i (i)}
        <rect x={(i % 7) * CELL} y={Math.floor(i / 7) * CELL} width={CELL} height={CELL} fill="var(--tile)" stroke="var(--tile-line)" />
      {/each}
      {#each BOARD as [x, y, tone, hum] (`${x},${y}`)}
        <g transform="translate({x * CELL} {y * CELL})"><BellPiece data={{ tone, hum }} size={CELL} /></g>
      {/each}
    </svg>
  </div>
</div>

<style>
  .sheet {
    --tile: var(--parchment);
    --tile-line: var(--line);
    display: grid;
    gap: 8px;
    justify-items: start;
  }
  .sheet.dark {
    --tile: #1f2a3a;
    --tile-line: rgba(241, 230, 204, 0.25);
    background: #1f2a3a;
    padding: 8px;
    border-radius: 8px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  button {
    min-height: 32px;
    padding: 0 10px;
    border: 1px solid var(--ink);
    border-radius: 6px;
    background: var(--parchment);
    color: var(--ink);
  }
  button[aria-pressed='true'] {
    background: var(--ink);
    color: var(--parchment);
  }
  .stage {
    display: grid;
    gap: 8px;
  }
</style>
