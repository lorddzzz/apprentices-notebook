import { expect, test } from 'vitest';
import {
  applyAction,
  canPlace,
  compiledFor,
  latticeOf,
  newSave,
  parseLattice,
  setMemberLattice,
  validateLoadout,
  witnessedIn,
  writeInvention,
} from '$engine';
import {
  EMPTY_DRAFT,
  emptyScene,
  inventionToWrite,
  newLines,
  paintScene,
  pickMethod,
  sceneBattle,
  setPart,
  trialActions,
} from '../../src/app/bench';
import {
  endBattle,
  goHome,
  pushOnward,
  recordBattleAction,
  setOut,
  startBattle,
  takeOffer,
} from '../../src/app/flow';
import { botFight } from '../sim/bot';

/** No fabricated wins, loot or knowledge: play the actual trip and household reducers. */
test('first evening: Seam deep page, Impulse Bench trial, writing, placement and witnessed fight cast', () => {
  let save = newSave(2);
  save.profile = setMemberLattice(
    save.profile,
    'stoker',
    parseLattice('x Boltv x\n. Oil .\n. Shove .\n. . .\n. . .\nx . x'),
  );
  save = setOut(save);
  const tripLogs = [];
  while (save.trip?.status === 'fight') {
    const fight = botFight(startBattle(save).state);
    expect(fight.state.phase, `depth ${save.trip.encounter}`).toBe('won');
    tripLogs.push(...fight.events);
    for (const action of fight.actions) save = recordBattleAction(save, action);
    save = endBattle(save, fight.state, fight.events).save;
    while (save.trip?.status === 'looting') {
      const page = save.trip.offers.findIndex((o) => o.kind === 'method' && o.method === 'conduct');
      save = takeOffer(save, page >= 0 ? page : 0);
    }
    if (save.trip?.loot.some((o) => o.kind === 'method' && o.method === 'conduct')) break;
    if (save.trip?.status === 'crossroads') save = pushOnward(save);
  }
  expect(save.trip?.loot).toEqual(expect.arrayContaining([{ kind: 'method', method: 'conduct' }]));
  save = goHome(save);
  expect(save.profile.methods).toContain('conduct');
  expect(save.profile.foesMet).toContain('rat');
  expect(save.profile.met).toContain('plate');

  const draft = setPart(pickMethod(EMPTY_DRAFT, 'conduct'), 0, 'shove');
  let scene = emptyScene();
  for (const [at, item] of [
    [{ x: 1, y: 2 }, 'r'],
    [{ x: 2, y: 2 }, 'r'],
    [{ x: 1, y: 3 }, '='],
    [{ x: 2, y: 3 }, '='],
  ] as const) {
    const painted = paintScene(scene, at, item);
    if (!('scene' in painted)) throw new Error(painted.why);
    scene = painted.scene;
  }
  let trial = sceneBattle(scene, save.profile, draft);
  const trialLog = [];
  for (const action of trialActions(trial, draft, { x: 4, y: 2 }) ?? []) {
    const r = applyAction(trial, action);
    trial = r.state;
    trialLog.push(...r.events);
  }
  expect(newLines(trialLog, [])).toContain('conduct:network');
  const definition = inventionToWrite(save.profile, draft, 'Impulse');
  if (!definition) throw new Error('Impulse draft rejected');
  save = { ...save, profile: writeInvention(save.profile, definition, newLines(trialLog, [])) };
  // The ordinary starter sheet has enough ink for Bolt -> Impulse.
  let profile = setMemberLattice(save.profile, 'draughtsman', {
    ...latticeOf(save.profile, 'draughtsman'),
    runes: [],
  });
  expect(canPlace(profile, 'draughtsman', { x: 0, y: 0 }, 'bolt')).toBeNull();
  profile = setMemberLattice(
    profile,
    'draughtsman',
    parseLattice('Bolt> . . . .\n. . . . .\nx . . . x'),
  );
  expect(canPlace(profile, 'draughtsman', { x: 1, y: 0 }, definition.id)).toBeNull();
  const placed = parseLattice('Bolt> inv:impulse . . .\n. . . . .\nx . . . x');
  profile = setMemberLattice(profile, 'draughtsman', placed);
  expect(validateLoadout(profile)).toEqual({});
  expect(compiledFor(profile, 'draughtsman').spells).toHaveLength(1);
  save = setOut({ ...save, profile });
  const initial = startBattle(save).state;
  const spell = compiledFor(profile, 'draughtsman').spells[0];
  if (!spell) throw new Error('Impulse not compiled');
  const castAction = {
    type: 'cast',
    unit: 'draughtsman',
    spell: spell.key,
    aim: { kind: 'dir', dir: 'up' },
  } as const;
  const cast = applyAction(initial, castAction);
  save = recordBattleAction(save, castAction);
  const fight = { state: cast.state, events: [...cast.events] };
  // Knowledge survives even a loss: let the foes finish this demonstration fight.
  for (let n = 0; n < 40 && fight.state.phase === 'player'; n++) {
    const turn = applyAction(fight.state, { type: 'endTurn' });
    save = recordBattleAction(save, { type: 'endTurn' });
    fight.state = turn.state;
    fight.events.push(...turn.events);
  }
  expect(fight.events.some((e) => e.type === 'cast' && e.caster.id === 'draughtsman')).toBe(true);
  expect(witnessedIn(fight.events)).toContain('conduct:noTarget');
  save = endBattle(save, fight.state, fight.events).save;
  expect(save.profile.witnessed).toEqual(
    expect.arrayContaining(['conduct:network', 'conduct:noTarget']),
  );
  expect(witnessedIn(tripLogs).length).toBeGreaterThan(0);
});
