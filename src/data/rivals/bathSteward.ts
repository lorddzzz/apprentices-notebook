import type { GoalDef } from '$engine/rivals/types';
import type { BattleState } from '$engine/types';
import type { RivalDef, RivalPageDef } from './types';

/**
 * The Bath-Steward as a rival (bathhouses plan P10, BH-17a; rivals plan P10): the heart's host,
 * half steam. His kit is *Steam hall* (`Vat> Seep Steam`: a wide cloud by the party) and *Shove*
 * (`Bolt> Shove`, cast from inside it); his action is the stoke (a trick action, BH-17b) and his
 * signature trick is steaming away (a `beforeHarm` reaction, BH-17b). Numbers are the stand-in's
 * (`data/districts/bathhouses.ts`: 14 HP, never walks; *tune by playing*).
 *
 * Not yet live: `RIVALS` does not list him, because spawn turns any enemy whose id is in `RIVALS`
 * into a rival and the stand-in heart still owns `bathSteward`. BH-17b lists him, adds
 * `BATH_STEWARD_GOALS` to the district module's `goals`, registers the trick and swaps the shell.
 */

const STEAM_HALL = 'Vat> Seep Steam';
const SHOVE = 'Bolt> Shove';

/** The gauge rule's id (`engine/districts/bathhouses/types.ts`), spelled out: data holds no engine values. */
const GAUGE_RULE = 'bathhouses:boilOver';
export const STEWARD_TRICK_ID = 'bathhouses:steamsAway';
export const TIME_THE_BOIL = 'bathhouses:timeTheBoil';
export const SHOVE_FROM_WITHIN = 'bathhouses:shoveFromWithin';
export const CLOUDS_BIG = 'bathhouses:cloudsBig';

export const BATH_STEWARD_RIVAL: RivalDef = {
  id: 'bathSteward',
  name: 'Bath-Steward',
  token: 'H',
  district: 'bathhouses',
  hp: 14,
  move: 0,
  elite: true,
  habitat: 'any',
  blurb:
    'The house steward, half steam. Lays clouds by you, shoves from inside them, and stokes the boil. Struck in a cloud he re-forms across it: cut it, or storm it.',
  spells: [
    { id: 'steamHall', name: 'Steam hall', lattice: STEAM_HALL, charges: 5 },
    { id: 'shove', name: 'Shove', lattice: SHOVE, charges: 5 },
  ],
  /**
   * Stoke when the boil would catch the party; shove from within his cloud; lay a wide cloud by
   * the party; else shove anyone. He never walks, so there is no move step.
   */
  routine: [
    { goal: TIME_THE_BOIL, action: { kind: 'trick' }, params: { party: 2 } },
    { goal: SHOVE_FROM_WITHIN, action: { kind: 'spell', spell: 'shove' } },
    { goal: CLOUDS_BIG, action: { kind: 'spell', spell: 'steamHall' } },
    { goal: 'hitParty', action: { kind: 'spell', spell: 'shove' } },
  ],
  trick: STEWARD_TRICK_ID,
  fallback: { damage: 1 },
  dryStrike: 'shove',
  page: 'bathSteward:steamHall',
};

/** His recovered page (P10): *Steam hall*. The Seep note is BH-17b's (footnote batch, `holdsPage`). */
export const BATH_STEWARD_PAGE: RivalPageDef = {
  id: 'bathSteward:steamHall',
  rival: 'bathSteward',
  spell: 'steamHall',
  title: 'Steam hall',
  lattice: STEAM_HALL,
  annotation:
    'A Vat aims the square, Seep spreads the rest to its four neighbours, and Steam fills the lot: a cloud as wide as a room from one cast (Vat, Seep, Steam).',
  story:
    'A duty roster for the bath house, every hour ticked, the last line crossed out: the house must never be seen to be empty. In the margin, in a damp hand: someone has to keep the steam up.',
  trial: { board: '. . . . .\nD . . . r\n. . . . .' },
  /** The Steward's note on Seep (level II): a third option, built by the footnote batch (BH-17b). */
  note: { rune: 'seep', line: 'seep:member', variant: 'bathSteward:seep' },
};

// ── Goals (district goals: BH-17b adds them to the district module; tests register them) ──

const CLOUD_STATES: ReadonlySet<string> = new Set(['cloud', 'brandCloud', 'greaseFog', 'bank']);
const inCloud = (s: BattleState, u: { pos: { x: number; y: number } }): boolean => {
  const id = s.tiles[u.pos.y * s.width + u.pos.x]?.state?.id;
  return id !== undefined && CLOUD_STATES.has(id);
};
const party = (s: BattleState) => s.units.filter((u) => u.kind === 'member' && u.hp > 0);
const reach = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const num = (v: unknown, fallback: number): number => (typeof v === 'number' ? v : fallback);

/** Time the boil: stoke when at least `party` apprentices stand in cloud, and the house has a gauge. */
const timeTheBoil: GoalDef = {
  id: TIME_THE_BOIL,
  accepts: (_o, input) =>
    !!input.state.rules &&
    Object.hasOwn(input.state.rules, GAUGE_RULE) &&
    party(input.state).filter((m) => inCloud(input.state, m)).length >= num(input.params.party, 2),
  score: (_o, input) => party(input.state).filter((m) => inCloud(input.state, m)).length,
};

/** Shove from within: he stands in cloud and the shove moves an apprentice, at no cost to himself. */
const shoveFromWithin: GoalDef = {
  id: SHOVE_FROM_WITHIN,
  accepts: (o, input) =>
    o.effect && o.selfHarm === 0 && o.entered.length > 0 && inCloud(input.state, input.unit),
  score: (o) => o.partyHarm + o.entered.length,
};

/** Clouds big: a cast that lands, scored by how near the aimed tile is to the party. */
const cloudsBig: GoalDef = {
  id: CLOUDS_BIG,
  accepts: (o) => o.effect && o.selfHarm === 0,
  score: (_o, input, candidate) => {
    const aim = candidate.intent.kind === 'cast' ? candidate.intent.aim : null;
    if (aim?.kind !== 'tile') return 0;
    const dist = party(input.state).map((m) => reach(aim.at, m.pos));
    return -(dist.length ? Math.min(...dist) : reach(aim.at, input.unit.pos));
  },
};

export const BATH_STEWARD_GOALS: readonly GoalDef[] = [timeTheBoil, shoveFromWithin, cloudsBig];
