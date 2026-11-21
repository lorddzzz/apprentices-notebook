<script lang="ts">
  import { ENEMIES, type EnemyId } from '$data';
  import type { BoardSpec } from '$engine';
  import { type GeneratedRoom, generateRoom, offeredTrial } from '$engine/drawing';
  import { workerInker } from '../generation';
  import { calibrationCase, sampleInput } from './samples';

  const COUNT = 20;
  const ARROWS = { up: '↑', down: '↓', left: '←', right: '→' } as const;

  interface Row {
    seed: number;
    title: string;
    party: number;
    room: GeneratedRoom;
    ms: number;
    /** Production worker on the same room (calibration corpus only): its own reported ms, and the round trip. */
    workerMs?: number;
    wallMs?: number;
  }
  type Corpus = 'spike' | 'calibration';

  let from = $state(1);
  let rows = $state.raw<Row[]>([]);
  let running = $state(false);
  let corpus = $state<Corpus>('spike');
  let count = $state(COUNT);
  let warm = $state(false);

  const sorted = (xs: number[]): number[] => [...xs].sort((a, b) => a - b);
  const pct = (xs: number[], p: number): number =>
    sorted(xs)[Math.min(xs.length - 1, Math.floor(p * xs.length))] ?? 0;

  const accepted = $derived(rows.filter((r) => !r.room.fallback));
  const workerRows = $derived(rows.filter((r) => !r.room.fallback && r.workerMs !== undefined));
  const stats = (xs: number[]) => ({
    median: Math.round(pct(xs, 0.5)),
    p95: Math.round(pct(xs, 0.95)),
  });
  const workerSummary = $derived({
    n: workerRows.length,
    inside: stats(workerRows.map((r) => r.workerMs ?? 0)),
    roundTrip: stats(workerRows.map((r) => r.wallMs ?? 0)),
  });
  const exportJson = $derived(
    JSON.stringify(
      {
        corpus,
        agent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
        viewport: typeof window === 'undefined' ? '' : `${window.innerWidth}x${window.innerHeight}`,
        warm,
        definition:
          'ms = performance.now() around generateRoom (direct, main thread); workerMs = ms reported by the production worker; wallMs = main-thread round trip of workerInker().ink',
        samples: rows.map((r) => ({
          seed: r.seed,
          fallback: r.room.fallback,
          attempts: r.room.attempts,
          ms: r.ms,
          workerMs: r.workerMs,
          wallMs: r.wallMs,
        })),
      },
      null,
      1,
    ),
  );
  const summary = $derived({
    median: Math.round(pct(accepted.map((r) => r.ms), 0.5)),
    p95: Math.round(pct(accepted.map((r) => r.ms), 0.95)),
    firstTry: rows.filter((r) => !r.room.fallback && r.room.attempts === 1).length,
    fallbacks: rows.filter((r) => r.room.fallback).length,
    unverified: rows.filter((r) => !r.room.verified).length,
    dull: rows.filter((r) => r.room.dull).length,
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
    warm = rows.length > 0;
    rows = [];
    const inker = workerInker();
    for (let i = 0; i < count; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const seed = from + i;
      const cal = corpus === 'calibration' ? await calibrationCase(seed) : null;
      const input = cal ? cal.input : sampleInput(seed);
      const t0 = performance.now();
      const room = generateRoom(input);
      const ms = performance.now() - t0;
      let timing: Pick<Row, 'workerMs' | 'wallMs'> = {};
      if (cal) {
        const w0 = performance.now();
        const reply = await inker.ink(cal.profile, cal.trip, cal.room);
        timing = { workerMs: reply.ms, wallMs: performance.now() - w0 };
      }
      const d = input.drawing;
      rows = [
        ...rows,
        {
          seed,
          title: `${cal ? `${d.name} · ` : ''}${d.rule ? 'current' : 'plain'} · ${d.foes.join(', ')} · room ${input.room + 1} of ${d.length}`,
          party: input.party.length,
          room,
          ms,
          ...timing,
        },
      ];
    }
    running = false;
  }
</script>

<main>
  <h1>Generator spike</h1>
  <p class="note">
    {count} drawn rooms from seeds {from} to {from + count - 1}, generated here and timed on this
    device (the room's attempts, the bot trials and the fallback included).
  </p>
  <div class="bar">
    <label>
      Corpus
      <select bind:value={corpus} disabled={running}>
        <option value="spike">Spike (seeds 1–40)</option>
        <option value="calibration">CAL-5 frozen drawings</option>
      </select>
    </label>
    <label>From seed <input type="number" min="1" bind:value={from} disabled={running} /></label>
    <label>Rooms <input type="number" min="1" max="200" bind:value={count} disabled={running} /></label>
    <button type="button" onclick={run} disabled={running}>{running ? 'Inking…' : `Run ${count}`}</button>
  </div>

  {#if rows.length > 0}
    <section class="summary" aria-label="Summary">
      <div><b>{summary.median} ms</b> median per accepted room</div>
      <div><b>{summary.p95} ms</b> p95</div>
      <div><b>{summary.firstTry}/{rows.length}</b> first try</div>
      <div><b>{summary.fallbacks}</b> fallbacks, <b>{summary.unverified}</b> unverified, <b>{summary.dull}</b> dull</div>
      <div><b>{summary.ops}</b> median ops per room</div>
      {#if workerSummary.n > 0}
        <div>
          Production worker ({workerSummary.n} accepted): <b>{workerSummary.inside.median} ms</b> median,
          <b>{workerSummary.inside.p95} ms</b> p95 inside; round trip <b>{workerSummary.roundTrip.median} ms</b> /
          <b>{workerSummary.roundTrip.p95} ms</b>
        </div>
      {/if}
      <div>{warm ? 'warm run' : 'cold run (first since load)'}</div>
      <details>
        <summary>Raw samples (JSON)</summary>
        <textarea id="raw-samples" readonly rows="6">{exportJson}</textarea>
      </details>
    </section>
  {/if}

  {#each rows as row (row.seed)}
    {@const layout = row.room.layout}
    {@const pick = offeredTrial(row.room)}
    <article class={{ fallback: row.room.fallback, dull: row.room.dull }}>
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
          {row.room.fallback ? (row.room.verified ? 'fallback (cleared)' : 'fallback (UNVERIFIED)') : `attempt ${pick?.attempt ?? row.room.attempts} of ${row.room.attempts}`}
        </span>
        <span>{row.room.ops} ops</span>
        <span>{Math.round(row.ms)} ms</span>
        {#if row.workerMs !== undefined}
          <span>worker {Math.round(row.workerMs)} ms ({Math.round(row.wallMs ?? 0)} round trip)</span>
        {/if}
      </footer>
      <footer class="walk">
        <span>budget {row.room.trials.map((t) => t.budget).join(' → ')}</span>
        <span>
          {#if pick?.won}
            won round {pick.rounds}, {Math.round(pick.hpLeft * 100)}% HP left{pick.walkover ? ' (walkover)' : ''}
          {:else if pick?.won === false}
            lost, round {pick.rounds}, {Math.round(pick.hpLeft * 100)}% HP left
          {:else}
            not played
          {/if}
        </span>
        <span>{row.room.dull ? 'DULL' : 'fair'}</span>
      </footer>
    </article>
  {/each}
</main>

<style>
  :global(html),
  :global(body) {
    height: auto;
    min-height: 100%;
    overflow-y: auto;
    overscroll-behavior: auto;
  }
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
    padding-bottom: env(safe-area-inset-bottom);
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
  .bar {
    flex-wrap: wrap;
  }
  textarea {
    width: 100%;
    box-sizing: border-box;
    font: 0.7rem monospace;
  }
  select {
    width: auto;
    padding: 6px;
    font: inherit;
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
  article.dull {
    border-style: dashed;
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
  footer.walk {
    margin-top: 2px;
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
