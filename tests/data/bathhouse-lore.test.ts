import { describe, expect, test } from 'vitest';
import { DISTRICTS, type DistrictId } from '$data';
import { BATH_LEDGERS, BATHHOUSES_KIT } from '$data/districts/bathhouses';
import { type EventLog, hearFromBattle, namedIn, newProfile, startTrip } from '$engine';
import { conditionHolds, type HearScene, hearOf } from '$engine/hearing';
import { cast, withLattices } from '../scenarios/harness';

/**
 * BH-10 (bathhouses-plan): the storm-on-3 hearing and the five ledger lines (P13). The hearing is
 * shown on real fights in the Seam: two apprentices and a rat in one cloud, one Spark.
 */

/** Stoker casts `Bolt> Spark` right into the cloud beside her; the whole connected cloud storms. */
function sparkInCloud(board: string): EventLog {
  const s = withLattices(board, { stoker: 'Bolt> Spark' });
  return cast(s, 'stoker', 'right').events;
}

const scene = (log: EventLog, district: DistrictId): HearScene => ({
  profile: newProfile(),
  district,
  party: ['stoker', 'draughtsman'],
  log,
});
const ownerEntry = () => {
  const c = hearOf('bathhouses').find((x) => x.voice === 'owner');
  if (!c) throw new Error('no owner hearing');
  return c;
};

describe('the bathhouses hearing (BH-10)', () => {
  test('the entry is a Storm reaching three units in the Seam, with the owner line', () => {
    expect(ownerEntry()).toMatchObject({
      kind: 'burstUnits',
      burst: 'storm',
      atLeast: 3,
      district: 'seam',
    });
    expect(ownerEntry().text).toContain('Steam remembers who stood in it');
    expect(hearOf('bathhouses').map((c) => c.voice)).toEqual(['owner', 'rumour']);
  });

  test('two apprentices and a rat in one cloud, one Spark: the Seam room opens the hearing', () => {
    const log = sparkInCloud('S~ ~ D~ r~ .');
    const storm = log.find((e) => e.type === 'burst');
    expect(storm).toMatchObject({ burst: 'storm' });
    expect(conditionHolds(ownerEntry(), scene(log, 'seam'))).toBe(true);
    const t = startTrip(newProfile(), 1);
    const heard = hearFromBattle({ ...newProfile(), named: namedIn(log) }, t, log).heard;
    expect(heard).toEqual(['bathhouses']);
  });

  test('a 2-unit storm does not', () => {
    const log = sparkInCloud('S~ ~ D~ . .');
    expect(log.find((e) => e.type === 'burst')).toMatchObject({ burst: 'storm' });
    expect(conditionHolds(ownerEntry(), scene(log, 'seam'))).toBe(false);
    const t = startTrip(newProfile(), 1);
    expect(hearFromBattle({ ...newProfile(), named: namedIn(log) }, t, log).heard).toEqual([]);
  });

  test('the same three-unit storm in another district does not', () => {
    const log = sparkInCloud('S~ ~ D~ r~ .');
    for (const d of ['canals', 'inkQuarter', 'bathhouses'] as const) {
      expect(conditionHolds(ownerEntry(), scene(log, d)), d).toBe(false);
    }
  });
});

describe('the bather ledger (BH-10, P13)', () => {
  test('five entries, one per fight, each a name, hours and "stayed"', () => {
    expect(BATH_LEDGERS).toHaveLength(5);
    expect(new Set(BATH_LEDGERS.map((p) => p.id)).size).toBe(5);
    BATH_LEDGERS.forEach((p, i) => {
      expect(p.district).toBe('bathhouses');
      expect(p.found).toEqual({ kind: 'room', room: i });
      expect(p.group).toBe("Bather's ledger");
      expect(p.text).toMatch(/\bhours?\b|day and a night/);
      expect(p.text).toContain('Stayed');
      expect(p.text.length).toBeLessThan(330);
    });
  });

  test("the owner's entry is the heart's", () => {
    const heart = BATH_LEDGERS[4];
    expect(heart?.title).toBe("In the owner's hand");
    expect(heart?.text).toContain('your own');
    for (const p of BATH_LEDGERS.slice(0, 4)) expect(p.text).not.toContain('your own');
  });

  test('the kit carries them, and the district stays drawing with no rooms', () => {
    expect(DISTRICTS.bathhouses.papers).toBe(BATH_LEDGERS);
    expect(BATHHOUSES_KIT.gate).toEqual({ kind: 'drawing' });
    expect(BATHHOUSES_KIT.rooms).toEqual([]);
  });
});
