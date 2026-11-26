import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, test, vi } from 'vitest';
import ActionButton from '../../src/ui/components/common/ActionButton.svelte';
import AppHeader from '../../src/ui/components/common/AppHeader.svelte';
import Card from '../../src/ui/components/common/Card.svelte';

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
    const body = render(ActionButton, { props: { label: 'Go', onclick: () => {}, disabled: true } })
      .body;
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
