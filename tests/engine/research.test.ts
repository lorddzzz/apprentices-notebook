import { describe, expect, it } from 'vitest';
import { RECIPES, type RecipeDef, RUNE_IDS, RUNES, SOLVENT_IDS } from '$data';
import { inkCost, legalAims, memberById, parseBoard, parseLattice } from '$engine';
import { type Attempt, silhouettes, trial, trialKey, trialLattice } from '$engine/research';
import { cast, withLattices } from '../scenarios/harness';

// Injected tables: real rune and solvent data, hand-picked recipes.
const recipe = (
  id: string,
  left: RecipeDef['left'],
  right: RecipeDef['right'],
  solvent: RecipeDef['solvent'],
  torn: RecipeDef['torn'] = null,
): RecipeDef => ({
  id,
  result: id as RecipeDef['result'],
  left,
  right,
  solvent,
  torn,
  ownerNote: '',
});

const smear = recipe('smear', 'ink', 'oil', 'pitch', 'solvent');
const torch = recipe('torch', 'oil', 'spark', 'cinder', 'right');
const fog = recipe('fog', 'oil', 'steam', 'pitch');
const brand = recipe('brand', 'ink', 'spark', 'gallnut');

describe('trialKey', () => {
  it('is the same for swapped parents', () => {
    const a: Attempt = { left: 'oil', right: 'ink', solvent: 'pitch' };
    const b: Attempt = { left: 'ink', right: 'oil', solvent: 'pitch' };
    expect(trialKey(a)).toBe('ink+oil+pitch');
    expect(trialKey(b)).toBe(trialKey(a));
  });
});

describe('trial', () => {
  it('scores swapped parents the same, exact at 6', () => {
    const a = trial({ left: 'ink', right: 'oil', solvent: 'pitch' }, [smear], []);
    const b = trial({ left: 'oil', right: 'ink', solvent: 'pitch' }, [smear], []);
    expect(a).toEqual({ score: 6, margin: 'exact', recipe: 'smear' });
    expect(b).toEqual(a);
  });

  it('scores a solvent-only near miss and names the missing aspect', () => {
    // Rivet carries hold, which Fog has; Fog's first aspect it lacks is slick.
    const r = trial({ left: 'oil', right: 'steam', solvent: 'rivet' }, [fog], []);
    expect(r).toEqual({ score: 5, margin: 'slick', recipe: 'fog' });
  });

  it('scores 0 for an unrelated solvent slot and names the result aspect', () => {
    const r = trial({ left: 'oil', right: 'steam', solvent: 'wax' }, [fog], []);
    expect(r).toEqual({ score: 4, margin: 'slick', recipe: 'fog' });
  });

  it('breaks recipe ties by array order', () => {
    // Ink + Spark + Cinder is 5 against both: Torch (weak left) and Brand (weak solvent).
    const a: Attempt = { left: 'ink', right: 'spark', solvent: 'cinder' };
    expect(trial(a, [torch, brand], [])).toEqual({ score: 5, margin: 'heat', recipe: 'torch' });
    expect(trial(a, [brand, torch], [])).toEqual({ score: 5, margin: 'mark', recipe: 'brand' });
  });

  it('breaks slot ties for the margin: left before right', () => {
    // Ink shares slick with Oil, Brass shares charge with Spark, Cinder is exact.
    const r = trial({ left: 'ink', right: 'brass', solvent: 'cinder' }, [torch], []);
    expect(r).toEqual({ score: 4, margin: 'heat', recipe: 'torch' });
  });

  it('breaks slot ties for the margin: right before solvent', () => {
    // Oil exact, Brass shares charge (1), Wax is 0 against Torch... use Fog: Steam shares hold with Brass.
    const r = trial({ left: 'oil', right: 'brass', solvent: 'rivet' }, [fog], []);
    // oil 2, brass~steam 1 (hold), rivet~fog 1 (hold): right is the weakest by order.
    expect(r.score).toBe(4);
    expect(r.margin).toBe('vapor');
  });

  it('ignores known recipes', () => {
    const a: Attempt = { left: 'ink', right: 'oil', solvent: 'pitch' };
    const r = trial(a, [smear, torch], ['smear']);
    expect(r.recipe).toBe('torch');
    expect(r.margin).not.toBe('exact');
  });

  it('reports none-left when everything is known', () => {
    const a: Attempt = { left: 'ink', right: 'oil', solvent: 'pitch' };
    const none = { score: 0, margin: 'none-left', recipe: null };
    expect(trial(a, [smear, torch], ['smear', 'torch'])).toEqual(none);
    expect(trial(a, [], [])).toEqual(none);
  });

  it('on the real recipes: the exact attempt scores 6 and every one-slot change scores less', () => {
    for (const r of RECIPES) {
      const known = RECIPES.filter((x) => x.id !== r.id).map((x) => x.id);
      const exact = trial({ left: r.left, right: r.right, solvent: r.solvent }, RECIPES, known);
      expect(exact, r.id).toEqual({ score: 6, margin: 'exact', recipe: r.id });
      const changes: Attempt[] = [];
      for (const id of RUNE_IDS) {
        if (id !== r.left) changes.push({ left: id, right: r.right, solvent: r.solvent });
        if (id !== r.right) changes.push({ left: r.left, right: id, solvent: r.solvent });
      }
      for (const s of SOLVENT_IDS) {
        if (s !== r.solvent) changes.push({ left: r.left, right: r.right, solvent: s });
      }
      for (const c of changes) {
        const res = trial(c, RECIPES, known);
        expect(res.score, `${r.id} vs ${trialKey(c)}`).toBeLessThan(6);
        expect(res.margin).not.toBe('exact');
      }
    }
  });
});

describe('silhouettes', () => {
  it('lists the undiscovered recipes in order with family, aspects, ink and parents', () => {
    const list = silhouettes([smear, torch, fog], ['torch']);
    expect(list.map((s) => s.recipe)).toEqual(['smear', 'fog']);
    expect(list[0]).toEqual({
      recipe: 'smear',
      family: 'material',
      aspects: RUNES.smear.aspects,
      ink: inkCost('smear'),
      parents: ['material', 'material'],
      torn: 'Ink + Oil + ??',
    });
    expect(list[1]?.torn).toBeNull();
  });

  it('tears the named slot out of the sentence', () => {
    expect(silhouettes([torch], [])[0]?.torn).toBe('Oil + ?? + Cinder');
    expect(silhouettes([recipe('fog', 'oil', 'steam', 'pitch', 'left')], [])[0]?.torn).toBe(
      '?? + Steam + Pitch',
    );
  });

  it('is empty when everything is known', () => {
    expect(
      silhouettes(
        RECIPES,
        RECIPES.map((r) => r.id),
      ),
    ).toEqual([]);
  });
});

describe('trialLattice', () => {
  it('puts a Bolt before two non-source parents, one dummy', () => {
    const t = trialLattice({ left: 'spark', right: 'onKill', solvent: 'pitch' });
    expect(t.lattice).toBe(['. . . . .', 'Bolt> Spark OnKill . .', 'x . . . x'].join('\n'));
    expect(t.board).toBe(['. . . . .', 'D . d . .', '. . . . .'].join('\n'));
  });

  it('leads with a Source parent, whichever side it is on', () => {
    const left = trialLattice({ left: 'quill', right: 'ink', solvent: 'pitch' });
    const right = trialLattice({ left: 'ink', right: 'quill', solvent: 'pitch' });
    expect(left.lattice).toContain('Quill> Ink . . .');
    expect(right.lattice).toBe(left.lattice);
  });

  it('uses the left Source when both are Sources', () => {
    const t = trialLattice({ left: 'ward', right: 'bolt', solvent: 'pitch' });
    expect(t.lattice).toContain('Ward> Bolt');
  });

  it('puts three dummies in a column for area runes', () => {
    const splash = trialLattice({ left: 'splash', right: 'spark', solvent: 'pitch' });
    expect(splash.board).toBe(['. . d . .', 'D . d . .', '. . d . .'].join('\n'));
    const footprint = trialLattice({ left: 'bolt', right: 'steam', solvent: 'pitch' });
    expect(footprint.board.match(/d/g)).toHaveLength(3);
  });

  it('parses and casts without throwing for every pair of runes', () => {
    for (const left of RUNE_IDS) {
      for (const right of RUNE_IDS) {
        const t = trialLattice({ left, right, solvent: 'pitch' });
        expect(() => parseBoard(t.board), `${left}+${right}`).not.toThrow();
        expect(() => parseLattice(t.lattice), `${left}+${right}`).not.toThrow();
        const state = withLattices(t.board, { draughtsman: t.lattice });
        const key = memberById(state, 'draughtsman').spells[0]?.key;
        expect(key, `${left}+${right}`).toBeDefined();
        const aims = legalAims(state, 'draughtsman', key ?? '');
        const aim =
          aims.find((a) => a.kind === 'tile' && a.at.x === 2 && a.at.y === 1) ??
          aims.find((a) => a.kind === 'dir' && a.dir === 'right') ??
          aims[0];
        expect(aim, `${left}+${right}`).toBeDefined();
        if (aim) expect(() => cast(state, 'draughtsman', aim), `${left}+${right}`).not.toThrow();
      }
    }
  });
});
