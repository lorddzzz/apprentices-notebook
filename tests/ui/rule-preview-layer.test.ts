import { render } from 'svelte/server';
import { describe, expect, test } from 'vitest';
import type { PreviewShape } from '$engine/districts/types';
import { IDLE } from '../../src/app/battleInput';
import { overlayFor } from '../../src/app/overlay';
import RulePreviewLayer from '../../src/ui/components/board/RulePreviewLayer.svelte';
import { board } from '../scenarios/harness';

/** CN-3 / BL-133: a bystander the current carries (the crate) gets a "Next round" trail too. */
describe('the next-round preview of a drifting unit', () => {
  test('the crate on the current has a ghost shape, and the layer draws a trail to it', () => {
    const s = board('S . wv\n. . kwv\n. . wv');
    const ghosts: PreviewShape[] = (overlayFor(s, IDLE).next?.shapes ?? []).filter(
      (sh) => sh.kind === 'ghost',
    );
    expect(ghosts.length).toBe(1);
    const { body } = render(RulePreviewLayer, { props: { shapes: ghosts } });
    expect(body).toContain('data-shape="ghost-trail"');
  });

  test('a shape list without ghosts draws no trail', () => {
    const { body } = render(RulePreviewLayer, {
      props: { shapes: [{ kind: 'pulse', at: { x: 0, y: 0 } }] },
    });
    expect(body).not.toContain('ghost-trail');
  });
});
