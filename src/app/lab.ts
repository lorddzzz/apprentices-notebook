import { MEMBER_IDS, MEMBERS, type MemberId, SCENARIOS, type ScenarioDef } from '$data';
import { type Lattice, parseLattice } from '$engine';

/** Lab helpers (pure). U5 adds board painting and scenario export. */

export const DEFAULT_SCENARIO = 'sandbox';

/** `#/lab?scenario=<id>[&demo=1]` → what to load. */
export function labLocation(params: URLSearchParams): { scenario: string; demo: boolean } {
  return {
    scenario: params.get('scenario') || DEFAULT_SCENARIO,
    demo: params.get('demo') === '1',
  };
}

/** The scenario for an id; unknown ids fall back to the sandbox and say so. */
export function resolveScenario(id: string): { def: ScenarioDef; unknown: string | null } {
  const def = SCENARIOS.find((s) => s.id === id);
  if (def) return { def, unknown: null };
  const fallback = SCENARIOS.find((s) => s.id === DEFAULT_SCENARIO) ?? SCENARIOS[0];
  if (!fallback) throw new Error('No Lab scenarios');
  return { def: fallback, unknown: id };
}

/** Lattices for members a scenario leaves out (until the profile is wired in: start lattices). */
export function fallbackLattices(): Record<MemberId, Lattice> {
  return Object.fromEntries(
    MEMBER_IDS.map((m) => [m, parseLattice(MEMBERS[m].startLattice)]),
  ) as Record<MemberId, Lattice>;
}
