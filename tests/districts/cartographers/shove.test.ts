import { describe, expect, it } from 'vitest';
import { basicDirs } from '$engine/basicActions';
import { board } from '../../scenarios/harness';

/** CG-3b: a basic Shove answers only the strike kinds a piece declares (`struckBy`). */

const SHOVER = { kits: { draughtsman: { action: 'shove' as const } } };

describe('CG-3b piece strike kinds', () => {
  it('CG-3b: a Shove at an empty pencil tile is not offered', () => {
    const s = board('D {pencil} . .', SHOVER);
    expect(basicDirs(s, 'draughtsman')).not.toContain('right');
  });

  it('CG-3b: a Shove at an outline is not offered', () => {
    const s = board('D {outline:eraser} . .', SHOVER);
    expect(basicDirs(s, 'draughtsman')).not.toContain('right');
  });

  it('CG-3b: a Shove at a unit on pencil still shoves it', () => {
    const s = board('D r{pencil} . .', SHOVER);
    expect(basicDirs(s, 'draughtsman')).toContain('right');
  });

  it('CG-3b: a Shove at a bell is still legal', () => {
    const s = board('D {bell:low} . .', SHOVER);
    expect(basicDirs(s, 'draughtsman')).toContain('right');
  });
});
