import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { BattleSession } from '../../src/app/battle.svelte';
import { battleOf, CAST_BOARD, labBattle } from '../app/battleFixtures';

/**
 * FT-16w: the parent wiring. Every stub is replaced by a recorder that writes a marker and keeps
 * the props it was given, so the test proves each one is mounted with the typed props the leaf
 * packs (C, D, E) will fill in. Server render: no DOM.
 */
const seen = vi.hoisted(() => ({
  readout: [] as Record<string, unknown>[],
  beat: [] as Record<string, unknown>[],
  end: [] as Record<string, unknown>[],
  markers: [] as Record<string, unknown>[],
}));

type Out = { push: (html: string) => void };
const recorder =
  (key: keyof typeof seen, marker: string) =>
  (out: Out, props: Record<string, unknown>): void => {
    seen[key].push(props);
    out.push(`<i data-stub="${marker}"></i>`);
  };

vi.mock('../../src/ui/components/battle/Readout.svelte', () => ({
  default: recorder('readout', 'readout'),
}));
vi.mock('../../src/ui/components/battle/BeatCard.svelte', () => ({
  default: recorder('beat', 'beat'),
}));
vi.mock('../../src/ui/components/battle/EndOverlay.svelte', () => ({
  default: recorder('end', 'end'),
}));
vi.mock('../../src/ui/components/board/StepMarkerLayer.svelte', () => ({
  default: recorder('markers', 'markers'),
}));

const { default: BattleView } = await import('../../src/ui/components/battle/BattleView.svelte');

const text = (html: string) => createRawSnippet(() => ({ render: () => `<div>${html}</div>` }));
const noop = () => {};

const trip = (state = battleOf(CAST_BOARD, false)) =>
  new BattleSession({ state, events: [] }, 'trip', {});

/** What Combat passes: a district, the arena flag, the inspection rules, its own top. */
const combatProps = (session: BattleSession) => ({
  session,
  top: text('room line'),
  slots: ['draughtsman', 'stoker'],
  district: 'seam' as const,
  arena: true,
  inspection: { witnessed: new Set<string>() },
  continueLabel: 'Gather the spoils',
  oncontinue: noop,
});

beforeEach(() => {
  for (const list of Object.values(seen)) list.length = 0;
});

describe('BattleView hosts', () => {
  test('the Combat host: header, caption, party, actions and the log row, no back control', () => {
    const { body } = render(BattleView, { props: combatProps(trip()) });
    expect(body).toContain('data-testid="fight-header"');
    expect(body).toContain('The Seam');
    expect(body).toContain('Round 1');
    expect(body).toContain('data-world="city"');
    expect(body).toContain('data-district="seam"');
    // the notebook icon, then ⋯ last; there is no back control on the fight
    expect(body.indexOf('data-testid="pocket"')).toBeLessThan(
      body.indexOf('data-testid="header-menu"'),
    );
    expect(body).not.toContain('data-testid="header-back"');
    for (const id of ['caption', 'party', 'actions', 'footer', 'log', 'end-turn', 'board']) {
      expect(body).toContain(`data-testid="${id}"`);
    }
    // the district's scene and tiles are asked for through the board's kit
    expect(body).toMatch(
      /data-testid="board"[^>]*data-district="seam"|data-district="seam"[^>]*data-testid="board"/,
    );
    expect(body).toContain('room line');
  });

  test('the Combat host mounts the beat card and the step marker layer with typed props', () => {
    const { body } = render(BattleView, { props: combatProps(trip()) });
    // the render is lazy: reading the body runs the components
    expect(body).toContain('data-stub="beat"');
    expect(body).toContain('data-stub="markers"');
    expect(seen.beat).toHaveLength(1);
    expect(seen.beat[0]).toMatchObject({ beat: null });
    expect(typeof seen.beat[0]?.onspeedup).toBe('function');
    expect(typeof seen.beat[0]?.onskip).toBe('function');
    expect(seen.markers.length).toBeGreaterThan(0);
    expect(seen.markers[0]?.markers).toEqual([]);
    // idle: no readout, no end overlay
    expect(seen.readout).toHaveLength(0);
    expect(seen.end).toHaveLength(0);
  });

  test('busy: the readout is mounted, Skip is the only main control, the log waits', () => {
    const session = trip();
    session.selectMember('stoker');
    // a caster who has not cast makes the first End turn only arm; the second ends the turn
    session.endTurn();
    session.endTurn();
    expect(session.busy).toBe(true);
    const { body } = render(BattleView, { props: combatProps(session) });
    expect(seen.readout).toHaveLength(1);
    expect(typeof seen.readout[0]?.onspeedup).toBe('function');
    expect(body).toContain('data-testid="skip"');
    expect(body).not.toContain('data-testid="end-turn"');
    expect(body).not.toContain('data-testid="confirm"');
    // the party and action rows are inert, the log button is disabled, the notebook waits
    expect(body.match(/class="stack-row[^"]*"[^>]*inert/g) ?? []).toHaveLength(2);
    expect(body).toMatch(/data-testid="log"[^>]*disabled|disabled[^>]*data-testid="log"/);
    session.dispose();
  });

  test('the end: the overlay is mounted with summary and inspection', () => {
    const session = trip();
    session.forceEnd('won');
    const { body } = render(BattleView, {
      props: { ...combatProps(session), summary: { note: 'Joost held the line.' } },
    });
    expect(body).toContain('data-stub="end"');
    expect(seen.end).toHaveLength(1);
    expect(seen.end[0]).toMatchObject({
      phase: 'won',
      label: 'Gather the spoils',
      summary: { note: 'Joost held the line.' },
      inspection: { witnessed: new Set<string>() },
    });
    expect(typeof seen.end[0]?.oncontinue).toBe('function');
    expect(typeof seen.end[0]?.onlog).toBe('function');
  });

  test('the pocket slot gets the notebook state', () => {
    const calls: [boolean, unknown][] = [];
    const pocket = createRawSnippet((open: () => boolean, close: () => () => void) => {
      calls.push([open(), close()]);
      return { render: () => '<div data-testid="pocket-slot"></div>' };
    });
    const { body } = render(BattleView, { props: { ...combatProps(trip()), pocket } });
    expect(body).toContain('data-testid="pocket-slot"');
    expect(calls[0]?.[0]).toBe(false);
    expect(typeof calls[0]?.[1]).toBe('function');
  });

  test('the Lab host compiles unchanged: its own top, no fight chrome, its continue action', () => {
    const session = new BattleSession({ state: labBattle('sandbox'), events: [] }, 'lab', {});
    const { body } = render(BattleView, {
      props: {
        session,
        top: text('scenario picker'),
        slots: ['draughtsman', 'stoker'],
        continueLabel: 'Play again',
        oncontinue: noop,
      },
    });
    expect(body).toContain('scenario picker');
    expect(body).not.toContain('data-testid="fight-header"');
    expect(body).not.toContain('data-world');
    for (const id of ['caption', 'party', 'actions', 'footer', 'log', 'end-turn']) {
      expect(body).toContain(`data-testid="${id}"`);
    }
    // the stubs are mounted here too
    expect(seen.beat).toHaveLength(1);
  });

  test('the Lab host keeps its end overlay and continue label', () => {
    const session = new BattleSession({ state: labBattle('sandbox'), events: [] }, 'lab', {});
    session.forceEnd('lost');
    const { body } = render(BattleView, {
      props: { session, top: text('picker'), continueLabel: 'Play again', oncontinue: noop },
    });
    expect(body).toContain('data-stub="end"');
    expect(seen.end[0]).toMatchObject({ phase: 'lost', label: 'Play again' });
  });
});
