# The ending: verification (EN-14)

Written 2026-11-20 for [ending-plan.md](ending-plan.md) §5 (Close row EN-14) and §6, from the build log rows (`grep -n 'EN-' build-program-log.md`), the test files on the branch and EN-14's own checks. One row per acceptance line. "pass" names the commit that carried the proof and the test file that holds the titles (every title below runs in the full gate at EN-14; no EN acceptance test is `it.todo` or `it.fails` any more). A phone check with no screenshot in the repo counts as not checked. Phone shots are headless Chromium (Playwright 1.63) at 375x812, scale 2, on the EN-14 branch's dev server (the build stamp reads 1e245ef, the branch's base, with EN-14's fixes in the working tree); saves were built from `tests/drawing/fixtures.ts` (`fullHousehold()` with the door seen and the handover undone, then done) by a scratch script outside the repo and put in the app's storage. **Dark: not applicable** (the app has no dark theme, DESIGN §11 2026-11-12).

## 1. Task acceptance

| Check | How | Result |
|---|---|---|
| EN-0: the bot in `src/engine/sim/`, same actions for the same state and budget; sims unchanged | Determinism test | pass (merge of 98a825e; tests/sim/bot-determinism.test.ts) |
| EN-W0: contracts and the acceptance file with every title | Contract file | pass (001e345; tests/drawing/acceptance.test.ts) |
| EN-S1: guardrails on 500 seeds, no cap overrun, same input same layout | Generator fuzz | pass (6c1ca8d; tests/sim/generator.test.ts) |
| EN-S2: walkovers rejected, the budget walks, a trio's budget is larger, no walkover offered while a fair attempt exists | Generator fuzz | pass (0d13e6e; tests/sim/generator.test.ts) |
| EN-G0: go | Design window 2026-11-17 | pass (P29; DESIGN §11 2026-11-17) |
| EN-W1: `GEN_LIMITS`, the registries, `storeDrawing`, `startTrip`'s page | Acceptance tests | pass (b5e4b25; tests/drawing/acceptance.test.ts) |
| EN-1: the ledger grows on return and wipe, not in the lab or bench, keeps opening order, round-trips | Ledger tests | pass (9526751; tests/run/ledger.test.ts) |
| EN-9: the nine mender scenarios | Scenarios | pass (98bbdfa, 913a793, 3c03d50; tests/scenarios/habits-mender.test.ts) |
| EN-5: each need greys its element with its sentence; the palette grows only with met content; pen parts sum; every offered combination generates | Palette tests | pass (218e771, the last title at 9acce50; tests/drawing/palette.test.ts, tests/drawing/generator.test.ts) |
| EN-2: `checkGenerated` green on every fixture seed; deterministic; foe distance; depth bands; zero unverified fallbacks | Generator tests | pass (1d7b646; tests/drawing/generator.test.ts) |
| EN-3: trips of length 3 and 6 start, reload, return and wipe; reload replays stored layouts; a redraw changes nothing; no hearing, heart, page or recruit | Module tests | pass (e7642c8, 5e07ca3; tests/districts/inkedPage/module.test.ts, tests/districts/inkedPage/trip.test.ts) |
| EN-8: offers only from source districts or basics; a held page never offered; solvents only from drawn districts | Loot tests | pass (4688dea; tests/drawing/loot.test.ts) |
| EN-4: worker results equal the synchronous path; the inking line when the worker is slower | Worker tests, phone | pass (b9e66a1; tests/app/generation.test.ts; en14-inking.jpg with `window.__inkDelay`). "No stall after a normal loot pick": not checked on the phone (headless timing is not the phone's; the player's iPhone timings are EN-G0's) |
| EN-7: map nodes under the Seam with 0, 1 and 3 pages and five floors; Set out for a drawn page | Map tests, phone | pass for 0 pages (the blank page, en14-map-desk-after.jpg), 3 pages and five floors (en14-map-three-pages.jpg) and Set out (en14-set-out.jpg); tests/app/city-map.test.ts (2ec391d). **Defect:** with the door row and three pages the column runs about 32 px past the page's foot (the third page sits on the torn edge), briefed as R9 item 1 |
| EN-6: the drawing table, empty, full, over budget, greyed rows, name field, locked | Table tests, phone | pass (d0f0508, 10ecea9; tests/app/drawing.test.ts; en14-table-empty.jpg, en14-table-full.jpg, en14-table-over.jpg, en14-table-greyed-need.jpg). Rows are never greyed for the pen: the pen shows as the pot turning red with "This costs 19 but the pen holds 14." (en14-table-over.jpg). The locked state: not shot at EN-14 (Pack H's shots in the log row) |
| EN-K1 to EN-K7: each frame passes `checkGenerated` over 50 seeds, its fallback has a scripted solve, the trial ends within its op budget; the kit extras | Kit tests | pass (156e45a, 602b976, 98ce693, 40a1b8a, ef59938, 15b2b6d, 20971cf; tests/drawing/kits-a.test.ts, kits-b.test.ts, kits-c.test.ts) |
| EN-K8: every element a full household can offer has a kit; dropped elements never offered; forwarding lays its address; the span piece needs nothing | Kit tests | pass (9acce50; tests/drawing/kits-a.test.ts, tests/drawing/acceptance.test.ts) |
| EN-K9, EN-K10: a drawn heart lists its master's rules; the trial lists the room's rules; a peal room is stored with its great bell | Honest-trial tests | pass (a41288c; tests/drawing/honest-trial.test.ts, tests/drawing/kits-c.test.ts). EN-14 found the peal *heart* hung no allied bells on a real trip (the tests built the input by hand); fixed in 19d2ecf, tests/drawing/en14-review.test.ts |
| EN-12, EN-G2: the handover text drafted and approved | Design window, player | pass (567a57c, 44e9cd1; DESIGN §11 2026-11-18) |
| EN-10: hidden before the door opens, idempotent, nothing lost, gifts only when missing; the door sheet and every scene page | Handover tests, phone | pass (076c1ee; tests/drawing/acceptance.test.ts, tests/ending/handover.test.ts; en14-map-door-before.jpg, en14-scene-1.jpg to en14-scene-6.jpg, en14-scene-close-gifts.jpg with Splash and Steam learned, en14-map-desk-after.jpg with "Visit the owner's desk") |
| EN-11: districts in opening order, the ledger counts; the skippable scroll and a replay from the codex | Credits tests, phone | pass (a0f2599; tests/drawing/acceptance.test.ts, tests/ending/credits.test.ts; en14-credits-mid.jpg, en14-credits-skip.jpg, en14-codex-ending.jpg, en14-codex-replay-desk.jpg, en14-codex-replay-credits.jpg, en14-codex-ending-trip.jpg) |
| EN-G1, EN-G3: playtest gates | Player | not checked: the player's playtests, never blocking |

## 2. Plan §6 sweep (phone states at Close)

| State | Shot | Result |
|---|---|---|
| The door row before the scene; "Visit the owner's desk" after it (Pack L had no shot of the second) | en14-map-door-before.jpg, en14-map-desk-after.jpg | pass; no horizontal overflow, no console error on any screen below |
| Every scene page and the gifted-pages line | en14-scene-1.jpg … en14-scene-6.jpg, en14-scene-close-gifts.jpg (en14-scene-gifts.jpg: a household that lacked nothing, no gift line) | pass |
| Credits mid-scroll and a skip; both codex replays | en14-credits-mid.jpg, en14-credits-skip.jpg, en14-codex-replay-desk.jpg, en14-codex-replay-credits.jpg | pass; Skip lands in the study and Back from the replayed scene on the map, whatever opened them (briefed, R9 item 3) |
| The drawing table: empty, full, over budget, greyed reasons (one need, one pen) | en14-table-empty.jpg, en14-table-full.jpg, en14-table-over.jpg, en14-table-greyed-need.jpg | pass (the pen reason is the pot's line, above) |
| The map with three drawn pages and the lower floors; Set out | en14-map-three-pages.jpg, en14-set-out.jpg | pass with the overflow defect above (R9 item 1) |
| "inking the room…"; a failed inking with Try again and Home | en14-inking.jpg (`__inkDelay`), en14-ink-failed.jpg (`__inkFail`) | pass |
| A generated 7x9 room with three apprentices | en14-room-7x9.jpg (The wet stair, room 3: current, eel, moth, rat; Draughtsman, Stoker, Lamp-pole runaway) | pass |
| One drawn heart per frame | en14-heart-marginalia.jpg, -mother, -lamplighter, -postmaster, -bathSteward, -chiefWarden, -carillonneur, -registrar | pass: each inked in the worker in 2.5-5 s headless and opened on its master with its banner, bar and escorts |
| The Codex's ending tab on a trip | en14-codex-ending-trip.jpg | pass ("Out on a trip: these open again in the study.") |
| svelte-autofixer on Handover, Credits, DrawingTable, Desk, Codex, Combat, Cleared, PagesSlot, StairSlot, DoorLine | Svelte MCP | clean, but two suggestions not taken: Combat's `$effect(() => game.ensureBattle())` starts the fight or the inking from the save (a side effect, not a derivation); Codex's `class:on` is the codebase's usual form |

## 3. Close checks

| Check | How | Result |
|---|---|---|
| Full gate, sims included | `pnpm check` on the branch at 1e245ef (2026-11-19) | pass: 435 files, 9304 passed, 2 skipped, 14 todo; one Biome warning (`PenPot.svelte` `over` unused: a false positive, `class:over` reads it). After the fixes, `pnpm check:fast` at 19d2ecf: 402 files, 8682 passed, 13 todo (the stale EN-4 todo deleted). The full gate again at 890a6ff: 24 tests in 13 sim and generator files timed out under load (1130 s against 359 s the first time, every failure a timeout); those 13 files then passed alone and one at a time (101 tests), so no failure stands |
| `code-review` at high, once per subsystem | (a) generator, (b) kits and frames, (c) the ending, on the files as they stand, plus the brief's known items | 27 findings (a 10, b 8, c 9): **fixed 8** in 19d2ecf, **briefed 16** (R8: 8, R9: 5, player questions: 3), **to CAL §1.1: 3**. Of the brief's seven known items, 3 were fixed (the door rule, the stale todo, the rival sheet's footnotes), 1 went to §1.1 (`MAP_PAGE_HEIGHT`, with the doorway weight already moved by CAL-D) and 3 were confirmed as intended (below) |
| Records | DESIGN §6.7 and §11, TECH §7, ending.md status, the plan's State line, ROADMAP BL-126 | pass (this commit) |
| Ledger | `ledger.mjs build-program-log.md ending-plan.md` | 28/32 merged; the four left are the gates EN-G0, EN-G2 (done), EN-G1, EN-G3 (playtests); no task open or "in prose only" |

**Fixed in place** (19d2ecf; each test fails before its fix): the handover re-derived the door rule, now one core `ownerDoor` (`src/engine/door.ts`) pinned by a test; the drawn peal heart hung no allied bells on a real trip (the lent hooks got the inner state instead of the drawn trip's own kit); a room the span choice changes was inked ahead before the choice was taken, so the choice did nothing (`inkableAhead`); `syncInker` could throw instead of reject; a request the worker could not clone failed instead of falling back; the battle's rival sheet ignored the household's footnotes (R7's proposal); the credits listed the owner before later recruits, read "by The owner" mid-sentence and held the tally line in the component; the stale EN-4 `it.todo` was deleted; the bells stamp's comments said what it did not do.

**Briefed** ([build-program-briefs.md](build-program-briefs.md)): R8, the generator and kits: piece reach guards run before the start points exist, the start-point reach guardrail, shared piece seeds, two lists of what a rule brings, trials playing past the round limit, the Hold gain counting fliers as falling, a zero loot weight throwing, the termed card offering a page already held. R9, the ending's screens: the map overflow, the credits scroll, replays returning to the wrong place, Clear resetting after a refusal, `storeDrawing` accepting what `readDrawing` drops. Player questions: the span choice before the heart changes nothing; the doorway's warning on a length-3 drawing; the credits listing a district opened without its heart (kept as approved).

**To calibration-plan §1.1:** the bot's weights and budgets, the generator's room shape literals, the kits' copied heart heat, pencil share and span caps, `DRAWN_LOOT.picks.heavy` (never read), the map's layout constants. `F2's doorway weight` was moved into data by CAL-D (3a2b99f).

**Confirmed as intended** (the brief's known items): `hurtByPulse` is exported for tests/districts/foundry/review.test.ts only (a normal test seam); the core offer kinds flagged `sandbox: true` are exactly what P16 and P17 let a drawn trip bank (pages, method pages, ink, solvents, vellum, the doorway); the cold plunge's `onBank` is a no-op by design (it buys a cooler next room, never rolls on a drawn trip: its `roll` checks `district === 'bathhouses'`, bathhouses/trip.ts:93); `window.__inkDelay` and `__inkFail` are read only under `import.meta.env.DEV` (game.svelte.ts:66).

## Notes

- Not checked, none a failed check: the drawing table's locked state at EN-14 (Pack H's shots), no stall after a loot pick on the player's phone (EN-G0's timings stand), save and reload in the middle of a drawn heart (tests/districts/inkedPage/trip.test.ts covers reload replay), EN-G1 and EN-G3.
- Copy decisions held for the player (worker-written, not in ending-text.md): the handover's close *"The owner takes a seat on the bench. The drawing table is on the desk."* and the Codex's *"Out on a trip: these open again in the study."*: kept as written. Cleared.svelte's *"The heart of the inked page is quiet"* stays a CAL copy item.
- The heart shots name the master by id ("Heart of carillonneur") because the fixture drawings are named that way, not the app.
