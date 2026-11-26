import { ATTACKS } from '$data';
import {
  applyAction,
  type BattleState,
  beginEncounter,
  describeLog,
  type GameEvent,
  type LootItem,
  namedIn,
  newProfile,
  type Profile,
  placeOf,
  startTrip,
  type Trip,
  who,
} from '$engine';
import type { WipeSummary } from './flow';
import { placeInText } from './tripviews';

function unbankedFind(profile: Profile, item: LootItem): string | null {
  switch (item.kind) {
    case 'rune':
      return profile.known.includes(item.rune) ? null : `rune:${item.rune}`;
    case 'method':
      return profile.methods.includes(item.method) ? null : `method:${item.method}`;
    case 'solvent':
      return profile.solventsFound.includes(item.solvent) ? null : `solvent:${item.solvent}`;
    case 'recruit':
      return profile.household.members.includes(item.apprentice)
        ? null
        : `recruit:${item.apprentice}`;
    default:
      return null;
  }
}

export function offerNovelty(profile: Profile, item: LootItem): 'new' | null {
  return unbankedFind(profile, item) === null ? null : 'new';
}

export function carriedHome(
  profile: Profile,
  loot: readonly LootItem[],
): { item: LootItem; first: boolean }[] {
  const seen = new Set<string>();
  const firsts = [];
  const rest = [];
  for (const item of loot) {
    const find = unbankedFind(profile, item);
    if (find !== null && !seen.has(find)) {
      seen.add(find);
      firsts.push({ item, first: true });
    } else {
      rest.push({ item, first: false });
    }
  }
  return [...firsts, ...rest];
}

export function wipeRooms(trip: Trip): NonNullable<WipeSummary['rooms']> {
  // A checkpoint flag can also be earned mid-trip. Only the earlier fights tell us where it began.
  const start = Math.max(0, trip.encounter - trip.stats.fights);
  const rooms: NonNullable<WipeSummary['rooms']> = [];
  for (let index = start; index < trip.encounter; index++) {
    rooms.push({ place: placeOf(trip, index), result: 'cleared' });
  }
  rooms.push({ place: placeOf(trip), result: 'fell' });
  return rooms;
}

type Casualty = Extract<GameEvent, { type: 'damage' | 'died' | 'outOfRoom' }>;

/** A lethal hit takes its victim out before any nested effects and the eventual `died` event. */
function lastCasualty(final: BattleState, log: readonly GameEvent[]) {
  const down = new Set(
    final.units
      .filter((unit) => unit.kind === 'member' && (unit.hp === 0 || unit.out))
      .map((unit) => unit.id),
  );
  let last: { event: Casualty; previous: GameEvent | undefined } | undefined;
  const start = log.findLastIndex((event) => event.type === 'battleStart') + 1;
  for (let index = start; index < log.length; index++) {
    const event = log[index];
    if (!event || event.type === 'lost') break;
    if (event.type === 'damage') {
      if (
        event.target.member &&
        event.hpLeft === 0 &&
        event.amount > 0 &&
        down.delete(event.target.id)
      ) {
        last = { event, previous: log[index - 1] };
      }
    } else if (
      (event.type === 'died' || event.type === 'outOfRoom') &&
      event.unit.member &&
      down.delete(event.unit.id)
    ) {
      last = { event, previous: log[index - 1] };
    }
  }
  // If we have the opening, a missing casualty can mean the log ended before the final one.
  return start > 0 && down.size > 0 ? undefined : last;
}

export function wipeCause(final: BattleState, log: readonly GameEvent[]): string {
  const neutral = `The party fell in ${placeInText(final.title)}.`;
  const last = lastCasualty(final, log);
  if (!last) return neutral;

  const { event, previous } = last;
  if (event.type === 'damage') {
    // The hit supplies the cause for hazards, bursts and spell harm too. An adjacent matching
    // attack announcement supplies the foe, without borrowing one from another part of the log.
    const source =
      previous?.type === 'attack' && ATTACKS[previous.intent.attack].name === event.source
        ? `${event.source} from ${who(previous.unit)}`
        : event.source;
    const [hit, down] = describeLog([
      { ...event, source },
      { type: 'died', unit: event.target },
    ]);
    return hit && down ? `${hit}, and ${down}.` : neutral;
  }
  const cause =
    event.type === 'outOfRoom'
      ? event
      : previous?.type === 'dropped' && !previous.elite && previous.unit.id === event.unit.id
        ? previous
        : null;
  const [line] = cause ? describeLog([cause]) : [];
  return line ? `${line}.` : neutral;
}

/** Transient Wiped screen recipes for the fixture loader. */
export function wipeFixture(kind: 'seam' | 'first-room' | 'nothing-lost'): WipeSummary {
  const profile = newProfile();
  const seed = 42;
  if (kind === 'nothing-lost') {
    return { encounter: placeOf(startTrip(profile, seed)), lost: [], learned: [] };
  }

  if (kind === 'first-room') {
    profile.city.open.push('cartographers');
    profile.city.checkpoints = { cartographers: 2 };
  }
  const trip =
    kind === 'seam'
      ? startTrip(profile, seed)
      : startTrip(profile, seed, 'cartographers', { at: 'checkpoint' });
  if (kind === 'seam') {
    trip.encounter = 1;
    trip.stats.fights = 1;
    trip.loot = [{ kind: 'rune', rune: 'fork' }];
  }

  let { state: final, events: log } = beginEncounter(profile, trip);
  for (let turn = 0; turn < 30 && final.phase === 'player'; turn++) {
    const next = applyAction(final, { type: 'endTurn' });
    final = next.state;
    log.push(...next.events);
  }
  if (final.phase !== 'lost') throw new Error(`The ${kind} fixture did not end in a wipe`);

  return {
    encounter: final.title,
    lost: trip.loot,
    learned: namedIn(log),
    rooms: wipeRooms(trip),
    cause: wipeCause(final, kind === 'seam' ? log : []),
    final,
  };
}
