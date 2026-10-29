import type { EnteredTiles } from '../arrival';
import type { HarmGuard } from '../harm';
import type {
  BoardRule,
  DistrictEventDef,
  DistrictModule,
  FoeBehaviour,
  HearKind,
  Kit,
  OfferContributor,
  OfferKind,
  PieceDef,
  ScriptStep,
  TripShapeDef,
} from './types';

/**
 * Assembles every kit registry from the district modules (P1). Pure and run once at import: no
 * runtime registration, so battles stay deterministic (FD P3). A duplicate id or piece token across
 * modules throws at load, which is the registries' integrity check.
 */
export function buildKit(modules: readonly DistrictModule[]): Kit {
  const mods: Record<string, DistrictModule> = {};
  const rules: Record<string, BoardRule> = {};
  const pieces: Record<string, PieceDef> = {};
  const tokens: Record<string, PieceDef> = {};
  const offerKinds: Record<string, OfferKind> = {};
  const offerContributors: OfferContributor[] = [];
  const hearKinds: Record<string, HearKind> = {};
  const events: Record<string, DistrictEventDef> = {};
  const steps: Record<string, ScriptStep> = {};
  const foes: Record<string, FoeBehaviour> = {};
  const shapes: Record<string, TripShapeDef> = {};
  const harmGuards: HarmGuard[] = [];
  const guardIds: Record<string, true> = {};
  const causes: Record<string, EnteredTiles> = {};
  const put = <T>(table: Record<string, T>, id: string, value: T, what: string): void => {
    if (Object.hasOwn(table, id)) throw new Error(`District kit: duplicate ${what} '${id}'`);
    table[id] = value;
  };
  for (const m of modules) {
    put(mods, m.id, m, 'district module');
    for (const r of m.rules ?? []) put(rules, r.id, r, 'rule');
    for (const p of m.pieces ?? []) {
      put(pieces, p.id, p, 'piece');
      put(tokens, p.token, p, 'piece token');
    }
    for (const o of m.offerKinds ?? []) put(offerKinds, o.id, o, 'offer kind');
    offerContributors.push(...(m.offerContributors ?? []));
    for (const h of m.hearKinds ?? []) put(hearKinds, h.id, h, 'hearing kind');
    for (const e of m.events ?? []) put(events, e.type, e, 'event');
    for (const s of m.steps ?? []) put(steps, s.id, s, 'script step');
    for (const f of m.foes ?? []) put(foes, f.id, f, 'foe behaviour');
    for (const g of m.harmGuards ?? []) {
      put(guardIds, g.id, true, 'harm guard');
      harmGuards.push(g);
    }
    if (m.trip) put(shapes, m.trip.id, m.trip, 'trip shape');
    for (const [c, answers] of Object.entries(m.causes ?? {})) put(causes, c, answers, 'cause');
  }
  return {
    modules: mods,
    rules,
    pieces,
    tokens,
    offerKinds,
    offerContributors,
    hearKinds,
    events,
    steps,
    foes,
    harmGuards,
    shapes,
    causes,
  };
}
