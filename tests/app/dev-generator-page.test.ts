import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

/**
 * DEV-1: the generator dev page must not mount into `#app`. The game's theme (`src/ui/theme.css`)
 * locks `#app` to the screen (`height: 100dvh; overflow: hidden`) and the body to `overscroll-behavior:
 * none`, so on a phone the 20 sample rooms below the summary cannot be reached. The page mounts into
 * `#dev` instead, and its own component style lets the document scroll.
 */
function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('dev generator page', () => {
  test('DEV-1: the generator page does not mount into the scroll-locked #app', () => {
    const html = source('../../src/app/dev/generator.html');
    const ts = source('../../src/app/dev/generator.ts');
    expect(html).not.toMatch(/id="app"/);
    expect(ts).toMatch(/getElementById\('dev'\)/);
    expect(ts).not.toMatch(/getElementById\('app'\)/);
    expect(html).toMatch(/id="dev"/);
  });
});
