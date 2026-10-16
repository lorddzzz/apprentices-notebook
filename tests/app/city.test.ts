import { describe, expect, test } from 'vitest';
import { newProfile, openAll, type Profile, seeMap, solveThreshold } from '$engine';
import { mapNode, mapNodes, mapPaths, nodeTag } from '../../src/app/city';

const withCity = (patch: Partial<Profile['city']>): Profile => {
  const p = newProfile();
  return { ...p, city: { ...p.city, ...patch } };
};

describe('sketch map helpers', () => {
  test('a fresh notebook draws only the Seam, open', () => {
    const nodes = mapNodes(newProfile());
    expect(nodes.map((n) => n.id)).toEqual(['seam']);
    expect(nodes[0]?.state).toBe('open');
    expect(mapPaths(nodes)).toEqual([]);
  });

  test('an unheard district has no node', () => {
    expect(mapNode(newProfile(), 'canals')).toBeNull();
  });

  test('heard canals: smudge with line, barred text, try the lock, fresh', () => {
    const p = withCity({ heard: ['seam', 'canals'], fresh: ['canals'] });
    const n = mapNode(p, 'canals');
    expect(n).toMatchObject({ state: 'heard', tryLock: true, fresh: true, heart: false });
    expect(n?.line).toBeTruthy();
    expect(n?.barred).toBeTruthy();
    expect(n?.material).toBe('Oil');
    expect(mapPaths(mapNodes(p)).map((x) => x.id)).toEqual(['canals']);
  });

  test('open canals: no barred text, no lock to try; solved shows a burnt gate', () => {
    const p = solveThreshold(withCity({ heard: ['seam', 'canals'] }), 'canals');
    const n = mapNode(p, 'canals');
    expect(n).toMatchObject({ state: 'open', tryLock: false, burntGate: true, barred: '' });
  });

  test('heart cleared marks the node', () => {
    const p = withCity({ hearts: ['seam'] });
    expect(mapNode(p, 'seam')?.heart).toBe(true);
  });

  test('seeMap clears fresh so nodes show new ink once', () => {
    const p = withCity({ heard: ['seam', 'canals'], fresh: ['canals'] });
    expect(mapNode(seeMap(p), 'canals')?.fresh).toBe(false);
  });

  test('openAll opens every district', () => {
    expect(mapNodes(openAll(newProfile())).every((n) => n.state === 'open')).toBe(true);
  });

  test('nodeTag joins material and guild', () => {
    const n = mapNode(withCity({ heard: ['seam', 'canals'] }), 'canals');
    expect(n && nodeTag(n)).toBe('Oil · The Lamplighters');
  });
});
