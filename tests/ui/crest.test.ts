import { render } from 'svelte/server';
import { expect, test } from 'vitest';
import AppHeader from '$ui/components/common/AppHeader.svelte';
import { crestFor } from '$ui/districts';

test('crestFor falls back to a disc', () => {
  const { body } = render(AppHeader, {
    props: { variant: 'city', title: 'The Ink Quarter', crest: crestFor('inkQuarter') },
  });
  expect(body).toContain(
    '<span class="crest-disc" data-crest="inkQuarter" aria-hidden="true">I</span>',
  );
});
