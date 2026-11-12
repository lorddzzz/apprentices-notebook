import { describe, expect, test } from 'vitest';
import { DISTRICTS } from '$data';
import { type EventLog, hearFromBattle, namedIn, newProfile, startTrip } from '$engine';
import { conditionHolds, type HearScene, hearOf } from '$engine/hearing';
import { cast, withLattices } from '../scenarios/harness';

/**
 * BF-14 (foundry-plan P26): the hearing is a conducted Spark reaching three units in the Seam.
 * Shown on real fights: a plate chain of brass with units touching it, one Spark on its first plate.
 */

function sparkOnPlates(board: string): EventLog {
  const s = withLattices(board, { draughtsman: 'Splash> Spark' });
  return cast(s, 'draughtsman', { kind: 'tile', at: { x: 1, y: 0 } }).events;
}

const ownerEntry = () => {
  const c = hearOf('foundry').find((x) => x.voice === 'owner');
  if (!c) throw new Error('no owner hearing');
  return c;
};
const sceneOf = (log: EventLog, district: 'seam' | 'canals'): HearScene => ({
  profile: newProfile(),
  district,
  party: ['draughtsman'],
  log,
});

describe('the foundry hearing and map (BF-14)', () => {
  test('BF-14: the foundry is heard by a conducted burst reaching three units in the Seam', () => {
    expect(ownerEntry()).toMatchObject({ kind: 'conducted', atLeast: 3, district: 'seam' });
    const log = sparkOnPlates('D # # # r\n. r . r .');
    expect(log.find((e) => e.type === 'burst')).toMatchObject({ burst: 'conduct' });
    expect(conditionHolds(ownerEntry(), sceneOf(log, 'seam'))).toBe(true);
    expect(conditionHolds(ownerEntry(), sceneOf(log, 'canals'))).toBe(false);
    const t = startTrip(newProfile(), 1);
    const heard = hearFromBattle({ ...newProfile(), named: namedIn(log) }, t, log).heard;
    expect(heard).toEqual(['foundry']);
  });

  test('BF-14: two units are not enough', () => {
    const log = sparkOnPlates('D # # # .\n. r . . .');
    expect(conditionHolds(ownerEntry(), sceneOf(log, 'seam'))).toBe(false);
    const t = startTrip(newProfile(), 1);
    expect(hearFromBattle({ ...newProfile(), named: namedIn(log) }, t, log).heard).toEqual([]);
  });

  test('BF-14: the map entry has its caption, brass lean and solved art key', () => {
    const d = DISTRICTS.foundry;
    expect(d.line).toBe('one bang, heard three tiles away');
    expect(d.lean).toEqual({ lean: 'brass', text: 'Brass' });
    expect(d.map.solvedArt).toBe('foundry-bell');
  });
});
