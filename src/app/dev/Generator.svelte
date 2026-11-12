<script lang="ts">
  import { ENEMIES, type EnemyId } from '$data';
  import type { BoardSpec } from '$engine';
  import { type GeneratedRoom, generateRoom } from '$engine/drawing';
  import { sampleInput } from './samples';

  const COUNT = 20;
  const ARROWS = { up: '↑', down: '↓', left: '←', right: '→' } as const;

  interface Row {
    seed: number;
    title: string;
    party: number;
    room: GeneratedRoom;
    ms: number;
  }

  let from = $state(1);
  let rows = $state.raw<Row[]>([]);
  let running = $state(false);

  const sorted = (xs: number[]): number[] => [...xs].sort((a, b) => a - b);
  const pct = (xs: number[], p: number): number =>
    sorted(xs)[Math.min(xs.length - 1, Math.floor(p * xs.length))] ?? 0;

  const accepted = $derived(rows.filter((r) => !r.room.fallback));
  const summary = $derived({
    median: Math.round(pct(accepted.map((r) => r.ms), 0.5)),
    p95: Math.round(pct(accepted.map((r) => r.ms), 0.95)),
    firstTry: rows.filter((r) => !r.room.fallback && r.room.attempts === 1).length,
    fallbacks: rows.filter((r) => r.room.fallback).length,
    unverified: rows.filter((r) => !r.room.verified).length,
    ops: Math.round(pct(rows.map((r) => r.room.ops), 0.5)),
  });

  function cell(layout: BoardSpec, x: number, y: number) {
    const tile = layout.tiles[y * layout.width + x];
    const unit = layout.units.find((u) => u.at.x === x && u.at.y === y);
    const start = layout.starts.some((c) => c.x === x && c.y === y);
    const kinds: string[] = [];
    let text = '';
    if (tile?.terrain.water) {
      kinds.push('water');
      text = ARROWS[tile.terrain.water];
    }
    if (tile?.state?.id === 'plate') kinds.push('plate');
    if (tile?.state?.id === 'slick') kinds.push('oil');
    if (tile?.terrain.vent) kinds.push('vent');
    if (tile?.terrain.lamp) {
      kinds.push('lamp');
      text = '✦';
    }
    if (start) {
      kinds.push('start');
      text = 'P';
    }
    if (unit) {
      kinds.push('foe');
      text = ENEMIES[unit.def as EnemyId].token;
    }
    return { cls: kinds.join(' '), text };
  }

  async function run() {
    running = true;
    rows = [];
    for (let i = 0; i < COUNT; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const seed = from + i;
      const input = sampleInput(seed);
      const t0 = performance.now();
      const room = generateRoom(input);
      const ms = performance.now() - t0;
      const d = input.drawing;
      rows = [
        ...rows,
        {
          seed,
          title: `${d.rule ? 'current' : 'plain'} · ${d.foes.join(', ')} · room ${input.room + 1} of ${d.length}`,
          party: input.party.length,
          room,
          ms,
        },
      ];
    }
    running = false;
  }
</script>

<main>
  <h1>Generator spike</h1>
  <p class="note">
    Twenty drawn rooms from seeds {from} to {from + COUNT - 1}, generated here and timed on this
    device (the room's attempts, the bot trials and the fallback included).
  </p>
  <div class="bar">
    <label>From seed <input type="number" min="1" bind:value={from} disabled={running} /></label>
    <button type="button" onclick={run} disabled={running}>{running ? 'Inking…' : 'Run 20'}</button>
  </div>

  {#if rows.length > 0}
    <section class="summary" aria-label="Summary">
      <div><b>{summary.median} ms</b> median per accepted room</div>
      <div><b>{summary.p95} ms</b> p95</div>
      <div><b>{summary.firstTry}/{rows.length}</b> first try</div>
      <div><b>{summary.fallbacks}</b> fallbacks, <b>{summary.unverified}</b> unverified</div>
      <div><b>{summary.ops}</b> median ops per room</div>
    </section>
  {/if}

  {#each rows as row (row.seed)}
    {@const layout = row.room.layout}
    <article class={{ fallback: row.room.fallback }}>
      <header>
        <b>Seed {row.seed}</b>
        <span>{row.title}</span>
      </header>
      <div class="board" style:--cols={layout.width} role="img" aria-label="Room {row.seed}, {layout.width} by {layout.height}">
        {#each { length: layout.height } as _, y (y)}
          {#each { length: layout.width } as _, x (x)}
            {@const c = cell(layout, x, y)}
            <span class="cell {c.cls}">{c.text}</span>
          {/each}
        {/each}
      </div>
      <footer>
        <span>{layout.width}×{layout.height}, {row.party} apprentices</span>
        <span>
          {row.room.fallback ? (row.room.verified ? 'fallback (cleared)' : 'fallback (UNVERIFIED)') : `attempt ${row.room.attempts}`}
        </span>
        <span>{row.room.ops} ops</span>
        <span>{Math.round(row.ms)} ms</span>
      </footer>
    </article>
  {/each}
</main>

<style>
  :global(body) {
    margin: 0;
    background: var(--parchment);
    color: var(--ink);
    font-family: system-ui, sans-serif;
  }
  main {
    max-width: 480px;
    margin: 0 auto;
    padding: 16px;
  }
  h1 {
    margin: 0 0 4px;
    font-size: 1.3rem;
  }
  .note {
    margin: 0 0 12px;
    color: var(--ink-soft);
    font-size: 0.85rem;
  }
  .bar {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
  }
  input {
    width: 5rem;
    padding: 6px;
    font: inherit;
  }
  button {
    padding: 8px 16px;
    border: 1px solid var(--ink);
    border-radius: 6px;
    background: var(--ink);
    color: var(--parchment);
    font: inherit;
  }
  button:disabled {
    opacity: 0.5;
  }
  .summary {
    display: grid;
    gap: 2px;
    margin-bottom: 16px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--parchment-dark);
    font-size: 0.85rem;
  }
  article {
    margin-bottom: 16px;
    padding: 10px;
    border: 1px solid var(--line);
    border-radius: 8px;
  }
  article.fallback {
    border-color: var(--accent);
  }
  header {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 8px;
    font-size: 0.85rem;
  }
  header span {
    color: var(--ink-soft);
  }
  .board {
    display: grid;
    grid-template-columns: repeat(var(--cols), var(--cell, 40px));
    gap: 2px;
    justify-content: center;
    --cell: min(40px, calc((100vw - 76px) / var(--cols)));
  }
  .cell {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: var(--cell);
    height: var(--cell);
    border: 1px solid var(--line);
    border-radius: 3px;
    background: var(--parchment-deep);
    font-size: 0.85rem;
    font-weight: 700;
  }
  .water {
    background: var(--shield);
    color: var(--parchment);
  }
  .plate {
    background: var(--m-brass);
  }
  .oil {
    background: var(--m-oil-tint);
  }
  .vent {
    background: var(--vent);
    color: var(--parchment);
  }
  .vent::after {
    content: '☁';
  }
  .lamp {
    color: var(--m-spark);
    background: var(--night);
  }
  .start {
    border: 2px dashed var(--ink);
    background: var(--parchment);
  }
  .foe {
    background: var(--danger);
    color: var(--parchment);
    border-radius: 50%;
  }
  footer {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    margin-top: 8px;
    color: var(--ink-soft);
    font-size: 0.78rem;
  }
</style>
