import type { HeartRun } from '../ink-bot';
import type { Adapter } from './runner';

export const ink: Adapter = { name: 'quarter', district: 'inkQuarter', axes: ['authored'] };

/**
 * The postmaster rows of INK_CAL (IQ-23, CAL-2): the shared adapter's runner reads rooms, not the
 * heart's trick, so these rows read each heart fight's log (`ink-bot.ts` `heartRun`).
 */
const pct = (n: number, d: number) => (d === 0 ? '-' : `${Math.round((100 * n) / d)}%`);
const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 0;
const mean = (a: number[]) =>
  a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-';
const mode = (a: (string | null)[]) => {
  const n = new Map<string, number>();
  for (const x of a) n.set(x ?? 'none', (n.get(x ?? 'none') ?? 0) + 1);
  return (
    [...n]
      .sort((x, y) => y[1] - x[1])
      .map(([k, v]) => `${k} x${v}`)
      .join(', ') || '-'
  );
};

export const HEART_HEADER = [
  '| sample | fights | won | lost | stalled | served / lifted / collected | opener | trick | his casts per fight | page banked | median rounds | median HP left | mean charges (notice, collect) | mean party HP |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
];

export function heartRow(label: string, runs: readonly HeartRun[]): string {
  const sum = (f: (r: HeartRun) => number) => runs.reduce((a, r) => a + f(r), 0);
  const won = runs.filter((r) => r.outcome === 'won').length;
  const lost = runs.filter((r) => r.outcome === 'lost').length;
  const stalled = runs.filter((r) => r.outcome === 'stalled').length;
  const n = runs.length;
  return `| ${label} | ${n} | ${won} (${pct(won, n)}) | ${lost} (${pct(lost, n)}) | ${stalled} (${pct(stalled, n)}) | ${sum((r) => r.served)} / ${sum((r) => r.lifted)} / ${sum((r) => r.collected)} | ${mode(runs.map((r) => r.opener))} | ${mode(runs.map((r) => r.trick))} | ${mean(runs.map((r) => r.casts))} | ${sum((r) => Number(r.page))}/${won} wins | ${median(runs.map((r) => r.rounds))} | ${median(runs.map((r) => r.pmHp))} | ${mean(runs.map((r) => r.charges[0]))}, ${mean(runs.map((r) => r.charges[1]))} | ${mean(runs.map((r) => r.partyHp))} |`;
}
