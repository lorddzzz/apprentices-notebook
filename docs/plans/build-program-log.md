# Build program log

Append-only, one line per merged task. Each task's detail is in its commit body: `git log --grep '<ID>'`.
Everything merged before 2026-11-11 (FD, DK, HC, AH, RC, RV, FN, CN, SM, IQ, BH, BR, BF-0 to BF-2; its reports, usage readings, proposals and decisions) is in [build-program-log-archive.md](build-program-log-archive.md): never read it whole, grep it for an ID. The ledger counts those tasks from their commit messages.

## Tasks

Returns "–" means the row did not record it. Usage Δ was not recorded before 2026-11-13.

| ID | Commit | Model / effort | Returns | Usage Δ | Note |
|---|---|---|---|---|---|
| GATE-1 | 7cc4e66 | Sonnet medium | 0 | – | split typecheck, check:changed, sims moved |
| BR-20, BR-7 | d63d64e, +fix | Sonnet medium | 0 | – | one commit for both; bench.ts RIVALS filter fixed by orchestrator |
| KIT-R2 | 3423901 | Sonnet medium | 0 | – | registry slots; logic.ts holds component-free slots; autofixer only run on RoomBonus, Seam/Foundry no Lab scenario |
| EN-0 | merge of 98a825e | Sonnet medium | 0 | – | src/engine/sim, runTrip injected flow; calibration timeouts raised |
| IQ-F1, IQ-F2 | 62579fb, 0bd06c3 | Sonnet high | 0 | – | audit §11 + draft; fires tests it.fails until IQ-F3 stamps |
| SAVE-1 | 2dbbce8 | Haiku high | 0 | – | 10 fixtures, recorded at 89f498b; canal-rooms timeout closed obsolete |
| BF-3, BF-4, BF-5 | 72e8b7f, 3eb1d0d, 1fb3f26 | Sonnet high | 0 | – | P18-P20 built; proposals in status |
| EN-W0 | 001e345 | Sonnet high | 0 | – | ending contracts + acceptance todos; optional profile fields |
| KIT-R1 | dec8acf | Sonnet medium | 0 | – | unsupported/afterBattleClose/bindsBeforeOpen hooks; lint rule exempts sim/bot.ts until KIT-R3b |
| BF-6, BF-7, BF-8 | 1742421 (6+7), c65f7b1 | Sonnet medium | 0 | – | foes, great bells; touched damage.ts one line |
| IQ-F3, IQ-F4, IQ-F5 | 300e481, 7d8aa8d, 87d09e8 | Haiku high | 0 | – | ink footnotes built; 7 proposals in status |
| KIT-R3a | 8263248 | Sonnet medium | 0 | – | ink heart frame exemplar (heart.ts pattern); ink bot is {} |
| BF-9, BF-24 | 4e0e89c, 089473c | Sonnet high | 0 | – | Carillonneur rival; touched data/types, enemies, footnotes index and 3 tests |
| KIT-R4 | de088cb | Sonnet medium | 0 | – | members read from household; phone-checked 2 screens; autofixer on stub only |
| BF-10, BF-11 | df10e08, 68524b5 | Sonnet medium | 0 | – | foundry rooms 1-4 with scripted solves |
| KIT-R3b–e | 280f9f3, 042a3b9, 2dc1f64, 063bce9 | Sonnet medium | 0 | – | heart frames for 4 districts + frame.ts helper |
| EN-5 | 218e771 | Sonnet medium | 0 | – | palette, pen, cost, checkDrawing |
| KIT-R3f, KIT-R3g | 538d03c, d266a3e | Sonnet medium | 0 | – | lent shapes, botValue, sim/bot.ts free of districts, lint exemption gone; sims same status |
| EN-S1 | 6c1ca8d | Sonnet high | 0 | – | generator spike; rooms are walkovers (warning); dev page |
| BF-12, BF-13 | 170837a, 45c216f | Sonnet medium | 0 | – | foundry heart, loot, tuner, text |
| BF-14, BF-15, BF-16 | 4127679, 6320e44, eec836e | Sonnet medium | 0 | – | foundry solved art, far bell, lower-Seam floor; goal is `happens foundry:ring`, decoy muffled |
| EN-S2 | 0d13e6e | Sonnet high | 0 | – | two-sided judge and budget walk at default GEN_TUNING; walkovers 83 % to 5.6 %, dull 28/500 (P28's 98 % fair not met); EN-S1 guardrails test setup uses walked budget |
| BR-19a, BR-19b | d39aa96, bbf7b32 | Sonnet medium | – | – | bridges footnotes; brink-cap-fall and chalk-network-ring NOT built (need a dusk carrier and an api reader); wider edits than briefed; pending design review |
| CG-W0 | fa1876d | Sonnet high | 0 | – | cartographers contracts: types, stub threshold, six loot tables, 59 `it.todo` acceptance titles, HAND_SALT 8100; `kit.ts` module line NOT added (two tests mock a fixture under id 'cartographers') |
| BL-110 | 0ffa10b | Sonnet medium | 0 | – | shared registrar `tests/scenarios/engine-suites.ts`; both files were already under 20 s alone (the plan's 50 s did not reproduce); execution still one run per file (a cache or globalSetup would need a config change); both deliberate breaks fail the guards |
| BF-17, BF-19, BF-18 | 038eba7, a9dae1d, 5385674 | Sonnet medium | 0 | – | foundry art, fx, bench met keys, tune banner, heart fixture; phone-checked light only (no dark theme exists, Close sweep); edits outside owned list: app/fx, view, timing, lab, bench, ui/districts/logic, engine foundry types, `Meets` gains bell and rope |
| FU-13, FU-14, FU-15 | none (no code change) | Sonnet medium | – | – | verified, nothing to fix: autofixer clean on Map, Cleared, SetOutSheet (trimmed markup); margin card and Marginalia 16/16 fit at 375x812 light; no screenshot files saved; FU-16 NOT done (no dark surface tokens exist; ink-quarter fixture trip rejected as invalid save) |
| FU-9, FU-10, FU-11, FU-12 | see `git log --grep 'FU-'` | Sonnet medium | 0 | – | threshold label from `DistrictUi.thresholdLabel` ("Open the vent"), BathDome solved art; FU-11 and FU-12 verified, no fix (FU-11 in the Lab, not a real heart trip; FU-12 synthetic save showed only the capstone frame, not line slots); dark unchecked (no dark theme); DistrictNode not run through autofixer |
| BF-20, BF-22 | a8bd59a, 139c416 | Sonnet medium | 0 | – | foundry bot term, loot ids, kit merges (rooms, heart, threshold, intrusion), gate and PLAYABLE_DISTRICTS, save pair, rung-bell discard test; bot never wins room 4 or the heart headless (CAL-4); six existing tests that assumed the foundry unopened were edited (city, districts, bf0-contracts, lower-seam-trip, recruits-guarantees) |
| BL-111 | c0e4a1d | Sonnet medium | 0 | – | Lab and Gallery split into chunks via `{#await import}` in App.svelte; main chunk 1094.6 to 1058.4 kB (gzip 343.7 to 332.5), precache 20 to 24 entries; offline service-worker check NOT done (Browser pane refuses SW registration); >500 kB advisory remains; autofixer and check:fast not run |
| MIX-1 | 168494e | Sonnet medium | 0 | – | 15 rule pairs x 3 tests; 41 pass, 4 `test.fails` (KNOWN_FAILS): seam hands x boil-over, bells, writs, current fail "projection equals final state" on endTurn (projected Marginalia keeps telegraph intent or `born` false; engine has intent null / born true) |
| FU-17, FU-18, FU-19, FU-20 | see `git log --grep 'FU-1[789]\|FU-20'` | Sonnet medium | 0 | – | canal fuzz (3 passed, 28 s); cap sweeps found a real bug (`openJar` cleared `tile.jar` before `jarOpened`, fixed in jars.ts); restore picks nearest free tile and displaces so no two units share one (restore lives in `undoBoard`, solvents.ts); recruit parse accepts RECRUITS keys only; edits outside owned list: jars.ts, solvents.ts, tests/engine/offer-kinds.test.ts (DK-7 card `stoker` to `runaway`); FU-19 "or reports it" has no event type |
| FU-6, FU-7, FU-8 | c9d5a30 4e00f95 89cf18d, bc3b8a3, 2ac4006 | Sonnet medium | – | – | thermae vent floor via `IntrusionSpec.terrain` (BATH_INTRUSION wired into the kit), boilerman vent puffs over a state (replaces it), plan/preview take footnotes; extra ownership granted by the orchestrator: districts/index.ts, lowerSeam.ts `carriesIntrusion`, districts/types.ts, behaviours.ts, overlay.ts; "its floor stays unwired" test now expects BATH_INTRUSION; 1 return (blocked once, then granted) |
| FU-1 | 3bc0fa0 | Sonnet medium | 0 | – | `CrossroadsChoice.note` and the bridges span note; note is merged into the way's second line (run-on); WayView/CrossroadsChoices.svelte render as own line not done (files not owned); autofixer clean; check:fast 342 files green |
| BR-19c | 8a34f7f, 0c5af97 | Sonnet high | 0 | – | brink-cap-fall (`'brink'` scheduled kind, awaitFall/replayFallen/lapseFallReplays) and chalk-network-ring (`BridgesState.fallenBrass`, api reader and spend); brinkOutcome/fogWard moved to runes/brink.ts; 13 tests tests-first; check:fast green 343 files 7896 tests |
| EN-1, EN-9, C3b-owed | 9526751, 98bbdfa, 56387a8 | Sonnet medium | 0 | – | feedLedger on return and wipe (goldens compared via noLedger, P26); owner entry + mender (`networkGap` on brass/cloud/oil/sameState nets; also marks and bath salt); pitched brink guard; accepted: recruits.test.ts expects owner last; only `mender:unit` fine-print row (pending); check:fast 345 files 7930 tests |
| FU-21 | 736bcce | Haiku high | 0 | – | wax-cloud-smother reads a cloud on any 4-neighbour of the bearer; four ink texts; test-local `inv:recoil-wax` def |
| BF-F1 | e6e3c78 | Sonnet high | 0 | – | audit §12 + draft foundry.md (15 pairs + note); pending rows toll/coil/unison/filings:bell with it.fails; `toll:network` replaced by `toll:bell` (in contract) |
| FU-2, FU-3, FU-4, FU-5 (partial) | de0c7fe, 030e78c, 6771037, 452d9bc | Sonnet medium | 0 | – | LockLost met/spent; jar events carry optional id (`jarFate.ts`, golden compares via noJarIds); TrickDef.causes into KIT.causes; `afterglow:cloud` row (reuses `miss`); extra files accepted: jars.ts, mix.ts, districts/registry.ts, bridges/collapse.ts, bridges/heart.ts |
| CI-1, CI-2 | 88b6175, 009d49c, fbe0b17, 9dd36ad | Sonnet medium | 0 | – | sims stale since F9: household-sweep `withParty` lacked foundry in heard/open (no engine change); placement and CN-13 timeouts raised (load-driven); AH-8 fuzz skips the owner's `mender`; full check green in worktree |
| BF-FG | (design window 2026-11-12e) | Opus 5.5 high (orchestrator) | 0 | – | foundry footnote draft approved as written; F1 note kept whole, F2–F7 accepted, Q4/Q5 plain rules as built (DESIGN §11) |
| RV-20b, FU-1 | f637ab7, e2e5f5f, 4d7a2d4 | Sonnet medium | 0 | ~10% | Jar note lets the planned walk cross a step-jar (`planRival` takes optional footnotes; resolve.ts passes ctx.footnotes); crossroads card note line; `simulate` still runs with empty footnotes |
| CG-1, CG-2 | dc67c6a, 12a9699, 90bf5a6 | Sonnet high | 0 | ~15% | paper pieces, `pieceVoid`, kit registration, guild's hand; two rules (district hand + piece-scoped pencil), optional seed, `holds: 'none'` guards in mix.ts/jars.ts |
| BF-F2, BF-F3 | b071e86, fd8eb8f | Sonnet medium | 0 | ~15% | 29 foundry variants stamped (Toll, Coil, Unison, Rivet, Filings), Carillonneur note at toll:bell II; api.ts re-exports, `Scheduled.again`, `BellsState.carried` added |
| CG-5, CG-6 | 0934afa, cb58f65 | Sonnet high | 0 | ~10% | Surveyor, Eraser, Tracer; third rule `cartographers:tracer` (units have no data field); `EnemyId` gains three ids; no priority flag exists; `undrawPencil` local to foes.ts (CG-B shares it) |
| CG-8, CG-11 | 394a93c, bf0948d | Sonnet medium | 0 | ~10% | trip shape (`ret`/`checkpoint` after: 2 = after room 3, 0-based; brief said 3), six loot tables, drafting-table threshold with lay-figure variant; new `{ reach, byRound? }` goal kind |
| MIX-F1, FU-5 | b5dbc24, d24b7a5 | Sonnet medium | 0 | ~8% | seam hand clears its telegraph in the projection, transient `handWrites` flag for born brass; `afterglowSpent`, `afterglowDrifts`, lines `afterglow:spent`/`water`; `Meets` gains `spent`; draft pairs for cloud and water only |

## Usage

| Time (CET) | 5h % | Weekly % | Action |
|---|---|---|---|
| 2026-11-13 | 33 | 65 | wave 14 merged (Q, CG-A, BF-J); fast gate green on main; wave 15 CG-C, CG-E, P running |
| 2026-11-13 | 64 | 69 | wave 15 merged (CG-C, CG-E, P); fast gate green (8190); CI green on 1239b6b; wave 16 CG-B, L running |
