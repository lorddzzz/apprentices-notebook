import { expect, test } from 'vitest';
import {
  BURSTS,
  CODEX,
  type CodexEntryDef,
  IDIOMS,
  METHOD_IDS,
  MIXES,
  RUNE_IDS,
  RUNES,
  SOLVENT_IDS,
} from '$data';

const byId = (id: string): CodexEntryDef => {
  const e = CODEX.find((x) => x.id === id);
  if (!e) throw new Error(`no codex entry ${id}`);
  return e;
};
const ofKind = (kind: CodexEntryDef['kind']) => CODEX.filter((e) => e.kind === kind);

test('codex counts: 31 runes, 10 compounds, 15 bursts, 5 methods, 14 solvents, 9 idioms', () => {
  expect(ofKind('rune')).toHaveLength(31);
  expect(ofKind('compound')).toHaveLength(10);
  expect(ofKind('burst')).toHaveLength(15);
  expect(ofKind('method')).toHaveLength(5);
  expect(ofKind('solvent')).toHaveLength(14);
  expect(ofKind('idiom')).toHaveLength(9);
});

test('every entry has a unique id, a title, a fact and an owner note', () => {
  expect(new Set(CODEX.map((e) => e.id)).size).toBe(CODEX.length);
  for (const e of CODEX) {
    expect(e.title.trim(), e.id).not.toBe('');
    expect(e.text.trim(), e.id).not.toBe('');
    expect(e.ownerNote.trim(), e.id).not.toBe('');
    expect(e.id.startsWith(`${e.kind}:`), e.id).toBe(true);
  }
});

test('every rune page shows its headline', () => {
  for (const id of RUNE_IDS) expect(byId(`rune:${id}`).text, id).toBe(RUNES[id].headline);
});

test('every method, solvent and idiom has an entry', () => {
  for (const id of METHOD_IDS) expect(byId(`method:${id}`).ref, id).toBe(id);
  for (const id of SOLVENT_IDS) expect(byId(`solvent:${id}`).ref, id).toBe(id);
  for (const i of IDIOMS) expect(byId(`idiom:${i.id}`).ref, i.id).toBe(i.id);
});

test('every compound the mix table makes, and every burst row, has an entry', () => {
  for (const m of MIXES) expect(byId(`compound:${m.makes}`).ref, m.makes).toBe(m.makes);
  for (const b of BURSTS) expect(byId(`burst:${b.burst}`).ref, b.burst).toBe(b.burst);
  // The burst page: Spark on each lingering compound has its own entry.
  expect(BURSTS.filter((b) => b.burst.startsWith('page:'))).toHaveLength(10);
});
