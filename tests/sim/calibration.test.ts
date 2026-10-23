import { expect, test } from 'vitest';
import { ENCOUNTERS } from '$data';
import { compiledFor, createBattle, FOUNDERS, memberById, newProfile, newSave } from '$engine';
import { endBattle, pushOnward, setOut, startBattle, takeOffer } from '../../src/app/flow';
import { botFight } from './bot';

/** Reproduce per-room calibration with fresh HP/charges; this is not a full-trip win rate. */
function calibrateSeam(seeds = [7, 42]) {
  const p = newProfile();
  return ENCOUNTERS.flatMap((encounter) =>
    encounter.variants.map((variant, index) => {
      const results = seeds.map((seed) =>
        botFight(
          createBattle({
            title: encounter.title,
            board: variant.layout,
            seed,
            lineup: FOUNDERS,
            party: Object.fromEntries(
              FOUNDERS.map((id) => [id, { spells: compiledFor(p, id).spells }]),
            ),
          }).state,
        ),
      );
      return {
        depth: encounter.depth,
        variant: index,
        name: variant.name,
        won: results.filter((r) => r.state.phase === 'won').length,
        lost: results.filter((r) => r.state.phase === 'lost').length,
        timedOut: results.filter((r) => r.state.phase === 'player').length,
        rounds: results.map((r) => r.state.round),
        hp: results.map((r) => FOUNDERS.reduce((sum, id) => sum + memberById(r.state, id).hp, 0)),
      };
    }),
  );
}

test('Seam calibration bots terminate within forty rounds across every variant', () => {
  const rows = calibrateSeam();
  expect(rows).toHaveLength(12);
  expect(rows.every((r) => r.rounds.every((round) => round <= 41))).toBe(true);
  expect(rows.reduce((sum, r) => sum + r.won + r.lost + r.timedOut, 0)).toBe(24);
  if (process.env.CALIBRATE_SEAM) console.log(JSON.stringify(rows));
}, 60_000);

test('starter trip calibration includes HP and charge attrition', () => {
  const trips = [7, 42].map((seed) => {
    let save = setOut(newSave(seed));
    const rooms = [];
    while (save.trip?.status === 'fight') {
      const fight = botFight(startBattle(save).state);
      rooms.push({
        depth: save.trip.encounter + 1,
        phase: fight.state.phase,
        round: fight.state.round,
        hp: save.trip.party.map((id) => memberById(fight.state, id).hp),
        charges: save.trip.party.map((id) => memberById(fight.state, id).charges),
      });
      if (fight.state.phase !== 'won') break;
      save = endBattle(save, fight.state, fight.events).save;
      while (save.trip?.status === 'looting') save = takeOffer(save, 0);
      if (save.trip?.status === 'crossroads') save = pushOnward(save);
    }
    return { seed, rooms };
  });
  expect(trips.every((t) => t.rooms.length > 0 && t.rooms.length <= 4)).toBe(true);
  if (process.env.CALIBRATE_SEAM) console.log(JSON.stringify(trips));
});
