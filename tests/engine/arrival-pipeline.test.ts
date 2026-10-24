import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { type Coord, type Jar, type Layer, parseLabel, tileAt, unitAt } from '$engine';
import {
  arrivalHooks,
  arrive,
  CORE_ARRIVAL_HOOKS,
  enteredTilesOf,
  objectArrives,
  relocateAll,
  unitTraits,
} from '$engine/arrival';
import { emit, ref } from '$engine/ctx';
import { drift } from '$engine/current';
import { planPush, push } from '$engine/push';
import { board, draft } from '../scenarios/harness';

/** The arrival pipeline itself (foundations plan P1–P7, FD-3). The matrix covers cause × hook. */

const at = (lbl: string): Coord => parseLabel(lbl);
const layer = (id: Layer['id']): Layer => ({ id, rounds: 0, origin: null });
const stepJar = (): Jar => ({
  owner: 'draughtsman',
  event: 'step',
  rest: null,
  heading: null,
  origin: { caster: 'draughtsman', spell: 'x', cast: 0 },
});

const ENGINE = fileURLToPath(new URL('../../src/engine', import.meta.url));
const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory()
      ? sources(join(dir, d.name))
      : d.name.endsWith('.ts')
        ? [join(dir, d.name)]
        : [],
  );

describe('the pipeline owns unit positions', () => {
  it('no engine file but arrival.ts assigns a unit position', () => {
    const offenders = sources(ENGINE).flatMap((file) =>
      file.endsWith(`${'/'}arrival.ts`)
        ? []
        : readFileSync(file, 'utf8')
            .split('\n')
            .map((line, i) => ({ line, at: `${file.slice(ENGINE.length + 1)}:${i + 1}` }))
            .filter(({ line }) => /\.pos(\.[xy])?\s*=[^=]/.test(line))
            .map(({ at }) => at),
    );
    expect(offenders).toEqual([]);
  });
});

describe('tables and traits', () => {
  it('core causes enter the tiles P2 gives them; an unknown cause throws', () => {
    expect(enteredTilesOf('push')).toBe('each');
    expect(enteredTilesOf('slide')).toBe('each');
    expect(enteredTilesOf('pull')).toBe('each');
    for (const c of ['walk', 'hop', 'swap', 'drift', 'draw', 'return', 'carry'] as const) {
      expect(enteredTilesOf(c)).toBe('landing');
    }
    expect(() => enteredTilesOf('nowhere' as never)).toThrow();
  });

  it('hooks run in the fixed core order (P3), core first', () => {
    expect(CORE_ARRIVAL_HOOKS.map((h) => h.id)).toEqual([
      'solvent',
      'markSpread',
      'bindEnters',
      'stepJar',
      'stain',
      'fire',
    ]);
    expect(arrivalHooks().slice(0, CORE_ARRIVAL_HOOKS.length)).toEqual(CORE_ARRIVAL_HOOKS);
  });

  it('traits come from the foe data (P5); members have none', () => {
    const s = board('D m e\nM r .');
    const of = (lbl: string) => {
      const u = unitAt(s, at(lbl));
      if (!u) throw new Error(lbl);
      return unitTraits(u);
    };
    expect(of('A1')).toEqual([]);
    expect(of('B1')).toEqual(['flies']);
    expect(of('C1')).toEqual(['swims']);
    expect(of('A2')).toEqual(['swims', 'anchored']);
    expect(of('B2')).toEqual([]);
  });
});

describe('arrive', () => {
  it('a landing-only cause sets the unit on its landing; tiles before it answer nothing', () => {
    const s = structuredClone(board('r . . .'));
    tileAt(s, at('B1')).jar = stepJar();
    const r = draft(s, (ctx) => {
      const res = arrive(ctx, 'rat-1', [at('B1'), at('C1')], {
        cause: 'walk',
        origin: null,
        landing: true,
      });
      expect(res).toEqual({ interrupted: false });
    });
    expect(unitAt(r.state, at('C1'))?.id).toBe('rat-1');
    expect(r.events).toEqual([]);
  });

  it('an each-tile cause stops where a hook kills or moves the unit (P4)', () => {
    // The jar on B1 holds a Strike for 2: the rat dies there and never reaches C1.
    const s = structuredClone(board('r . . .\n. . . D'));
    const jar = stepJar();
    jar.rest = { role: 'action', rune: 'strike', auras: [], next: null, at: { x: 0, y: 0 } };
    tileAt(s, at('B1')).jar = jar;
    tileAt(s, at('C1')).state = layer('stain');
    draft(s, (ctx) => {
      const res = arrive(ctx, 'rat-1', [at('B1'), at('C1')], {
        cause: 'push',
        origin: null,
        landing: true,
      });
      expect(res).toEqual({ interrupted: true, at: at('B1'), reason: 'died' });
    });
  });

  it('an anchored unit never moves (P5)', () => {
    const s = board('M w> w>');
    draft(s, (ctx) => {
      const res = arrive(ctx, 'mother-1', [at('B1')], {
        cause: 'push',
        origin: null,
        landing: true,
      });
      expect(res).toMatchObject({ interrupted: true, reason: 'held' });
      expect(unitAt(ctx.s, at('A1'))?.id).toBe('mother-1');
    });
  });
});

describe('relocateAll', () => {
  it('sets everyone down first, then each arrives in order; a placement fires nothing', () => {
    const s = structuredClone(board('r . r .'));
    tileAt(s, at('A1')).jar = stepJar();
    tileAt(s, at('C1')).jar = stepJar();
    const swapped = draft(s, (ctx) => {
      // The mover's relocation event first, so playback follows (projection guard).
      const [a, b] = ctx.s.units;
      if (!a || !b) throw new Error('no rats');
      emit(ctx, {
        type: 'swapped',
        unit: ref(a),
        with: ref(b),
        from: { ...a.pos },
        to: { ...b.pos },
        path: [{ ...b.pos }],
        cause: 'swap',
      });
      relocateAll(
        ctx,
        [
          { unit: 'rat-1', from: at('A1'), to: at('C1'), path: [at('C1')] },
          { unit: 'rat-2', from: at('C1'), to: at('A1'), path: [at('A1')] },
        ],
        'swap',
        null,
      );
    });
    const opened = swapped.events.filter((e) => e.type === 'jarOpened');
    expect(opened.map((e) => (e.type === 'jarOpened' ? e.by?.id : null))).toEqual([
      'rat-1',
      'rat-2',
    ]);
    const restored = draft(s, (ctx) => {
      const rat = unitAt(ctx.s, at('A1'));
      if (!rat) throw new Error('no rat');
      emit(ctx, { type: 'moveUndone', unit: ref(rat), to: at('B1') });
      relocateAll(
        ctx,
        [{ unit: 'rat-1', from: at('A1'), to: at('B1'), path: [at('B1')] }],
        'restore',
        null,
      );
    });
    expect(restored.events.map((e) => e.type)).toEqual(['moveUndone']);
    expect(unitAt(restored.state, at('B1'))?.id).toBe('rat-1');
  });
});

describe('objectArrives (P6)', () => {
  it('a step-jar arriving under a unit opens on it; a state arriving does nothing', () => {
    const s = structuredClone(board('. r'));
    tileAt(s, at('B1')).jar = stepJar();
    tileAt(s, at('B1')).state = layer('stain');
    const r = draft(s, (ctx) => {
      objectArrives(ctx, { kind: 'state', state: 'stain' }, at('B1'), {
        cause: 'draw',
        origin: null,
      });
      objectArrives(ctx, { kind: 'jar' }, at('B1'), { cause: 'draw', origin: null });
    });
    expect(r.events.map((e) => e.type)).toEqual(['jarOpened']);
  });
});

describe('P7 scenario: a rat drifting onto a step-jar opens it, but a stain there does not ink it', () => {
  it('drift-opens-jar-no-stain', () => {
    const s = structuredClone(board('rw> . . .'));
    tileAt(s, at('B1')).jar = stepJar();
    tileAt(s, at('B1')).state = layer('stain');
    const r = draft(s, (ctx) => drift(ctx));
    expect(r.events.map((e) => e.type)).toEqual(['drift', 'jarOpened']);
    expect(unitAt(r.state, at('B1'))?.mark).toBeNull();
  });
});

describe('push options (for AH)', () => {
  it('planPush moves nothing; crush: false stops short of a wall without a crush', () => {
    const s = board('r . {wall}');
    draft(s, (ctx) => {
      const rat = unitAt(ctx.s, at('A1'));
      if (!rat) throw new Error('no rat');
      const plan = planPush(ctx, rat, 'right', 3);
      expect(plan.path).toEqual([at('B1')]);
      expect(plan.stop).toMatchObject({ kind: 'crush', into: 'plate' });
      expect(rat.pos).toEqual(at('A1'));
    });
    const r = draft(s, (ctx) => {
      const rat = unitAt(ctx.s, at('A1'));
      if (!rat) throw new Error('no rat');
      expect(push(ctx, rat, 'right', 3, null, { crush: false })).toMatchObject({
        moved: 1,
        crushed: null,
      });
    });
    expect(r.events.map((e) => e.type)).toEqual(['push']);
  });
});
