import { describe, expect, test } from 'vitest';
import { METHODS, type MethodId } from '$data';
import { lootLine, methodOfferHeadline } from '../../src/app/describe';

/** The Repeat card showed a raw "{0}": every method's offer-card headline must be filled in. */
describe('method headlines on offer cards', () => {
  const ids = Object.keys(METHODS) as MethodId[];

  test('no method offer card carries a template placeholder', () => {
    for (const id of ids) {
      const { text } = lootLine({ kind: 'method', method: id });
      expect(text, id).not.toContain('{0}');
      expect(text, id).not.toContain('{1}');
      expect(text, id).not.toContain('{event}');
    }
  });

  test('the Repeat card reads as a sentence with its action filled in', () => {
    expect(methodOfferHeadline('repeat')).toBe(
      'The action now, and once more next turn on the same tile.',
    );
  });
});
