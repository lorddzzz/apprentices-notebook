# Recruitment: verification (RC-9)

> Plan: [recruitment-plan.md](recruitment-plan.md) §6. Run on branch `worktree-agent-a13b044d3bab8d1ed` after RC-W0 to RC-8 and DK-18 were merged (base `fbbbf1c`). `pnpm check` green (192 test files, 6206 tests, 2 expected fails). No src changes.

## 1. Plan §6 checks

| Check | Result | Where |
|---|---|---|
| Static: every precondition rune has a guarantee source, page rooms before the landmark, door-arrival pages sourced | Pass (RC-5's integrity section for real placements); the sims add the same check on their fixture placements | `tests/data/integrity.test.ts`, `tests/sim/recruits.test.ts` ("fixture placements source every precondition rune") |
| Property fuzz, 500 cases by default (5000 also green): random reachable notebooks (known runes, joined recruits, heard and fresh districts, notes, named idiom, proven invention) x trip district x room x trip loot (pages, taken cards), rolled through the real offer registry with the recruit source on fixture placements | Pass, all four invariants | `tests/sim/recruits.test.ts` "RC-9 property fuzz" |
| (a) a waiting recruit's missing placed page is guaranteed | Pass. Checked against an oracle written from the plan (district lines naming the room; Seam pages in deep/heart for a placed, seen district or a door arrival): a guarantee exists iff a placed page is missing, it is one of them, it is in the offers, the table's Conduct stays first. "Eventually": taking each guaranteed page in turn empties the missing set in the same room | same |
| (b) the recruit card appears exactly when she is ready at her landmark | Pass: offered cards equal the oracle's (placed here, not home, not in loot, `isReady` at the landmark), never among the normal three | same |
| (c) nothing unrevealed in offers, shelf view models, codex rows, notes | Pass for every view model: `codexView`, `householdRows`, `seatsOf`, `benchOf`, `cardOf` for members, `notesUnderDoor`, and the offers (only her own card, when ready). **Fails for the campaign Lab** (bug 1), pinned by an `it.fails` | same, "RC-9 no-leak: the campaign Lab" |
| (d) readiness is monotone over banked runes and joined people | Pass (each case adds random runes and recruits, with and without trip/landmark) | same |
| Campaign bot, eager policy, real Seam and canals, real fights (`botFight`, stalled fight = wipe) | Pass on 50 seeds (`RECRUIT_BOT_SEEDS=50`): runaway joined after 3–11 trips (median 4), the Copyist's note 4–12 (median 6), always on a later homecoming; canals heard after 1–9 trips, first idiom 1–10; 0–6 wipes per campaign. Every roll on the way passes (a) and (b), every home passes (c) | "RC-9 campaign bot" |
| Campaign bot, random picks and returns, real wipes | Pass on 50 seeds x 8 trips: 794 rolls, 30 wipes, every roll holds (a) and (b) | same |
| Unbuilt recruits and the exile on DK-18's fixture rooms | Pass on 50 seeds (`RECRUIT_CAMPAIGN_SEEDS=50`). Eager: all seven join, worst seed 17 trips (bound 40), the Copyist after the runaway. Random picks with 20% wipes per room: (a), (b), (c) at every roll and home; at most one note per homecoming, only for someone ready, never on an evening someone joined | "RC-9 abstract campaign" |
| Met then hidden again (P2) | Pass: a runaway met with Fuse in the loot is hidden after the wipe, and Fuse is guaranteed again in room 1 | same |

**Runtime:** the file takes about 7–10 s in `pnpm check` (500 fuzz cases, 10 fixture campaigns, 2 bot campaigns). Heavy run (`RECRUIT_FUZZ_CASES=5000 RECRUIT_CAMPAIGN_SEEDS=50 RECRUIT_BOT_SEEDS=50`) about 3 min 15 s, all green. Base seed `RECRUIT_SIM_SEED` (9301) in `tests/sim/bot.ts`.

**What the sims abstract (read before trusting them):**
- The bot "solves" the canal lock with `solveThreshold` as soon as the canals are heard (the threshold is a desk puzzle outside the trip loop) and opens the map (`seeMap`) at every homecoming, so `city.fresh` never holds back the Seam's Touch for long. A player who never opens the map gets no Seam guarantee for the runaway (RC-3's accepted rule).
- The fixture campaign has no landings (home after any room), plays fights as wins or a 20% wipe, and hands over the two door beats a fight would bring (first idiom on trip 1, a proven invention on trip 2). The real campaign covers landings and real fights for the canals.
- Fixture placements: every unbuilt recruit stands in room 3 of DK-18's four rooms with her non-Seam pages in rooms 1–2; the exile's Board pages in the Cartographers' rooms 1–3. Each district build replaces these with its own data; RC-5's integrity test then covers them.

## 2. Phone checks (375x812, dev server on port 5190 from this worktree)

Screens in `/private/tmp/claude-501/-Users-olivera--claude-spares-spare-1E7r9h/21b013a0-9cac-4c1e-9438-0da298f3379b/scratchpad/rc9/` (saves built in the page through the engine, then played by tapping):

- `01-loot-recruit-card-light.jpg`: canals room 3 with Fuse and Touch known: three pages plus "Lamp-pole runaway, Someone joins you".
- `02-crossroads-carried-recruit-chip.jpg`: after taking her, the Crossroads lists her as a generic "✎ recruit" chip (rough edge 3).
- `03-trip-page-joined.jpg`: home: "Someone joined the household. Lamp-pole runaway came home with you and waits on the bench."
- `04-study-note-light.jpg`: runaway joined, Bonfire named, reloaded: the note under the door in the Study.
- `05-welcome-sheet-light.jpg`: "I read about the Bonfire you lit. May I come in?" with the Copyist's card, Not yet / Welcome in.
- `06-bench-after-welcome-light.jpg`: the bench with the runaway and the Copyist.
- `07-codex-household-light.jpg`: the Codex Household tab: the pair, the runaway "Met in the oil-lit canals", the Copyist "Came by a note under the attic door"; no unmet name in the page text; count unchanged at "10 / 84 known".

No horizontal overflow (`scrollWidth` 375). **Dark:** the app has no dark theme (no `prefers-color-scheme` anywhere in `src`), so dark emulation renders the same parchment; nothing to check separately. Console: one error on Welcome in (bug 2). Not checked: real iOS touch, the wipe screen with her card lost. The Svelte autofixer was not run (no component changed).

## 3. Bugs and rough edges found (not fixed)

1. **The campaign Lab names every unmet recruit** (P14, a request against HC's P16 that was never built). "Visit the Lab" is in the Study menu of a normal save, and `LabLineup.svelte`, `MemberPicker.svelte` and `LabKits.svelte` list `APPRENTICE_IDS` (all nine, with names and tokens). Pinned by `it.fails('BL-RC9-1: the campaign Lab lists only the household …')`, a source check on the three pickers (there is no app helper to call yet). Fix: an `app/lab.ts` `labRoster(p, devMode)` (household plus revealed in a campaign, the registry in dev/scenario mode) used by the three pickers; then flip the test to a real one on the helper.
2. **Welcome in throws** (`NoteUnderDoor.svelte` `welcome()`): `game.welcome(note.id)` removes the note, the `$derived` `note` becomes null, and the next line reads `note.name`: `TypeError: Cannot read properties of null (reading 'name')`. She does join (the bench shows her), but the "joins the household" toast never shows. Fix: read `id` and `name` from `note` before calling `game.welcome`. Not covered by a test (no component test harness for this).
3. **The carried recruit shows as a generic "✎ recruit" chip** on the Crossroads (`LootChips.svelte` has no recruit branch); it should show her token and name, since she is revealed once taken.

## 4. Status notes for the orchestrator

**DESIGN.md §6.1 (party):** "Built (RC, 2026-10-29): seven recruits in the registry. A district recruit stands at one landmark room ('someone joins you', an extra card after the three pages, costing the pick); she is trip loot: banked at home onto the bench with her page, lost on a wipe and offered again. Everyone is hidden until every precondition holds (story beat, school or habit rune, every starter-page rune; trip loot counts), and readiness is computed, never stored, so a page lost on a wipe hides her again until it is re-learned. Precondition pages are guaranteed (one per roll, after the table's own): a district's pages in its rooms before the landmark, Seam pages in the Seam's deep rooms once her district is placed and seen on the map. Door arrivals (the Copyist after the runaway and a first idiom; the erased student after Swap, Draw, Erase and a proven invention) knock with a note under the attic door, one per homecoming and never on the evening someone joined; a note stays until welcomed. The runaway stands at the canals' second landing with Fuse guaranteed in rooms 1–3. The Codex Household tab lists the revealed. Verified by sim: no soft-lock, no leak except the campaign Lab ([verification](docs/plans/recruitment-verification.md))."

**DESIGN §11 log:**
- P2: met then hidden again: a recruit's page lost on a wipe hides her until it is re-learned (default; open question 3 for the gate).
- P3: door notes latch, one per homecoming, none on a recruit's homecoming; a note may come after a wipe (open question 2, default yes).
- P4: "proven invention" = an invention cell in `TUNING.provenCasts` (5) proof masks of one apprentice (open question 1, default).
- P6: Seam guarantees only for a placed recruit whose district is heard and no longer `fresh` (RC-3's narrowing; keeps first trips unchanged).
- RC-8: the Household tab shows note-holders too (`isRevealed`), not joined only as P13 says (ask the player; default keep).

**TECH §7:**
- *`profile.recruits`:* `{ notes: ApprenticeId[] }`, optional (absent = none; golden and old saves unchanged); `parseRecruits` accepts door arrivals only, each once, none already in the household. Written by `knockAtDoor(p, recruitJoined)` from `goHome`, the wipe path in `endBattle`, and `settleAtDoor` on import and startup load; removed by `welcome`.
- *Recruitment engine:* `src/engine/recruits.ts`: `preconditionsOf` (typed runes plus starter-page runes outside `START_KNOWN`), `isReady(p, id, { trip, atLandmark })` (trip rune pages count), `waitingFor`, `guaranteesFor`, `recruitOffers`, `doorArrivals`, `welcome`, `isRevealed` (the only reveal test the UI may use). Placement data is `DistrictKitData.recruit` / `recruitPages` per district.
- *DK-R1 (offer contributors):* `OfferSource { kinds, contributors }` in `trip/offerKinds.ts`; RC's `RECRUIT_OFFERS` is one line in `OFFER_SOURCES` (`recruits/offers.ts`): the `recruit` kind (rolls after the normal three, one per apprentice per trip, banks via `joinHousehold`, no `onWipe`) and a contributor whose `must` (the guaranteed page) follows the table's guarantee. Contributors roll on their own seed (salt 5000 + room), so table draws never shift. `recruitOffersWith(kit)` builds the same source on fixture placements.
- *Sim:* `tests/sim/recruits.test.ts` (`RECRUIT_FUZZ_CASES`, `RECRUIT_CAMPAIGN_SEEDS`, `RECRUIT_BOT_SEEDS`; seed `RECRUIT_SIM_SEED` and the eager/random recruit policies in `tests/sim/bot.ts`).

**ROADMAP (BL-131):** RC built and verified 2026-10-29; RC playtest open (meeting the runaway at the second landing, declining once and taking her, a wipe with her in the loot, the Copyist's note; confirm P2, P3, P6, P7 and the three open questions). New follow-ups: campaign Lab lists every recruit (bug 1, `it.fails` BL-RC9-1); Welcome in throws and drops its toast (bug 2); recruit loot chip (rough edge 3); export the Seam page list from `engine/recruits.ts` (duplicated in the integrity test and the sim); tighten recruit save cards to the seven recruits (RC-4 follow-up); `TripRecap.joined` so the "joined" line survives a reload (RC-7 follow-up).

## 5. Placing your recruit (for district plans)

A district places its recruit with two data lines in its `src/data/districts/<id>.ts`, nothing else: `recruit: [{ apprentice: '<id>', room: <landmark, 0-based> }]` and `recruitPages: [{ for: '<id>', runes: [...] | any: [...], rooms: [...] }]`. List every precondition rune of hers that is not a Seam page (Touch, Splash, Steam, Brass come from the Seam's deep rooms) and not in `START_KNOWN` (`preconditionsOf(id).runes` prints them, page runes included), in rooms up to the landmark with at least one strictly before it; the landmark must be a room the district can reach on its first trips (a landing or checkpoint before a no-return stretch is kinder, P2). Her habit and action must already be registered (AH), or the integrity test fails. Nothing else is needed: the guarantee contributor, the "someone joins you" card, banking, wipe loss and the codex row all read these lines. Then run `tests/data/integrity.test.ts` (recruit section), move her out of the fixture kit in `tests/sim/recruits.test.ts` (or leave the fixture: the static check fails if it no longer matches the real placement), and re-record golden fixtures whose rolls now carry her guaranteed page (RC-5 did this for the Seam and canals).
