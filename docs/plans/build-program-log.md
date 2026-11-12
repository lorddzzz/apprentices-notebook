# Build program log

Append-only, one line per merged task. Each task's detail is in its commit body: `git log --grep '<ID>'`.
Everything merged before 2026-11-11 (FD, DK, HC, AH, RC, RV, FN, CN, SM, IQ, BH, BR, BF-0 to BF-2; its reports, usage readings, proposals and decisions) is in [build-program-log-archive.md](build-program-log-archive.md): never read it whole, grep it for an ID. The ledger counts those tasks from their commit messages.

## Tasks

| ID | Commit | Model / effort | Returns | Usage Δ | Note |
|---|---|---|---|---|---|
| GATE-1 | 7cc4e66 | Sonnet medium | split typecheck, check:changed, sims moved; 0 returns |
| BR-20, BR-7 | d63d64e, +fix | Sonnet medium | one commit for both; bench.ts RIVALS filter fixed by orchestrator; 0 returns |
| KIT-R2 | 3423901 | Sonnet medium | registry slots; logic.ts holds component-free slots; autofixer only run on RoomBonus, Seam/Foundry no Lab scenario; 0 returns |
| EN-0 | merge of 98a825e | Sonnet medium | src/engine/sim, runTrip injected flow; calibration timeouts raised; 0 returns |
| IQ-F1, IQ-F2 | 62579fb, 0bd06c3 | Sonnet high | audit §11 + draft; fires tests it.fails until IQ-F3 stamps; 0 returns |
| SAVE-1 | 2dbbce8 | Haiku high | 10 fixtures, recorded at 89f498b; canal-rooms timeout closed obsolete; 0 returns |
| BF-3, BF-4, BF-5 | 72e8b7f, 3eb1d0d, 1fb3f26 | Sonnet high | P18-P20 built; proposals in status; 0 returns |
| EN-W0 | 001e345 | Sonnet high | ending contracts + acceptance todos; optional profile fields; 0 returns |
| KIT-R1 | dec8acf | Sonnet medium | unsupported/afterBattleClose/bindsBeforeOpen hooks; lint rule exempts sim/bot.ts until KIT-R3b; 0 returns |
| BF-6, BF-7, BF-8 | 1742421 (6+7), c65f7b1 | Sonnet medium | foes, great bells; touched damage.ts one line; 0 returns |
| IQ-F3, IQ-F4, IQ-F5 | 300e481, 7d8aa8d, 87d09e8 | Haiku high | ink footnotes built; 7 proposals in status; 0 returns |
| KIT-R3a | 8263248 | Sonnet medium | ink heart frame exemplar (heart.ts pattern); ink bot is {}; 0 returns |
| BF-9, BF-24 | 4e0e89c, 089473c | Sonnet high | Carillonneur rival; touched data/types, enemies, footnotes index and 3 tests; 0 returns |

## Usage

| Time (CET) | 5h % | Weekly % | Action |
|---|---|---|---|
| KIT-R4 | de088cb | Sonnet medium | members read from household; phone-checked 2 screens; autofixer on stub only; 0 returns |
| BF-10, BF-11 | df10e08, 68524b5 | Sonnet medium | foundry rooms 1-4 with scripted solves; 0 returns |
| KIT-R3b–e | 280f9f3, 042a3b9, 2dc1f64, 063bce9 | Sonnet medium | heart frames for 4 districts + frame.ts helper; 0 returns |
| EN-5 | 218e771 | Sonnet medium | palette, pen, cost, checkDrawing; 0 returns |
| KIT-R3f, KIT-R3g | 538d03c, d266a3e | Sonnet medium | lent shapes, botValue, sim/bot.ts free of districts, lint exemption gone; sims same status; 0 returns |
| EN-S1 | 6c1ca8d | Sonnet high | generator spike; rooms are walkovers (warning); dev page; 0 returns |
| BF-12, BF-13 | 170837a, 45c216f | Sonnet medium | foundry heart, loot, tuner, text; 0 returns |
| BF-14, BF-15, BF-16 | 4127679, 6320e44, eec836e | Sonnet medium | foundry solved art, far bell, lower-Seam floor; goal is `happens foundry:ring`, decoy muffled; 0 returns |
| EN-S2 | 0d13e6e | Sonnet high | two-sided judge and budget walk at default GEN_TUNING; walkovers 83 % to 5.6 %, dull 28/500 (P28's 98 % fair not met); EN-S1 guardrails test setup uses walked budget; 0 returns |
| BR-19a, BR-19b | d39aa96, bbf7b32 | Sonnet medium | bridges footnotes; brink-cap-fall and chalk-network-ring NOT built (need a dusk carrier and an api reader); wider edits than briefed; pending design review |
| CG-W0 | fa1876d | Sonnet high | cartographers contracts: types, stub threshold, six loot tables, 59 `it.todo` acceptance titles, HAND_SALT 8100; `kit.ts` module line NOT added (two tests mock a fixture under id 'cartographers'); 0 returns |
| BL-110 | 0ffa10b | Sonnet medium | shared registrar `tests/scenarios/engine-suites.ts`; both files were already under 20 s alone (the plan's 50 s did not reproduce); execution still one run per file (a cache or globalSetup would need a config change); both deliberate breaks fail the guards; 0 returns |
| BF-17, BF-19, BF-18 | 038eba7, a9dae1d, 5385674 | Sonnet medium | foundry art, fx, bench met keys, tune banner, heart fixture; phone-checked light only (no dark theme exists, Close sweep); edits outside owned list: app/fx, view, timing, lab, bench, ui/districts/logic, engine foundry types, `Meets` gains bell and rope; 0 returns |
| FU-13, FU-14, FU-15 | none (no code change) | Sonnet medium | verified, nothing to fix: autofixer clean on Map, Cleared, SetOutSheet (trimmed markup); margin card and Marginalia 16/16 fit at 375x812 light; no screenshot files saved; FU-16 NOT done (no dark surface tokens exist; ink-quarter fixture trip rejected as invalid save) |
| FU-9, FU-10, FU-11, FU-12 | see `git log --grep 'FU-'` | Sonnet medium | threshold label from `DistrictUi.thresholdLabel` ("Open the vent"), BathDome solved art; FU-11 and FU-12 verified, no fix (FU-11 in the Lab, not a real heart trip; FU-12 synthetic save showed only the capstone frame, not line slots); dark unchecked (no dark theme); DistrictNode not run through autofixer; 0 returns |
| BF-20, BF-22 | a8bd59a, 139c416 | Sonnet medium | foundry bot term, loot ids, kit merges (rooms, heart, threshold, intrusion), gate and PLAYABLE_DISTRICTS, save pair, rung-bell discard test; bot never wins room 4 or the heart headless (CAL-4); six existing tests that assumed the foundry unopened were edited (city, districts, bf0-contracts, lower-seam-trip, recruits-guarantees); 0 returns |
| BL-111 | c0e4a1d | Sonnet medium | Lab and Gallery split into chunks via `{#await import}` in App.svelte; main chunk 1094.6 to 1058.4 kB (gzip 343.7 to 332.5), precache 20 to 24 entries; offline service-worker check NOT done (Browser pane refuses SW registration); >500 kB advisory remains; autofixer and check:fast not run; 0 returns |
| MIX-1 | 168494e | Sonnet medium | 15 rule pairs x 3 tests; 41 pass, 4 `test.fails` (KNOWN_FAILS): seam hands x boil-over, bells, writs, current fail "projection equals final state" on endTurn (projected Marginalia keeps telegraph intent or `born` false; engine has intent null / born true); 0 returns |
| FU-17, FU-18, FU-19, FU-20 | see `git log --grep 'FU-1[789]\|FU-20'` | Sonnet medium | canal fuzz (3 passed, 28 s); cap sweeps found a real bug (`openJar` cleared `tile.jar` before `jarOpened`, fixed in jars.ts); restore picks nearest free tile and displaces so no two units share one (restore lives in `undoBoard`, solvents.ts); recruit parse accepts RECRUITS keys only; edits outside owned list: jars.ts, solvents.ts, tests/engine/offer-kinds.test.ts (DK-7 card `stoker` to `runaway`); FU-19 "or reports it" has no event type; 0 returns |
| FU-6, FU-7, FU-8 | c9d5a30 4e00f95 89cf18d, bc3b8a3, 2ac4006 | Sonnet medium | thermae vent floor via `IntrusionSpec.terrain` (BATH_INTRUSION wired into the kit), boilerman vent puffs over a state (replaces it), plan/preview take footnotes; extra ownership granted by the orchestrator: districts/index.ts, lowerSeam.ts `carriesIntrusion`, districts/types.ts, behaviours.ts, overlay.ts; "its floor stays unwired" test now expects BATH_INTRUSION; 1 return (blocked once, then granted) |
