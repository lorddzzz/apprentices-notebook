import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from 'svelte/server';
import { describe, expect, test } from 'vitest';
import type { MemberId } from '$data';
import { compileLattice, describeSpell, newProfile, parseLattice } from '$engine';
import { profileShelf } from '../../src/app/study';
import LatticeEditor from '../../src/ui/components/lattice/LatticeEditor.svelte';
import RuneShelf from '../../src/ui/components/lattice/RuneShelf.svelte';

/** UH-4 seat tabs and UH-5 spell ribbon and drawer: server render plus the component CSS as text. */

const DIR = join(__dirname, '../../src/ui/components/lattice');
const source = (file: string) => readFileSync(join(DIR, file), 'utf8');
const css = (file: string) => source(file).slice(source(file).indexOf('<style>'));

const member: MemberId = 'draughtsman';
const lattice = parseLattice('Bolt> Ink Spark');
const compiled = compileLattice(lattice);
const slots = profileShelf(newProfile(), member);

const editor = (props: Record<string, unknown> = {}) =>
  render(LatticeEditor, {
    props: {
      sessionKey: 'uh-test',
      lattice,
      compiled,
      capacity: 8,
      slots,
      tool: { kind: 'none' },
      ontool: () => {},
      onsocket: () => {},
      member,
      members: [member, 'stoker', 'runaway'],
      onmember: () => {},
      household: { more: 2, onmore: () => {}, visiting: new Set<MemberId>(['runaway']), empty: 1 },
      ...props,
    },
  }).body;

describe('UH-4 seat tabs', () => {
  test('a tab per seat with token, name and HP · move; dashed visiting; Empty; +N', () => {
    const html = editor();
    expect(html.match(/data-member=/g)?.length).toBe(3);
    expect(html).toContain('class="mstats');
    expect(html).toMatch(/visiting/);
    expect(html).toContain('data-testid="seat-empty"');
    expect(html).toContain('>+2<');
    expect(html).toContain('data-testid="household-open"');
  });

  test('+N and Empty both open the household sheet (onmore)', () => {
    const src = source('LatticeEditor.svelte');
    expect(src).toMatch(/class="plus"[\s\S]*?onclick=\{household\.onmore\}/);
    expect(src).toMatch(/class="mark empty"[\s\S]*?onclick=\{household\.onmore\}/);
  });

  test('every seat control is at least 44 px tall (var(--tap))', () => {
    const styles = css('LatticeEditor.svelte');
    expect(styles).toMatch(/\.editor\.notebook \.mark \{[^}]*min-height: var\(--tap\)/);
    expect(styles).toMatch(/\.editor\.notebook \.mark\.on \{[^}]*min-height: var\(--tap\)/);
    expect(styles).toMatch(/\.plus \{[^}]*min-height: var\(--tap\)/);
  });

  test('no mono face and no hand face below 20 px in the notebook rules', () => {
    const notebook = css('LatticeEditor.svelte').slice(
      css('LatticeEditor.svelte').indexOf('The Study'),
    );
    expect(notebook).not.toMatch(/var\(--mono\)|var\(--font-hand\)|var\(--font-script\)/);
  });
});

describe('UH-5 spell ribbon', () => {
  test('the focused spell reads as a ribbon of chips and arrows', () => {
    const html = editor();
    const names = describeSpell(compiled.spells[0] ?? (undefined as never)).split(' → ');
    expect(names.length).toBeGreaterThanOrEqual(3);
    expect(html.match(/class="chip/g)?.length).toBe(names.length);
    expect(html.match(/class="arrow/g)?.length).toBe(names.length - 1);
    expect(html).toContain(`>${names[0]}<`);
    expect(html).toContain('data-testid="reading"');
  });

  test('a rune in hand shows in the strip', () => {
    const html = editor({ tool: { kind: 'rune', rune: 'bolt' } });
    expect(html).toContain('data-testid="rune-detail"');
  });
});

describe('UH-5 drawer', () => {
  const shelf = (props: Record<string, unknown> = {}) =>
    render(RuneShelf, {
      props: {
        slots,
        tool: { kind: 'none' },
        onselect: () => {},
        erase: true,
        drawer: true,
        ...props,
      },
    }).body;

  test('fixed tabs row and ends around one reserved footprint; roles, Erase, pull present', () => {
    const html = shelf();
    for (const id of ['drawer', 'drawer-pull', 'tab-runes', 'shelf', 'erase']) {
      expect(html).toContain(`data-testid="${id}"`);
    }
    expect(html).toContain('class="dw');
    expect(html).toContain('data-role-head=');
    expect(html).toMatch(/class="cap[ "]/);
  });

  test('opening is an overlay: the footprint is fixed and the panel is absolutely anchored', () => {
    const styles = css('RuneShelf.svelte');
    expect(styles).toMatch(/\.dw \{[^}]*--closed: 124px[^}]*height: var\(--closed\)/);
    expect(styles).toMatch(/\.dw\.compact \{[^}]*--closed: 56px/);
    expect(styles).toMatch(/\.panel \{[^}]*position: absolute[^}]*bottom: 0/);
    expect(shelf({ up: true })).toMatch(/class="panel[^"]*open/);
    expect(shelf()).not.toMatch(/class="panel[^"]*open/);
  });

  test('without drawer the shelf renders as before (Lab): no panel, no pull', () => {
    const html = shelf({ drawer: false });
    expect(html).not.toContain('data-testid="drawer"');
    expect(html).not.toContain('data-testid="drawer-pull"');
    expect(html).toContain('data-testid="shelf"');
  });
});
