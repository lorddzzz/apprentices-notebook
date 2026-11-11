import { describe, expect, it } from 'vitest';
import { tileAt } from '$engine/queries';
import { cast, withLattices } from '../../scenarios/harness';
import { dataOf, ev, ringBells, ringTones, struckAt } from './helpers';

/**
 * BF-5 acceptance (foundry-plan §2 P4; BF-T2). Brass retunes a bell up one tone (wrapping); Steam
 * muffles it. Rings resolve at the end of the action that caused them (P3), so the tone and the
 * muffle are read then: a bell Brass retuned in the same cast rings its new tone, and a bell
 * Steam clouded in the same cast is silent. All `it.fails` until BF-5; they need BF-3's strikes.
 */

const aim = (x: number, y = 0) => ({ kind: 'tile', at: { x, y } }) as const;
const toneAt = (s: Parameters<typeof tileAt>[0], x: number, y = 0) =>
  (tileAt(s, { x, y }).piece?.data as { tone?: string } | undefined)?.tone;

describe('BF-5 retune and muffle', () => {
  it('BF-5: Bolt → Brass → Strike retunes the bell and rings the new tone', () => {
    const s = withLattices('D . {bell:mid} . {bell:mid}\n. . . . .\n. . . . {bell:high}', {
      draughtsman: 'Bolt> Brass Strike',
    });
    const r = cast(s, 'draughtsman', 'right');
    expect(dataOf(ev(r.events, 'foundry:retuned')[0])).toEqual({ from: 'mid', to: 'high' });
    expect(ev(r.events, 'foundry:retuned')[0]?.at).toEqual({ x: 2, y: 0 });
    expect(toneAt(r.state, 2)).toBe('high');
    expect(ringTones(r.events)).toEqual(['high']); // the other mid bell stays out of it
    expect(ringBells(ev(r.events, 'foundry:ring')[0])).toEqual(['2,0', '4,2']);
    expect(tileAt(r.state, { x: 2, y: 0 }).state).toBeNull(); // no brass left on the bell
  });

  it('BF-5: Brass wraps high back to low', () => {
    const s = withLattices('D . {bell:high} .', { draughtsman: 'Bolt> Brass' });
    const r = cast(s, 'draughtsman', 'right');
    expect(dataOf(ev(r.events, 'foundry:retuned')[0])).toEqual({ from: 'high', to: 'low' });
    expect(toneAt(r.state, 2)).toBe('low');
  });

  it('BF-5: Brass retunes a bell but is no strike: nothing rings', () => {
    const s = withLattices('D . {bell:mid} . .', { draughtsman: 'Splash> Brass' });
    const r = cast(s, 'draughtsman', aim(2));
    expect(ev(r.events, 'foundry:retuned')).toHaveLength(1);
    expect(toneAt(r.state, 2)).toBe('high');
    expect(ev(r.events, 'foundry:bellStruck')).toHaveLength(0);
    expect(ev(r.events, 'foundry:ring')).toHaveLength(0);
  });

  it('BF-5: a Steam cloud muffles a bell: struck, silent, and no ring at all', () => {
    const s = withLattices('D . {bell:mid} . {bell:mid}', { draughtsman: 'Bolt> Steam' });
    const r = cast(s, 'draughtsman', 'right');
    expect(struckAt(r.events, 2, 0)).toHaveLength(1);
    expect(tileAt(r.state, { x: 2, y: 0 }).state?.id).toBe('cloud');
    expect(ev(r.events, 'foundry:muffled')).toHaveLength(1);
    expect(ev(r.events, 'foundry:ring')).toHaveLength(0);
  });

  it('BF-5: a Storm on a muffled bell bursts, strikes it and stays silent', () => {
    const s = withLattices('D . ~{bell:low} . {bell:low}', { draughtsman: 'Bolt> Spark' });
    const r = cast(s, 'draughtsman', 'right');
    expect(r.events.some((e) => e.type === 'burst')).toBe(true);
    expect(struckAt(r.events, 2, 0).length).toBeGreaterThan(0);
    expect(ev(r.events, 'foundry:muffled').length).toBeGreaterThan(0);
    expect(ev(r.events, 'foundry:ring')).toHaveLength(0);
  });

  it('BF-5: Ink and Oil miss on a bell and retune nothing', () => {
    for (const kind of ['Ink', 'Oil']) {
      const s = withLattices('D . {bell:mid} . .', { draughtsman: `Splash> ${kind}` });
      const r = cast(s, 'draughtsman', aim(2));
      expect(
        r.events.some((e) => e.type === 'miss'),
        kind,
      ).toBe(true);
      expect(ev(r.events, 'foundry:retuned'), kind).toHaveLength(0);
      expect(toneAt(r.state, 2), kind).toBe('mid');
      expect(tileAt(r.state, { x: 2, y: 0 }).state, kind).toBeNull();
    }
  });
});
