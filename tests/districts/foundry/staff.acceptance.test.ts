import { describe, expect, it } from 'vitest';
import { ENEMIES } from '$data';
import { FOUNDRY_FOE_TOKENS, FOUNDRY_TUNING } from '$data/districts/foundry';

/**
 * BF-6 and BF-7 acceptance (foundry-plan §2 P5, P9, P12; BF-T2): the ringers' staff. The foes are
 * not in `ENEMIES` and their tokens are not parseable yet, so only the data rows can be asserted
 * now (`it.fails`); every behaviour needs the foe on a board and stays `it.todo` until BF-6 adds
 * the Ringer and the Clapper (with their intents or DK-9 steps) and BF-7 the Detuner. Whoever
 * builds a foe turns that foe's todos into tests in this file and says so in the report.
 */

const roster = ENEMIES as unknown as Record<string, Record<string, unknown> | undefined>;

describe('BF-6 the Ringer and the Clapper', () => {
  it.fails('BF-6: the Ringer and the Clapper are in ENEMIES with the plan stats and tokens', () => {
    expect(roster.ringer).toMatchObject({
      hp: FOUNDRY_TUNING.foes.ringer.hp,
      anchored: true,
      token: FOUNDRY_FOE_TOKENS.ringer,
    });
    expect(roster.clapper).toMatchObject({
      hp: FOUNDRY_TUNING.foes.clapper.hp,
      move: FOUNDRY_TUNING.foes.clapper.move,
      anchored: false,
      token: FOUNDRY_FOE_TOKENS.clapper,
    });
  });

  it.todo('BF-6: the Ringer stands on its rope and telegraphs a ring a round ahead');
  it.todo('BF-6: a Ringer ring fizzles when its tone already hums');
  it.todo('BF-6: a Ringer ring pulses neutrally and can hurt its friends');
  it.todo('BF-6: hitting the Clapper rings its tone');
  it.todo('BF-6: a standing Clapper is a member of its tone; a dead one is not');
  it.todo('BF-6: the Clapper plan is rng-free and avoids harming friends');
  it.todo('BF-6: Ringer and Clapper plans are deterministic across seeds');
});

describe('BF-7 the Detuner', () => {
  it.fails('BF-7: the Detuner is in ENEMIES with the plan stats and token', () => {
    expect(roster.detuner).toMatchObject({
      hp: FOUNDRY_TUNING.foes.detuner.hp,
      move: FOUNDRY_TUNING.foes.detuner.move,
      anchored: false,
      token: FOUNDRY_FOE_TOKENS.detuner,
    });
  });

  it.todo('BF-7: the Detuner walks to the nearest bell and retunes it with a preview');
  it.todo('BF-7: with two bells in reach it takes the nearest, reading order on a tie');
  it.todo('BF-7: muffled and humming bells are retuned like any other');
  it.todo('BF-7: killing or blocking the Detuner keeps the net as it was');
  it.todo('BF-7: the Detuner choice is deterministic across seeds');
});
