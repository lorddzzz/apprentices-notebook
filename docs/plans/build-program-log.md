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
| CG-3, CG-4 | 80bc1d9, 2b0a021, 127fb1a | Sonnet high | 0 | ~14% | Erase/Draw on paper, outlines ink in; line ids `erase:unit`, `erase:empty`, `draw:drop`, `quicksilver:drop` (new `Meets` members crash tsc: Map maximum size exceeded); Shove at empty pencil now legal; resumed after crash |
| EN-9b (partial) | 913a793, 2bffecc | Sonnet medium | 1 | ~12% | `mender:unit` stamped (golden-neutral); `mender:diagonal`/`dusk` rows removed, `steam:unit`/`brass:unit` rows pending (stamping changes the five Seam goldens); FN-M2 draft written; resumed after crash |
| C3-H | f3c4ee9, fbc3451 | Sonnet medium | 0 | ~6% | `markFooting`/`setMortar` named api writes with optional module hooks; `footnoteTouch` and the wear `shove` branch removed; `brinkLine` reads live state (flow.ts); mortar path has no dedicated no-shove test |
| CI-3 | (this commit) | Sonnet medium (orchestrator) | 0 | ~1% | red CI on 9ba0a5f: `tsc --noEmit` crashed (Map maximum size exceeded, `Meets` union); removed the unused `diagonal` and `dusk` members; tsc clean |
| CG-7 | 472f098 | Sonnet high | 0 | ~12% | the Registrar: token Y, page `registrar:pullIn`, circles in mark data then trick state, holder death checked at resolve/round end, module goals `rubOut`/`pullIn`; additive RivalId/EnemyId edits; tsc clean |
| CG-F1, CG-F2 | 50c656e | Sonnet high | 0 | ~12% | audit §13; new row `swap:unit` pending (stamp in CG-F3); `quicksilver:drop` text widened; draft cartographers.md (42 variants, note `registrar:erase`); Graphite-on-blank found, pinned it.fails; tsc clean |
| CG-9, CG-10 | 3062b50 | Sonnet medium | 0 | ~10% | six academy rooms (3 layouts each), heart frame salt 7160 (+7161 pencil scatter), bot term; `ROOM_PENCIL` data only (trip `roomSetup` owed); drawn-district tests exempt cartographers; tsc clean |
| CI-4 | 6fbe977 | Sonnet medium | 0 | ~3% | `LineId` = subject:string; literal-id scan test; `typecheck:ts` (warm 5 s) joins check:fast; one test cast widened |
| CG-3b, CG-F1b | d3513d7 | Sonnet medium | 0 | ~5% | `PieceTriggers.struckBy`; pencil and outline answer only Erase; `NoteCircle`/`circles` declared; Graphite skips blank |
| FN-M2c, EN-9c | 3c03d50 | Sonnet medium | 1 | ~6% | `steam:unit`/`brass:unit` stamps restored; `RECORD_GOLDEN=replay`; five Seam goldens re-stored (line, witnessed, met +'unit'); `mender:diagonal` + `Meets` 'diagonal'; dusk dropped; returned once for the `met` approval |
| FU-5b, FN-M2b | 792c786 | Sonnet medium | 0 | ~8% | 8 Afterglow + 8 Steam/Brass unit variants (new 'seam-unit' batch); `glowKept`, `dodge`, `collarLight` optional fields; `afterglow-water-fire` changed from sketch; count 277 |
| CG-8b, CG-13, CG-14, CG-16 | d620f76 | Sonnet medium | 0 | ~14% | ROOM_PENCIL applied via roomSetup; through-doorway → rewiring → room 4; bench + Lab scenarios; hearing (except form), gate at threshold; hall fuzz sim; `Meets` + pencil/blank/outline; bad-join paper unfiled |
| CG-F3, CG-F4 | 40c9853 | Sonnet medium | 0 | ~12% | 42 cartographers variants + `registrar:swap` note (household circles); `swap:unit` stamped; `swapAt` module hook; `graphite-cap-pin` holds 2; count 310 after the merge with V |
| CG-12 | 060bdfe | Sonnet medium | 1 | ~10% | hall art through the KIT-R2 slots, one circle mark for both sources, PaperFx, Gallery hall sheet; returned once for the full-file autofixer (clean, no change) |
| CG Close | 533caba | Opus high (design window) | 0 | ~12% | full gate green (9059 tests, sims); phone loop at 375x812 (10 screenshots, forced wins); code review: 5 material findings → Pack W; hall joins PLAYABLE_DISTRICTS, bad join filed by room 4 → Pack CG-K |
| CG-17, CG-18 | 958528f | Sonnet medium | 0 | ~4% | hall in PLAYABLE_DISTRICTS, SAVE-1 pair recorded over 01761c5, bad join filed by room 4 |
| FX-1, FX-2, FX-3, FX-4, FX-5 | c10252f | Sonnet medium | 0 | ~8% | strikePiece honours struckBy (bells, spans declare theirs); erase-mark-clean neighbour restore (`beside` part); collapseOnce keeps replayed wear; `Unit.riveted`; rival trick page text, doorway Done caption; cut by the 5h limit once, resumed |
| DEV-1 | 2ef8bbe | Haiku 5.5 high | 0 | ~3% | generator page mounts into #dev and scrolls; phone check at 375x812 (screenshot in build-program-evidence); real iOS Safari not checked |
| MET-1 | bf2a19f | Sonnet 5.5 medium | 0 | ~6% | five rules declare `met` (current, boilOver, return, bell, pencil); six canals goldens re-stored (+"current"); `metIn`/`learnFromFight` take an optional district so a lower-Seam floor never records the current |
| EN-W1 | b5e4b25 | Sonnet 5.5 high | 0 | ~9% | GEN_LIMITS, MASTER_HOME, GEN_KITS, HEART_FRAMES, storeDrawing, `page` option, 45 `it.fails` acceptance tests; sim summary identical (firstTry 0.448); Proposals: shared board helpers in kits/seam.ts, marginalia frame is a lazy stub |
| CL-1, CL-2, CL-3, CL-6 (record half) | c8ff91e..acf5028 | Sonnet 5.5 medium | 0 | ~8% | six DESIGN §11 rows, five TECH §7 rows, six verification files (screenshots outside the repo read "not checked"); SM-15 closed; CL-6 checks left to N2 |
| EN-6 (Pack H) | d0f0508, 10ecea9 | Sonnet 5.5 medium | 0 | ~17% (shared with E) | drawing table: `src/app/drawing.ts`, DrawingTable + four components, Desk link after the handover, route `drawing`; 7 phone screenshots in build-program-evidence (no dark theme); Proposals: at least one foe required, full rows greyed with a limit sentence; autofixer not run on Desk, Gallery, App |
| EN-2, EN-3 (Pack E) | 1d7b646, e7642c8, 5e07ca3 | Sonnet 5.5 high | 0 | ~24% (shared with H) | production generator with hearts from frames and the full oracle; `inkedPage` district (sandbox guards, snapshot, stored rooms, lent shape); gate: one frame test timed out under load, timeout raised (5e07ca3). Proposals accepted: `inkRoom` lives in generate.ts (import cycle: frames must read KIT lazily); `EN-2: unverified fallbacks are zero` covers the Marginalia only (lite bot needs 17-38 rounds for the lamp-mother vs 16): Pack I restores it; stand-in mother frame in tests/drawing/motherFrame.ts (Pack I deletes it) |
| EN-8 (Pack F2) | 4688dea | Sonnet 5.5 medium | 0 | ~7% | `loot.ts` derived offers + `DRAWN_LOOT`; Proposals: table returned as `guaranteed` specs over `lowerSeam`, doorway weight a local constant, `offersFor` has no profile (a held page may show as a second ink card) |
| EN-4, EN-7 (Pack G) | b9e66a1, 2ec391d, ebeeaec | Sonnet 5.5 medium | 0 | ~12% | generation worker + sync fallback, prefetch and the inking line; drawn pages under the Seam; BL-111: worker chunk precached in dist/sw.js (offline not checked in a real browser); MAP_PAGE_HEIGHT 1500 → 1900; 5 screenshots |
| EN-K1, EN-K2, EN-K3 (Pack I) | 156e45a, 602b976, 98ce693, + gate fix | Sonnet 5.5 medium | 0 | ~16% | Marginalia, lamp-mother, Lamplighter, postmaster frames with scripted solves; canals landings and ink-quarter writs/terms kits; the lamp-mother's hearts all reach the fallback (bot needs 17-22 rounds vs 16): CAL-4 watch; gate fix: Pack G and F2 tests imported the deleted motherFrame stand-in |
| EN-K4, EN-K5 (Pack J) | 40a1b8a, ef59938 | Sonnet 5.5 high | 0 | ~14% | bathhouses and bridges kits, Steward and Chief Warden frames; bot 50/50 first try, 0 fallbacks (trials never switch boil-over on); additive contract extras: `HeartFrame.masterInCloud`, `GenInput.choice`, `ShapeKit.adjust`, `RuleKit.stamp` 4th arg; extra foe and piece kits |

## Usage

| Time (CET) | 5h % | Weekly % | Action |
|---|---|---|---|
| 2026-11-13 | 33 | 65 | wave 14 merged (Q, CG-A, BF-J); fast gate green on main; wave 15 CG-C, CG-E, P running |
| 2026-11-13 | 64 | 69 | wave 15 merged (CG-C, CG-E, P); fast gate green (8190); CI green on 1239b6b; wave 16 CG-B, L running |
| 2026-11-13 | 86 | 72 | wave 16 merged (CG-B, L partial); fast gate green (8216); CI green on 7cfc883; H3 next |
| 2026-11-13 | 90 | 73 | H3 merged; CI red on 9ba0a5f (tsc crash) fixed in the next commit; Wrap zone, no new pack |
| 2026-11-16 19:40 | 63 | 88 | CG-D merged; CG-I running; CG-F next |
| 2026-11-16 19:55 | 66 | 89 | CG-I merged; CG-F running; design window due (review list ≥ 3) |
| 2026-11-16 20:05 | 6 (reset) | 71 | CG-F merged; CI green on 984a947; design window running; CG-G/CG-H wait for its briefs |
| 2026-11-16 20:30 | 23 | 74 | T, S merged; CG-G, U running; CG-J next |
| 2026-11-16 21:10 | ~50 | 77 | CG-G merged; CG-J, CG-H running; briefs empty after them |
| 2026-11-16 21:40 | ~67 | 79 | waves 19–21 merged (S, T, U, V, CG-G, CG-H, CG-J); briefs empty; cartographers Close next |
| 2026-11-16 22:25 | 5 (reset at ~22:10) | 1 | wave 22 merged (W, CG-K); fast gate green (8451); session ends, next session resumes |
| 2026-11-17 19:50 | 23 | 20 | wave 23 merged (DEV-1, MET-1, EN-W1, N1); fast gate green (8461 + 45 expected fail); E, H spawned |

| 2026-11-17 20:40 | 47 | 23 | waves 23-24 merged (E, H); fast gate green (8489); wave 25 spawned (I, G, F2) |

| 2026-11-17 21:15 | 72 | 27 | wave 25 merged (I, G, F2); fast gate green (8514); wave 26 held at Wrap |

| 2026-11-17 21:50 | 87 | 29 | Pack J merged; fast gate green (8533); K held (Hold) |
