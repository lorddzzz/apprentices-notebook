import { afterEach, describe, expect, test } from 'vitest';
import { footnoteKeyOf, VARIANTS } from '$data';
import type { GameEvent } from '$engine';
import { GameStore } from '../../src/app/game.svelte';
import { labFootnotes, switchVariant, variantGroups } from '../../src/app/lab';
import { LabStore } from '../../src/app/lab.svelte';
import { memoryBackend } from '../../src/app/save';

describe('Lab variant toggles (pure)', () => {
  test('a slot holds one variant: switching a slot-mate on switches the other off', () => {
    const far = 'bolt-empty-far';
    const near = 'bolt-empty-near';
    let on = switchVariant([], far, true);
    expect(on).toEqual([far]);
    on = switchVariant(on, near, true);
    expect(on).toEqual([near]);
    expect(switchVariant(on, near, false)).toEqual([]);
  });

  test('variants in other slots stay on', () => {
    const on = switchVariant(['shove-wall-soft'], 'bolt-empty-far', true);
    expect(on).toEqual(['shove-wall-soft', 'bolt-empty-far']);
  });

  test('an unknown id changes nothing', () => {
    expect(switchVariant(['bolt-empty-far'], 'no-such-variant', true)).toEqual(['bolt-empty-far']);
  });

  test('labFootnotes writes each switched-on variant into its slot', () => {
    const v = VARIANTS.find((x) => x.id === 'spark-slick-hot');
    if (!v) throw new Error('missing variant');
    expect(labFootnotes(['spark-slick-hot'])).toEqual({ [footnoteKeyOf(v)]: v.id });
    expect(labFootnotes([])).toEqual({});
  });

  test('every authored variant is listed once, grouped by subject', () => {
    const groups = variantGroups();
    const rows = groups.flatMap((g) => g.rows);
    expect(rows.map((r) => r.id).sort()).toEqual(VARIANTS.map((v) => v.id).sort());
    const oil = groups.find((g) => g.subject === 'oil');
    expect(oil?.name).toBe('Oil');
    expect(oil?.rows.map((r) => r.slot)).toEqual(['Level I', 'Level I']);
  });
});

describe('Lab trials with a toggled variant', () => {
  let labs: LabStore[] = [];
  afterEach(() => {
    for (const l of labs) l.session?.dispose();
    labs = [];
  });

  const newLab = (): LabStore => {
    const l = new LabStore(new GameStore(memoryBackend(), () => 0));
    labs.push(l);
    return l;
  };

  /** Loads a scenario, plays its demo through the battle and returns the battle's log. */
  async function playDemo(l: LabStore, id: string): Promise<GameEvent[]> {
    l.load(id);
    const session = l.session;
    const def = l.scenario;
    if (!session || !def) throw new Error('no session');
    session.skip();
    for (const action of def.demo) await session.dispatch(action);
    return session.log;
  }

  const damageTo = (events: readonly GameEvent[], line: string): number[] =>
    events.flatMap((e) => (e.type === 'damage' && e.line === line ? [e.amount] : []));

  test('switching Spark-on-oil hot on makes the oil fire hit for 3 in the trial', async () => {
    expect(damageTo(await playDemo(newLab(), 'oil-then-spark'), 'spark:slick')).toEqual([2]);
    const l = newLab();
    l.toggleVariant('spark-slick-hot', true);
    expect(damageTo(await playDemo(l, 'oil-then-spark'), 'spark:slick')).toEqual([3]);
  });

  test('switching the variant off again restores the base trial', async () => {
    const l = newLab();
    l.toggleVariant('spark-slick-hot', true);
    l.toggleVariant('spark-slick-hot', false);
    expect(l.variantsOn).toEqual([]);
    expect(damageTo(await playDemo(l, 'oil-then-spark'), 'spark:slick')).toEqual([2]);
  });

  test('a toggle mid-trial keeps the board and log, and Reset keeps the set', () => {
    const l = newLab();
    l.load('oil-then-spark');
    const session = l.session;
    if (!session) throw new Error('no session');
    session.skip();
    const logLength = session.log.length;
    l.toggleVariant('spark-slick-hot', true);
    expect(l.session).not.toBe(session);
    expect(l.session?.log.length).toBe(logLength);
    expect(l.session?.state).toBe(session.state);
    l.reset();
    expect(l.variantsOn).toEqual(['spark-slick-hot']);
  });
});
