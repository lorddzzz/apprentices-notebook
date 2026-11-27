import { expect, test } from 'vitest';
import { nextTab } from '../../src/ui/components/codex/tabs';

const TABS = ['runes', 'made', 'table'] as const;

test('next page moves to the following tab and stops at the last', () => {
  expect(nextTab(TABS, 'runes')).toBe('made');
  expect(nextTab(TABS, 'made')).toBe('table');
  expect(nextTab(TABS, 'table')).toBeNull();
});
