import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import ActionButton from '../../src/ui/components/common/ActionButton.svelte';
import AppHeader from '../../src/ui/components/common/AppHeader.svelte';
import Card from '../../src/ui/components/common/Card.svelte';
import { crestSnippet, HEADER_HEIGHT } from '../../src/ui/components/common/header';
import MenuSheet from '../../src/ui/components/common/MenuSheet.svelte';
import StepMarker from '../../src/ui/components/common/StepMarker.svelte';
import Unseen from '../../src/ui/components/common/Unseen.svelte';

/** UF-3: the C7 stubs render with their frozen props. Server render: no DOM needed. */

const text = (html: string) => createRawSnippet(() => ({ render: () => `<span>${html}</span>` }));
const noop = () => {};

describe('C7 stubs', () => {
  test('stubs: AppHeader variants set height and world; ⋯ is last and named', () => {
    expect(HEADER_HEIGHT).toEqual({ study: 88, subroom: 64, city: 56, system: 56 });
    const worlds = { study: 'home', subroom: 'home', city: 'city', system: 'system' } as const;
    for (const variant of ['study', 'subroom', 'city', 'system'] as const) {
      const { body } = render(AppHeader, {
        props: { variant, title: 'The Study', right: text('<button aria-label="Pens">✎</button>') },
      });
      expect(body).toContain(`data-world="${worlds[variant]}"`);
      expect(body).toContain(`--header-h: ${HEADER_HEIGHT[variant]}px`);
      // the ⋯ menu comes after the right slot and carries an accessible name
      expect(body.indexOf('aria-label="Pens"')).toBeLessThan(
        body.indexOf('data-testid="header-menu"'),
      );
      expect(body).toMatch(/<button[^>]*aria-label="Menu"[^>]*data-testid="header-menu"/);
    }
  });

  test('stubs: AppHeader back is a route link or a callback button', () => {
    const link = render(AppHeader, {
      props: { variant: 'subroom', title: 'Codex', back: { label: 'Study', to: 'study' } },
    }).body;
    expect(link).toMatch(/<a[^>]*href="#\/study"[^>]*data-testid="header-back"/);
    const button = render(AppHeader, {
      props: { variant: 'system', title: 'Lab', back: { label: 'Leave', onback: noop } },
    }).body;
    expect(button).toMatch(/<button[^>]*class="back[^"]*"[^>]*data-testid="header-back"/);
    expect(button).toContain('Leave');
  });

  test('stubs: the two-line fight header has a status line and a crest disc', () => {
    const { body } = render(AppHeader, {
      props: {
        variant: 'city',
        title: 'The Bell Foundry',
        subtitle: 'Round 2',
        crest: crestSnippet('foundry'),
        status: text('Brass Warden 14/20 · rings every third turn'),
      },
    });
    expect(body).toMatch(/class="status[^"]*"/);
    expect(body).toContain('Brass Warden 14/20');
    // two lines at most: with a status line, the subtitle sits on the title line
    expect(body).toMatch(
      /class="title-row[^"]*">.*The Bell Foundry.*Round 2.*<\/div>.*class="status/,
    );
    expect(body).toContain('data-crest="foundry"');
    expect(body).toContain('>F</span>');
  });

  test('stubs: the other five render with their props', () => {
    const primary = render(ActionButton, {
      props: { onclick: noop, label: 'Set out', testid: 'go' },
    }).body;
    expect(primary).toContain('data-testid="go"');
    expect(primary).toContain('primary');
    const quietDanger = render(ActionButton, {
      props: { kind: 'quiet', danger: true, disabled: true, onclick: noop, label: 'Wipe' },
    }).body;
    expect(quietDanger).toMatch(/class="action quiet danger[^"]*"/);
    expect(quietDanger).toContain('disabled');

    expect(render(Card, { props: { tone: 'plain', children: text('a note') } }).body).toMatch(
      /class="card plain[^"]*">.*a note/,
    );
    expect(render(Unseen, { props: { shape: 'chip', label: 'a rune' } }).body).toContain(
      'aria-label="a rune"',
    );
    expect(render(Unseen, { props: { shape: 'silhouette' } }).body).toContain('<svg');
    const gold = render(StepMarker, { props: { n: 3, gold: true, size: 32 } }).body;
    expect(gold).toMatch(/class="step gold[^"]*"/);
    expect(gold).toContain('data-size="32"');
    expect(render(MenuSheet, { props: { open: true, onclose: noop } }).body).toContain(
      'data-testid="menu-sheet"',
    );
    expect(render(MenuSheet, { props: { open: false, onclose: noop } }).body).not.toContain(
      'menu-sheet',
    );
  });
});

describe('prefs stub', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test('prefs: reduced motion is a live getter that follows the OS preference', async () => {
    let listener: ((e: { matches: boolean }) => void) | undefined;
    const mql = {
      matches: false,
      addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => {
        listener = fn;
      },
    };
    vi.stubGlobal('matchMedia', (q: string) => {
      expect(q).toBe('(prefers-reduced-motion: reduce)');
      return mql;
    });
    vi.resetModules();
    const { prefs, motionScale } = await import('../../src/app/prefs.svelte');
    expect(prefs.reduced).toBe(false);
    listener?.({ matches: true });
    expect(prefs.reduced).toBe(true);
    listener?.({ matches: false });
    expect(prefs.reduced).toBe(false);
    expect(prefs.motion).toBe('normal');
    expect(motionScale()).toBe(1);
  });

  test('prefs: without matchMedia (server, tests) nothing is reduced', async () => {
    vi.stubGlobal('matchMedia', undefined);
    vi.resetModules();
    const { prefs } = await import('../../src/app/prefs.svelte');
    expect(prefs.reduced).toBe(false);
  });
});
