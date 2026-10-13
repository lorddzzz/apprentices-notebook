import { expect, test } from 'vitest';
import { ASPECT_IDS, CODEX, IDIOMS, RECIPES, RUNE_IDS, RUNES } from '$data';
import { codexView, newProfile } from '$engine';

const known = (view: ReturnType<typeof codexView>, id: string) =>
  view.find((v) => v.entry.id === id)?.known;

test('codexView: recipes known once written in ink, by recipe id', () => {
  const p = newProfile();
  const r = RECIPES[0];
  if (!r) throw new Error('no recipes');
  expect(known(codexView(p), `recipe:${r.id}`)).toBe(false);
  const q = { ...p, bench: { ...p.bench, known: [r.id] } };
  expect(known(codexView(q), `recipe:${r.id}`)).toBe(true);
  const other = RECIPES.find((x) => x.id !== r.id);
  if (other) expect(known(codexView(q), `recipe:${other.id}`)).toBe(false);
});

test('codexView: idioms known once recognised', () => {
  const p = newProfile();
  const i = IDIOMS[0];
  if (!i) throw new Error('no idioms');
  expect(known(codexView(p), `idiom:${i.id}`)).toBe(false);
  const q = { ...p, idioms: [i.id] };
  expect(known(codexView(q), `idiom:${i.id}`)).toBe(true);
});

test('codexView: aspects known when an owned rune carries them', () => {
  const p = newProfile();
  const owned = RUNE_IDS.filter((id) => p.collection[id] > 0);
  const carried = new Set(owned.flatMap((id) => RUNES[id].aspects));
  const view = codexView(p);
  for (const a of ASPECT_IDS) {
    expect(known(view, `aspect:${a}`)).toBe(carried.has(a));
  }
  // Echo carries aspects no starting rune does: owning one reveals them.
  const q = { ...p, collection: { ...p.collection, echo: 1 } };
  for (const a of RUNES.echo.aspects) {
    expect(known(codexView(q), `aspect:${a}`)).toBe(true);
  }
});

test('codexView: one entry per codex entry, every kind present', () => {
  const view = codexView(newProfile());
  expect(view).toHaveLength(CODEX.length);
  for (const kind of ['rune', 'interaction', 'recipe', 'idiom', 'aspect'] as const) {
    expect(view.some((v) => v.entry.kind === kind)).toBe(true);
  }
  expect(view.filter((v) => v.entry.kind === 'recipe')).toHaveLength(RECIPES.length);
  expect(view.filter((v) => v.entry.kind === 'idiom')).toHaveLength(IDIOMS.length);
  expect(view.filter((v) => v.entry.kind === 'aspect')).toHaveLength(ASPECT_IDS.length);
});
