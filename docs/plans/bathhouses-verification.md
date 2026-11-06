# Bathhouses verification (BH)

Measurements for [bathhouses-plan.md](bathhouses-plan.md) §6. Numbers are recorded, not tuned: the player's rule is no balance tuning during the build, so out-of-band rooms below are inputs for the end-of-build calibration.

## Calibration (BH-16)

Setup: `tests/sim/bathhouses-calibration.test.ts`, rooms driven straight from `BATH_ROOMS_12`, `BATH_ROOMS_34` and `BATH_HEART` (not yet in the kit), founding pair, fresh HP, gauge listed at the room's heat (rooms 1-4 = heat 1-4, heart = 4), 20 seeds per layout, 40-round cap. Reproduce: `BATH_SEEDS=20 pnpm vitest run tests/sim/bathhouses-calibration.test.ts --disable-console-intercept` (about 2.5 minutes; `BATH_TABLE=1` uses 30 seeds). The default run is a quick two-seed win check per room and both bots (about 5 s, in `check:fast`).

Two bots: **blind** (the old greedy bot) and **gauge** (`botFight(..., { gauge: true })`): it adds the forecast boil-over to its scoring, so it will not end a round with a member in a cloud when the gauge would boil (-30 per HP lost, -200 for a down), and it values a forecast boil-over that hits foes (+10 per HP, +20 for a kill), which is the "brew on purpose" case. "Party hits" is members stormed per fight; "1st boil rd" is the median round of a fight's first boil-over (fights with none are left out).

| room | layout | heat | blind win | blind boil/fight | blind party hits | blind 1st boil rd | gauge win | gauge boil/fight | gauge party hits | gauge 1st boil rd |
|---|---|---|---|---|---|---|---|---|---|---|
| The changing hall | The changing hall | 1 | 20/20 | 0.0 | 0.0 | - | 20/20 | 0.0 | 0.0 | - |
| The changing hall | The scrubbing floor | 1 | 20/20 | 0.0 | 0.0 | - | 20/20 | 0.0 | 0.0 | - |
| The changing hall | The tepidarium | 1 | 20/20 | 0.1 | 0.1 | 4 | 20/20 | 0.1 | 0.0 | 4 |
| The steam gallery | The steam gallery | 2 | 20/20 | 0.3 | 0.0 | 3 | 20/20 | 0.3 | 0.0 | 3 |
| The steam gallery | The laundry | 2 | 20/20 | 0.3 | 0.2 | 3 | 20/20 | 0.3 | 0.0 | 3 |
| The steam gallery | The boiler passage | 2 | 20/20 | 0.3 | 0.1 | 3 | 20/20 | 0.3 | 0.0 | 3 |
| The long pools | The frigidarium | 3 | 20/20 | 1.0 | 0.1 | 4 | 20/20 | 1.0 | 0.0 | 4 |
| The long pools | The long pool hall | 3 | 20/20 | 1.0 | 0.5 | 3 | 20/20 | 1.0 | 0.0 | 3 |
| The long pools | The mosaic court | 3 | 20/20 | 0.8 | 0.2 | 3 | 20/20 | 0.8 | 0.0 | 3 |
| The caldarium | The great caldarium | 4 | 20/20 | 1.0 | 0.0 | 3 | 20/20 | 1.0 | 0.0 | 3 |
| The caldarium | The sudatorium | 4 | 20/20 | 1.1 | 0.4 | 3 | 20/20 | 1.3 | 0.0 | 3 |
| The caldarium | The hot springs | 4 | 20/20 | 1.1 | 0.0 | 3 | 20/20 | 1.1 | 0.0 | 3 |
| The steward's caldarium | layout 1 | 4 | 20/20 | 2.0 | 1.6 | 2 | 20/20 | 2.0 | 0.4 | 2 |
| The steward's caldarium | layout 2 | 4 | 20/20 | 2.2 | 2.3 | 2 | 20/20 | 2.0 | 0.3 | 2 |
| The steward's caldarium | layout 3 | 4 | 20/20 | 2.0 | 1.8 | 2 | 20/20 | 2.1 | 0.6 | 2 |

### Reading against §6 (for the end-of-build calibration, nothing changed)

- **Win rate: every room 100% for both bots, above the band.** The plan wants rooms within 10 points of the canal rooms at the same depth and hearts lower by design; at party size 2 with fresh HP the bot never loses, so the rooms (the heart included) are easier than the canals. Candidate for the end: raise foe numbers, or measure with trip-worn HP rather than fresh.
- **Boil-overs per fight: rooms 1-2 at 0-0.4 and room 3-4 at about 1 are inside "at most one in a median fight at heat 1-2".** The heart boils twice a fight and first on round 2, which breaks "no room where the median fight boils over before round 3". The Steward's stoke (+4 pips) is the likely cause. Candidate: a smaller stoke or a later first stoke.
- **Both outcomes occur** (boil-over wins or loses): the boil-over often wins fights (it storms foes), but with 100% wins no fight is lost to it. The blind bot stormed its own party 0.4-2.3 times a heart fight; the gauge bot cuts that to 0.3-0.6 and to 0.0 in rooms 1-4 beyond the tepidarium. Caveat: the gauge bot's brew-on-purpose term rarely changes the boil count (the heat tables fill mostly from vents and foe-side steam), so "boil-overs per fight" is unchanged between the bots.
