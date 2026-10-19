import { expect, test } from 'vitest';
import { IDIOMS, LINES, START_KNOWN } from '$data';
import { codexView, compoundTable, newProfile } from '$engine';

const row = (rows: ReturnType<typeof codexView>, id: string) => rows.find((r) => r.entry.id === id);

test('compound table: 4x4, upper triangle only, every cell blank until named', () => {
  const t = compoundTable(newProfile());
  expect(t).toHaveLength(4);
  for (const [r, line] of t.entries()) {
    expect(line).toHaveLength(4);
    for (const [c, cell] of line.entries()) {
      if (c < r) expect(cell).toBeNull();
      else expect(cell?.known).toBe(false);
    }
  }
  expect(t.flat().filter((c) => c !== null)).toHaveLength(10);
});

test('compound table: a named compound fills its own cell only', () => {
  const p = { ...newProfile(), named: ['compound:stain', 'compound:wall'] };
  const t = compoundTable(p);
  expect(t[0]?.[1]?.known).toBe(true);
  expect(t[0]?.[1]?.entry.title).toBeTruthy();
  expect(t[3]?.[3]?.known).toBe(true);
  expect(t.flat().filter((c) => c?.known)).toHaveLength(2);
});

test('burst page: 15 frames, blank until named', () => {
  const p = { ...newProfile(), named: ['burst:fire', 'burst:page:pool'] };
  const bursts = codexView(p).filter((r) => r.entry.kind === 'burst');
  expect(bursts).toHaveLength(15);
  expect(bursts.filter((b) => b.known).map((b) => b.entry.id)).toEqual([
    'burst:fire',
    'burst:page:pool',
  ]);
});

test('a rune page shows only witnessed lines, as fine print n / m', () => {
  const own = LINES.filter((l) => l.subject === 'ink');
  expect(own.length).toBeGreaterThan(2);
  const fresh = row(codexView(newProfile()), 'rune:ink')?.fine;
  expect(fresh?.seen).toEqual([]);
  expect(fresh?.total).toBe(own.length);
  const p = {
    ...newProfile(),
    known: [...START_KNOWN],
    witnessed: ['ink:mark' as const, 'oil:slick' as const],
  };
  const fine = row(codexView(p), 'rune:ink')?.fine;
  expect(fine?.seen.map((l) => l.id)).toEqual(['ink:mark']);
  expect(fine?.total).toBe(own.length);
});

test('an unknown rune lists no lines even if one was witnessed', () => {
  const p = { ...newProfile(), witnessed: ['vat:slick' as const] };
  const r = row(codexView(p), 'rune:vat');
  expect(r?.known).toBe(false);
  expect(r?.fine?.seen).toEqual([]);
});

test('idioms are blank until named', () => {
  const id = IDIOMS[0]?.id ?? '';
  const blank = codexView(newProfile()).filter((r) => r.entry.kind === 'idiom');
  expect(blank).toHaveLength(IDIOMS.length);
  expect(blank.every((r) => !r.known)).toBe(true);
  const named = codexView({ ...newProfile(), named: [`idiom:${id}`] });
  expect(row(named, `idiom:${id}`)?.known).toBe(true);
});
