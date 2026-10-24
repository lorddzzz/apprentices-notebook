import { APPRENTICE_IDS, APPRENTICES, type ApprenticeDef, DISTRICT_IDS, DISTRICTS } from '$data';
import { DISTRICT_KIT, type PaperId } from '$data/districts/index';
import { type PapersKit, papersView } from '$engine/papers';
import { type OfferRegistry, offerRegistry } from '$engine/trip/offerKinds';
import { inSentence } from './describe';

/**
 * What an offer card shows (DK-12). The seven core kinds keep their own pictures; any other kind
 * is drawn by the card renderer its `OfferKind.card` names, and a kind nothing draws gets a plain
 * fallback card, so a district can add an offer without touching the Loot screen.
 */

/** The core kinds' `OfferKind.card` keys: drawn by the Loot card itself. */
export const CORE_CARD_KEYS: ReadonlySet<string> = new Set([
  'rune',
  'method',
  'ink',
  'solvent',
  'vellum',
  'doorway',
  'key',
]);

export type CardPlan =
  | { how: 'core' }
  /** A registered kind: the renderer for this key, or the fallback when none is registered for it. */
  | { how: 'key'; key: string }
  /** A kind nothing registered (an old save, a cut district): the fallback card. */
  | { how: 'fallback' };

/** The `card` key of the item's registered kind; null when the kind is unknown. */
export function cardKeyOf(
  item: { kind: string },
  reg: OfferRegistry = offerRegistry(),
): string | null {
  const kinds: Readonly<Record<string, { card: string } | undefined>> = reg.kinds;
  return Object.hasOwn(kinds, item.kind) ? (kinds[item.kind]?.card ?? null) : null;
}

export function cardPlan(item: { kind: string }, reg?: OfferRegistry): CardPlan {
  const key = cardKeyOf(item, reg);
  if (key === null) return { how: 'fallback' };
  return CORE_CARD_KEYS.has(key) && item.kind === key ? { how: 'core' } : { how: 'key', key };
}

/** "bathhouses:plungePool" → "Plunge pool"; a district prefix names where it comes from. */
export function fallbackLine(item: { kind: string }): { title: string; text: string } {
  const [head = '', ...rest] = item.kind.split(':');
  const name = rest.length > 0 ? rest.join(':') : head;
  const spaced = name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ');
  const title = spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
  const owner = DISTRICT_IDS.find((d) => d === head);
  return {
    title: title || 'A find',
    text:
      owner && rest.length > 0
        ? `A find from ${inSentence(DISTRICTS[owner].name)}.`
        : 'A strange find.',
  };
}

/** The recruit card (RC-4): her token, her name, and what taking it does; null for an unknown id. */
export function recruitCard(item: {
  apprentice: string;
}): { def: ApprenticeDef; title: string; text: string } | null {
  const id = APPRENTICE_IDS.find((a) => a === item.apprentice);
  const def = id ? APPRENTICES[id] : undefined;
  return def ? { def, title: def.name, text: `Someone joins you. ${def.blurb}` } : null;
}

/** The paper the room just filed: what the "paper found" note names; null for an id no district defines. */
export function paperNote(
  id: PaperId,
  kit: PapersKit = DISTRICT_KIT,
): { title: string; hand: string; group: string } | null {
  const paper = papersView({ papers: [id] }, kit)[0]?.papers[0];
  return paper ? { title: paper.title, hand: paper.hand, group: paper.group } : null;
}
