import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, test, vi } from 'vitest';
import { toast, toasts } from '../../src/app/toasts.svelte';
import ActionButton from '../../src/ui/components/common/ActionButton.svelte';
import AppHeader from '../../src/ui/components/common/AppHeader.svelte';
import Card from '../../src/ui/components/common/Card.svelte';
import Sheet from '../../src/ui/components/common/Sheet.svelte';
import StepMarker from '../../src/ui/components/common/StepMarker.svelte';
import { swipeCloses } from '../../src/ui/components/common/sheetSwipe';
import Toasts from '../../src/ui/components/common/Toasts.svelte';
import Unseen from '../../src/ui/components/common/Unseen.svelte';

/** UF-8…UF-10: the looks of the C7 components. Server render plus the component CSS as text. */

const shipped = vi.hoisted(() => ({ ids: new Set<string>() }));
vi.mock('../../src/ui/art/registry', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/ui/art/registry')>();
  return {
    ...real,
    artUrl: (id: string) => (shipped.ids.has(id) ? `/art/${id}.webp` : null),
    artSize: (id: string) => (shipped.ids.has(id) ? { w: 750, h: 224 } : null),
  };
});

const DIR = join(__dirname, '../../src/ui/components/common');
const source = (file: string) => readFileSync(join(DIR, file), 'utf8');
const css = (file: string) => source(file).slice(source(file).indexOf('<style>'));

/** The declarations of every rule whose selector list mentions `selector` (exact class token). */
function declsFor(styles: string, selector: string): string[] {
  const out: string[] = [];
  for (const m of styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = (m[1] ?? '').split(',').map((s) => s.trim());
    if (selectors.some((s) => s === selector || s.endsWith(` ${selector}`))) out.push(m[2] ?? '');
  }
  return out;
}

const text = (html: string) => createRawSnippet(() => ({ render: () => `<span>${html}</span>` }));

describe('UF-8 AppHeader, ActionButton, Card', () => {
  test('components: tappable controls declare min-height var(--tap)', () => {
    const tappable: Array<[string, string[]]> = [
      ['AppHeader.svelte', ['.back', '.more']],
      ['ActionButton.svelte', ['.action']],
    ];
    for (const [file, selectors] of tappable) {
      for (const selector of selectors) {
        const rules = declsFor(css(file), selector);
        expect(rules.length, `${file} ${selector}`).toBeGreaterThan(0);
        expect(
          rules.some((r) => /min-height:\s*var\(--tap\)/.test(r)),
          `${file} ${selector} min-height`,
        ).toBe(true);
        expect(
          rules.some((r) => /min-width:\s*var\(--tap\)/.test(r)),
          `${file} ${selector} min-width`,
        ).toBe(true);
      }
    }
  });

  test('components: AppHeader strip renders through ArtImage and keeps data-strip', () => {
    shipped.ids = new Set(['scenes/home/study-strip']);
    const withArt = render(AppHeader, {
      props: { variant: 'study', title: 'The Study', strip: 'scenes/home/study-strip' },
    }).body;
    expect(withArt).toMatch(/<img[^>]*src="\/art\/scenes\/home\/study-strip\.webp"/);
    expect(withArt).toContain('object-fit: cover');
    expect(withArt).toContain('data-strip="scenes/home/study-strip"');
    expect(withArt).toContain('has-strip');
    // z-order: the strip comes before the title so the content paints above it
    expect(withArt.indexOf('<img')).toBeLessThan(withArt.indexOf('The Study'));
  });

  test('components: AppHeader with no art on disk still renders flat world colours', () => {
    shipped.ids = new Set();
    const body = render(AppHeader, {
      props: { variant: 'subroom', title: 'Codex', strip: 'scenes/home/codex-strip' },
    }).body;
    expect(body).not.toContain('<img');
    expect(body).toContain('data-strip="scenes/home/codex-strip"');
    expect(body).toContain('data-world="home"');
    expect(css('AppHeader.svelte')).toMatch(/background:[^;]*var\(--(world-bg|home-wood-dark)\)/);
  });

  test('components: AppHeader city header shows the crest slot left of the title', () => {
    const body = render(AppHeader, {
      props: {
        variant: 'city',
        title: 'The Seam',
        subtitle: 'Round 2',
        crest: text('<span class="crest-disc">S</span>'),
      },
    }).body;
    expect(body.indexOf('class="crest')).toBeLessThan(body.indexOf('The Seam'));
    expect(body).not.toContain('data-testid="header-back"');
  });

  test('components: ActionButton disabled is not colour alone; danger uses --danger', () => {
    const styles = css('ActionButton.svelte');
    const disabled = declsFor(styles, '.action:disabled').join(';');
    expect(disabled).toMatch(/border-style:\s*dashed/);
    expect(disabled).toMatch(/font-style:\s*italic/);
    expect(declsFor(styles, '.danger').join(';')).toContain('var(--danger)');
    const body = render(ActionButton, {
      props: { label: 'Go', onclick: () => {}, disabled: true },
    }).body;
    expect(body).toContain('disabled');
    expect(body).toContain('Go');
  });

  test('components: ActionButton primary is gold-edged on home and city, ink on system', () => {
    const styles = css('ActionButton.svelte');
    expect(styles).toMatch(/\[data-world="home"\]\)\s*\.primary[^{]*\{[^}]*var\(--gold\)/);
    expect(styles).toMatch(/\[data-world="system"\]\)\s*\.primary[^{]*\{[^}]*var\(--system-ink\)/);
  });

  test('components: Card sizes to its content (no min-height)', () => {
    expect(css('Card.svelte')).not.toMatch(/min-height|\bheight:/);
    const body = render(Card, { props: { children: text('hello') } }).body;
    expect(body).toContain('hello');
  });
});

describe('UF-9 Unseen and StepMarker', () => {
  test('components: Unseen renders box, chip and silhouette with one dashed frame', () => {
    const styles = css('Unseen.svelte');
    expect(declsFor(styles, '.unseen').join(';')).toMatch(/border:\s*2px dashed/);
    for (const shape of ['box', 'chip'] as const) {
      const body = render(Unseen, { props: { shape } }).body;
      expect(body).toContain(`unseen ${shape}`);
      expect(body).toContain('???');
    }
    const sil = render(Unseen, { props: { shape: 'silhouette' } }).body;
    expect(sil).toContain('<svg');
    expect(sil).not.toContain('???');
  });

  test('components: Unseen label is optional and names the image', () => {
    const none = render(Unseen, { props: {} }).body;
    expect(none).toContain('aria-label="Not seen yet"');
    expect(none).not.toContain('class="text"');
    const named = render(Unseen, { props: { shape: 'chip', label: 'A rival' } }).body;
    expect(named).toContain('aria-label="A rival"');
    expect(named).toContain('A rival');
  });

  test('components: StepMarker sizes 24 and 32, gold adds a second ring', () => {
    expect(render(StepMarker, { props: { n: 3 } }).body).toContain('--size: 24px');
    expect(render(StepMarker, { props: { n: 3, size: 32 } }).body).toContain('--size: 32px');
    const gold = render(StepMarker, { props: { n: 1, gold: true } }).body;
    expect(gold).toContain('step gold');
    expect(render(StepMarker, { props: { n: 1 } }).body).not.toContain('gold');
    // two extra rings (a paper gap and a gold ring) around the base border: three edges in total
    const goldRule = declsFor(css('StepMarker.svelte'), '.gold').join(';');
    expect(goldRule).toMatch(/box-shadow:[^;]*var\(--parchment\)[^;]*var\(--gold\)/);
    expect(declsFor(css('StepMarker.svelte'), '.step').join(';')).toContain('border-radius: 50%');
  });
});

describe('UF-10 Sheet and Toasts', () => {
  const sheetProps = (extra: Record<string, unknown> = {}) => ({
    open: true,
    title: 'The notebook',
    onclose: () => {},
    children: text('body text'),
    ...extra,
  });

  test('components: Sheet keeps its dialog contract and the ✕ and tap-out close controls', () => {
    const body = render(Sheet, { props: sheetProps() }).body;
    expect(body).toContain('role="dialog"');
    expect(body).toContain('aria-modal="true"');
    expect(body).toContain('aria-label="The notebook"');
    expect(body).toMatch(/class="scrim[^"]*"[^>]*aria-label="Close"/);
    expect(body).toMatch(/class="close tap[^"]*"[^>]*aria-label="Close"/);
    expect(body).toContain('body text');
    expect(render(Sheet, { props: sheetProps({ open: false }) }).body).not.toContain('dialog');
  });

  test('components: Sheet size is auto (70%) or tall (86%)', () => {
    expect(render(Sheet, { props: sheetProps() }).body).toMatch(/panel auto[ "]/);
    expect(render(Sheet, { props: sheetProps({ size: 'tall' }) }).body).toMatch(/panel tall[ "]/);
    const styles = css('Sheet.svelte');
    expect(declsFor(styles, '.panel').join(';')).toContain('max-height: 70%');
    expect(declsFor(styles, '.panel.tall').join(';')).toContain('max-height: 86%');
    expect(declsFor(styles, '.close').join(';')).toMatch(/min-height:\s*var\(--tap\)/);
  });

  test('components: Sheet swipe-down starts on the handle and title row, not the body', () => {
    const src = source('Sheet.svelte');
    const markup = src.slice(src.indexOf('{#if open}'), src.indexOf('<style>'));
    const grip = markup.slice(markup.indexOf('class="grip"'), markup.indexOf('class="body"'));
    expect(grip).toContain('onpointerdown');
    expect(grip).toContain('class="handle"');
    expect(grip).toContain('<h2>');
    expect(markup.slice(markup.indexOf('class="body"'))).not.toContain('onpointer');
    expect(declsFor(css('Sheet.svelte'), '.grip').join(';')).toContain('touch-action: none');
    expect(declsFor(css('Sheet.svelte'), '.body').join(';')).toContain('overflow-y: auto');
  });

  test('components: swipeCloses needs a long or a quick downward drag', () => {
    expect(swipeCloses(0, 100, 300)).toBe(false);
    expect(swipeCloses(-80, 100, 300)).toBe(false);
    expect(swipeCloses(20, 10, 300)).toBe(false); // short, even if quick
    expect(swipeCloses(60, 400, 300)).toBe(false); // medium and slow: springs back
    expect(swipeCloses(60, 100, 300)).toBe(true); // medium and quick: a flick
    expect(swipeCloses(120, 2000, 300)).toBe(true); // long and slow
    expect(swipeCloses(40, 1000, 100)).toBe(true); // 30% of a short sheet
  });

  test('components: Sheet reduced motion fades instead of sliding', () => {
    const styles = css('Sheet.svelte');
    expect(declsFor(styles, '.reduced .panel').join(';')).toMatch(/animation:\s*fade/);
    expect(styles).toMatch(/prefers-reduced-motion: reduce[\s\S]*animation-name: fade/);
    expect(source('Sheet.svelte')).toContain('prefs.reduced');
  });

  test('components: Toasts keep the store and both tones; warn is not colour alone', () => {
    toasts.items = [];
    toast('Saved');
    toast('Out of ink', 'warn');
    const body = render(Toasts, { props: {} }).body;
    expect(body).toMatch(/class="toast info[ "]/);
    expect(body).toMatch(/class="toast warn[ "]/);
    expect(body).toContain('role="status"');
    expect(body.match(/class="mark[ "]/g)).toHaveLength(1);
    expect(declsFor(css('Toasts.svelte'), '.warn').join(';')).toMatch(/border-style:\s*dashed/);
    toasts.items = [];
  });
});
