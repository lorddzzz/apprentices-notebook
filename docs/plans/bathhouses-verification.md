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

## Release (BH-18)

The district is open: `BATHHOUSES_KIT` carries rooms 1-4 (`BATH_ROOMS_12` + `BATH_ROOMS_34`) and the heart (`BATH_HEART`) with each room's ledger entry as `lore`, `gate: threshold` on the dome, the towel-bearer's `recruit` and `recruitPages` (`BATH_RECRUIT_KIT`), and it is in `PLAYABLE_DISTRICTS`. The threshold battle now lists the rules its spec names (`src/app/threshold.ts::thresholdStart`; before, the dome's gauge never appeared in the app). The stand-in Steward was deleted in BH-17b; the real rival plays the heart.

Not wired: `intrusion: BATH_INTRUSION`. The lower Seam's `checkFloor` (`lowerSeam.ts::carriesIntrusion`) accepts only a piece the intrusion brings or a terrain read by one of its piece-scoped rules, and nothing piece-scoped reads the vent (the boil-over rule is district-scoped, P9). Fix, Seam owner's call: let `IntrusionSpec` name a `terrain` flag (`vent`) that `carriesIntrusion` accepts. Until then the lower Seam has no bathhouse floors (the plan's P12 is open).

### §6 checklist

| Check | Result | Evidence |
|---|---|---|
| Scenarios: gauge at each heat, boil-over (shields, immunity, deaths, chain), forecast = result | pass | `tests/districts/bathhouses/boil-over.test.ts` (fill per heat, boil at cap, shielded, downed, towel-bearer, last foe, forecast through End turn) |
| Bather movement and pass-through; attendant heading and crush; boilerman; Steward dodge, re-form, cut | pass | `dissolved.test.ts`, `foes.test.ts`, `heart.test.ts`, `tests/rivals/bathSteward.test.ts` |
| A Steam Room performed in a bathhouse room: idiom fires, fight then boils | not checked | no scenario found by name; the gauge counts every cloud kind (`boil-over.test.ts`), which covers the mechanism |
| Plunge across save/load and a wipe | pass | `plunge.test.ts` (save/load, wipe drops it) |
| Hearing meet and narrow miss | pass | `tests/data/bathhouse-lore.test.ts`, DK-8 hearing entry |
| Threshold solved from every start | pass | `tests/data/bathhouse-threshold.test.ts`; app lists the gauge (`release.test.ts`) |
| Fuzz/bot: never stranded, heat parses back, trip state survives saves, fights terminate, 500-event cap | partial | `release.test.ts` plays four seeded whole trips (heat 1,2,3,4,4, clears, hearts); `trip.test.ts` covers heat/saves; fights terminate in the calibration sim; the generic fuzz does not yet include the district; no 500-cap bathhouse test |
| Same seed, same boil-over | pass | calibration is seeded; boil-over is deterministic in `boil-over.test.ts` |
| Bot: win rate within ±10 of canal rooms; heart lower | FAIL (out of band, not tuned) | 100% everywhere, see Calibration above |
| Bot: at most one boil-over in a median fight at heat 1-2; no median boil before round 3 | partial | heat 1-2 pass (0-0.4); heart's first boil is round 2 and in the phone check the heart forecast a full 12-pip boil in round 1 (the Steward's steam hall); recorded |
| Both outcomes (boil-over wins or loses a fight) occur | partial | boil-over often wins; none lost at 100% win rate |
| Phone: gauge strip, 7x9 board, three members, forecast, light and dark | pass (BH-12) | BH-12 shots; dark not rechecked here |
| Phone: bather dissolved and solid; attendant telegraph and crush | pass (BH-14) | `bh14-*.jpg` in `bathhouses-evidence/` |
| Phone: plunge card on the loot screen | pass | `bh18-plunge-card.jpg` (stakes "heat 2 to 1, your only pick" read before the pick) |
| Phone: Crossroads with heat copy | pass | `bh18-crossroads-heat.jpg` ("Next hall: heat 1, cooled by the plunge"); before the heart "as hot as it gets: heat 4" |
| Phone: the dome threshold | pass | `bh18-map-threshold.jpg`, `bh18-dome.jpg` (gauge strip, "Pressure 0 to 1") |
| Phone: map caption | pass | barred caption and "Try the lock" button on the map; opened node after solving (no bath art for `bath-dome`: generic solved tick) |
| Phone: footnote margins for the five subjects | pass (FU-12) | Desk at 375x812 with Vat, Seep, Steep, Bath salt, Fog jar each opened: no horizontal overflow, text wraps inside the frames, nothing clipped. Only the capstone frame showed (a synthetic save at 80 points, nothing written); the line slots were not seen. No layout fix needed. Also FU-11: the meter row sits 14px under board row 9 (Lab room 7x9, heat 4), no overlap |
| Svelte autofixer | n/a | no `.svelte` file changed |
| `pnpm check` | see Full check | |
| Golden fixtures unchanged | pass | check green |

### Full-loop phone check (375x812)

Map (heard, barred, "Try the lock") -> dome (gauge listed; `bh18-dome.jpg`) -> solved node on the map -> Set out sheet -> room 1 fight with the gauge (`bh18-room1-gauge.jpg`: pressure 0 to 4 forecast, vent warning ring, Feed tag) -> plunge card -> Crossroads with heat -> heart (`bh18-heart-steward.jpg`: Bath-Steward 14/14, "Steam hall" intent, forecast boil banner, Pressure 0 to 12, Next round pill, End turn confirm). No horizontal overflow (375/375), no console errors. Rooms 2-4 and the loot between them were driven by the engine (`release.test.ts` and a generated save), not tapped through; the dome was not played to a win in the browser (the unit test solves it).

### Out-of-band numbers (recorded, not tuned)

- Win rate 100% in every room for both bots (calibration above): easier than the canals.
- Heart: first boil round 2 in the sim; in the browser the opening forecast already reads Pressure 0 to 12 with the party outside the steam. The stoke and steam hall need to be smaller or later (end-of-build lever).
- Heart at full party HP with trip-worn HP unmeasured.

### Findings

- `Try the lock` is the shared map button label for every threshold district; it reads oddly for the dome.
- The heart's room id `bath-caldarium` duplicates room 4's `bath-caldarium` (heart title "The steward's caldarium"); integrity tests pass but a per-id lookup would collide.
- `intrusion` unwired (above).

### Rows for the orchestrator

- **DESIGN §11:** "Bathhouses open (BH-18). The dome (fill it with steam to the line) is the gate; rooms 1-4 and the Bath-Steward's heart are playable; the towel-bearer's landmark is in room 3. The steam-vent floor in the lower Seam (P12) is built but unwired until the floor check accepts a terrain."
- **TECH §7:** "Threshold battles list the rules their `ThresholdSpec` names (`thresholdStart`), so a district gauge appears in its gate room. `PLAYABLE_DISTRICTS` gains `bathhouses`. `lowerSeam.carriesIntrusion` only accepts pieces and rule-read terrain; vents need an `IntrusionSpec.terrain`."
- **ROADMAP:** done: BH-18 release. New items: wire the bathhouse floor (Seam owner: `IntrusionSpec.terrain`); calibration (win rates 100%, heart boils from round 1-2); per-threshold button label ("Try the lock"); give the heart a unique room id; bath-dome solved art; footnote margins phone check.
