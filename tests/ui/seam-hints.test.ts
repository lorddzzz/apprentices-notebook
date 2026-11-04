import { describe, expect, test } from 'vitest';
import { DISTRICT_IDS, DISTRICTS } from '$data';
import { SEAM_HINTS } from '$data/districts/seam';
import { newProfile, type Profile } from '$engine';
import { unheardHints } from '../../src/ui/districts/seam/margin';

function heard(ids: readonly string[]): Profile {
  const p = newProfile();
  return { ...p, city: { ...p.city, heard: [...p.city.heard, ...ids] } } as Profile;
}

describe("the owner's margin hints (SM-5)", () => {
  test('five lines, one per district heard in the Seam', () => {
    const heardInSeam = DISTRICT_IDS.filter((id) =>
      DISTRICTS[id].hear.some(
        (h) => 'district' in h && h.district === 'seam' && h.voice === 'owner',
      ),
    );
    expect(SEAM_HINTS).toHaveLength(5);
    expect(SEAM_HINTS.map((h) => h.district).sort()).toEqual([...heardInSeam].sort());
  });

  test('no line names a district', () => {
    const words = DISTRICT_IDS.flatMap((id) => [
      id.toLowerCase(),
      ...DISTRICTS[id].name
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3),
    ]);
    for (const h of SEAM_HINTS) {
      for (const w of [...words, 'canal', 'bath', 'bridge', 'foundry', 'quarter', 'thermae']) {
        expect(h.line.toLowerCase(), `${h.district}: "${h.line}" has "${w}"`).not.toContain(w);
      }
    }
  });

  test('a fresh save shows five lines', () => {
    expect(unheardHints(newProfile())).toHaveLength(5);
  });

  test('a line retires once its district is heard', () => {
    const left = unheardHints(heard(['canals']));
    expect(left).toHaveLength(4);
    expect(left.map((h) => h.district)).not.toContain('canals');
  });

  test('every district heard leaves the margin quiet', () => {
    expect(unheardHints(heard(SEAM_HINTS.map((h) => h.district)))).toEqual([]);
  });
});
