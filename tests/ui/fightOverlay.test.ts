import { readFileSync } from 'node:fs';
import { render } from 'svelte/server';
import { describe, expect, test, vi } from 'vitest';
import { type Action, parseBoard, scenarioBattle } from '$engine';
import { type PreviewCtx, previewOf } from '../../src/app/battleInput';
import { fallbackLattices } from '../../src/app/lab';
import { EMPTY_OVERLAY, type Overlay, overlayFor, type StepDraw } from '../../src/app/overlay';
import { viewOf, viewOfSpec } from '../../src/app/view';
import BattleBoard from '../../src/ui/components/board/BattleBoard.svelte';
import { FIGHT_KITS } from '../../src/ui/components/board/fightArt';
import { unitArtFor } from '../../src/ui/districts';
import { at } from '../app/battleFixtures';

const shipped = vi.hoisted(() => ({ ids: new Set<string>() }));
vi.mock('../../src/ui/art/registry', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/ui/art/registry')>();
  return {
    ...real,
    artUrl: (id: string) => (shipped.ids.has(id) ? `/art/${id}.webp` : null),
    artSize: () => null,
  };
});

/** FT-11: the flat overlay (FT-D10). Red = danger, dots = reach, outline = cast preview, harm always shown. */

const OVERLAY_FILES = [
  'src/ui/components/board/HighlightLayer.svelte',
  'src/ui/components/board/IntentLayer.svelte',
  'src/ui/components/board/MarksLayer.svelte',
  'src/ui/components/board/StepLayer.svelte',
  'src/ui/components/board/StepMarkerLayer.svelte',
  'src/ui/components/board/RivalMarks.svelte',
  'src/ui/components/board/BadgeLayer.svelte',
  'src/ui/components/board/RulePreviewLayer.svelte',
  'src/ui/components/board/RuleMeter.svelte',
  'src/ui/components/board/HpPips.svelte',
  'src/ui/districts/bridges/BridgeLayer.svelte',
];

// District- and world-scoped tokens (theme.css): the overlay never reads them, nor the scopes.
const FORBIDDEN =
  /--(district|world|home|city|system)-|--lamp\b|--select-world|\[data-(district|world)|data-world/;

describe('overlay tokens', () => {
  test('overlay layers reference no district or world token', () => {
    for (const f of OVERLAY_FILES) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(FORBIDDEN);
    }
  });

  test('overlay meaning colours go through --overlay-* (danger, reach, preview, shield)', () => {
    for (const f of OVERLAY_FILES.filter(
      (x) => x.endsWith('Layer.svelte') || x.includes('Marks'),
    )) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/var\(--(danger|reach|shield|m-oil)\)/);
    }
  });

  test('no tint or dim filter sits on a parent of the overlay group', () => {
    const body = render(BattleBoard, {
      props: { view: viewOf(lab('S D . . . .')), kit: { district: 'seam' }, ontap: () => {} },
    }).body;
    const start = body.indexOf('data-layer="overlay"');
    expect(start).toBeGreaterThan(0);
    // Every opening tag from <svg> to the overlay group: none carries a filter, opacity or blend.
    const open = body.slice(0, start).match(/<(svg|g)\b[^>]*>/g) ?? [];
    const closed = (body.slice(0, start).match(/<\/g>/g) ?? []).length;
    const parents = open.slice(0, open.length - closed);
    expect(parents.length).toBeGreaterThan(0);
    for (const tag of parents) {
      expect(tag).not.toMatch(/filter=|opacity=|mix-blend|style=/);
    }
    // And the overlay element's own computed colours are the :root meaning colours.
    const overlay = body.slice(start);
    expect(overlay).not.toMatch(/--district|--world/);
  });
});

const pad = (row: string): string => [row, ...Array(7).fill('. . . . . .')].join('\n');
function lab(row: string) {
  return scenarioBattle(
    { board: pad(row), lattices: {} },
    { lab: true, lattices: fallbackLattices() },
  );
}
const unseen: PreviewCtx = { witnessed: new Set() };
const shoveRight: Action = { type: 'shove', unit: 'stoker', dir: 'right' };

describe('previews', () => {
  test('preview shows party harm when masked', () => {
    const s = lab('S D {wall} . . .');
    const p = previewOf(s, shoveRight, unseen);
    expect(p.masked).toBe(true);
    const overlay = overlayFor(s, {
      kind: 'confirm',
      unit: 'stoker',
      spell: null,
      at: at('B1'),
      preview: p,
    });
    const body = render(BattleBoard, {
      props: { view: viewOf(s), overlay, kit: { district: 'seam' }, ontap: () => {} },
    }).body;
    const hurt = body.match(/<g data-state="hurt"[^>]*>[\s\S]*?<\/g>/);
    expect(hurt).not.toBeNull();
    // In the bottom-right corner of Pell's cell (B1: x 100..200, y 0..100), danger red.
    expect(hurt?.[0]).toContain('data-corner="bottom-right"');
    expect(hurt?.[0]).toContain('cx="184"');
    expect(hurt?.[0]).toContain('cy="84"');
    expect(hurt?.[0]).toContain('var(--overlay-danger)');
    // Masked: nothing about the cause or the amount is drawn.
    expect(overlay.badges).toEqual([]);
    expect(overlay.ghosts).toEqual([]);
  });
});

describe('telegraph pills', () => {
  const step: StepDraw = {
    from: at('B1'),
    label: 'Toll',
    tiles: [at('C1')],
    units: [],
    order: 1,
    sequence: [2, 4],
    countdown: null,
    emphasis: 'normal',
  };

  test('telegraph pills survive playback markers', () => {
    const overlay: Overlay = { ...EMPTY_OVERLAY, steps: [step] };
    const view = viewOf(lab('S D . . . .'));
    const without = render(BattleBoard, { props: { view, overlay, ontap: () => {} } }).body;
    const markers = [
      { n: 1, at: at('B1'), first: false },
      { n: 2, at: at('C1'), first: true },
    ];
    const withMarkers = render(BattleBoard, {
      props: { view, overlay, markers, ontap: () => {} },
    }).body;
    for (const out of [without, withMarkers]) {
      expect(out).toContain('data-step="Toll"');
      expect(out).toContain('Toll 2/4');
      expect(out).toContain('data-step-tile="2,0"');
    }
    const pill = (out: string) => out.match(/<g data-step="Toll"[\s\S]*?<\/g>/)?.[0];
    expect(pill(withMarkers)).toBe(pill(without));
  });
});

describe('FT-12 proving districts', () => {
  const boards = [
    ['seam', 'marginalia', 6, 6],
    ['canals', 'barge', 5, 9],
  ] as const;
  const row = (w: number) => ['r', ...Array(w - 1).fill('.')].join(' ');

  test.each(boards)('%s registers a fightTheme (tone, crest) and keeps its unitArt', (id, def) => {
    const kit = FIGHT_KITS[id];
    expect(kit?.id).toBe(id);
    expect(kit?.tileTone).toBeTruthy();
    expect(kit?.crest).toBeTruthy();
    expect(unitArtFor(def)).toBeTruthy();
  });

  test.each(boards)(
    '%s renders with zero art (vector wash) and with the scene shipped',
    (id, def, w, h) => {
      const spec = [row(w), ...Array(h - 1).fill(Array(w).fill('.').join(' '))].join('\n');
      const view = () => {
        const v = viewOfSpec(parseBoard(spec));
        const foe = v.units.find((u) => u.kind === 'enemy');
        if (foe) Object.assign(foe, { def });
        return v;
      };
      const props = { kit: { district: id }, ontap: () => {} } as const;
      shipped.ids = new Set();
      const zero = render(BattleBoard, { props: { ...props, view: view() } }).body;
      expect(zero).toContain('data-scene="wash"');
      expect(zero).not.toContain('<image');
      expect(zero).toContain('data-testid="board"');
      // The district's own foe art still draws (not the default token) with no art shipped.
      const plain = render(BattleBoard, {
        props: { kit: { district: id }, ontap: () => {}, view: viewOfSpec(parseBoard(spec)) },
      }).body;
      expect(zero).not.toEqual(plain);
      shipped.ids = new Set([`scenes/${id}/fight`]);
      const art = render(BattleBoard, { props: { ...props, view: view() } }).body;
      expect(art).toContain('data-scene="art"');
      expect(art).toContain(`/art/scenes/${id}/fight.webp`);
    },
  );
});
