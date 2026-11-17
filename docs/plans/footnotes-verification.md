# Footnotes: verification (CL-3)

Written 2026-11-17 for [footnotes-plan.md](footnotes-plan.md) section 5, from the build log rows (`grep -n 'FN-' build-program-log-archive.md`) and the test files on main. One row per acceptance line. "pass" names the test file (re-run for this file, see the note at the end) or the commit that carried the proof. "not checked" means nothing on record can be pointed at: a phone check whose screenshots went to a scratchpad and were not saved in the repo counts as not checked. The district batches (bathhouses, bridges, canals, foundry, cartographers, ink) belong to their own plans and verification files; this file covers the footnotes plan's own tasks, which are all Seam content and the machinery.

| Check | How | Result |
|---|---|---|
| FN-0: contract types compile; existing tests green with old behaviour behind the new shape; handoff names invariants | Contract test | pass (5e7cb04; tests/engine/fn0-contracts.test.ts) |
| FN-1A: table of real behaviours without rows, each with a one-line firing case; no quota-filling | Audit document: 59 gaps | pass (1c9764b; docs/plans/footnotes-audit.md) |
| FN-1: thresholds per kind, no double count per run, Bench and Lab award none, costs, free re-pick, capstone without a witnessed line | Points and write rules | pass (f8baf32; tests/run/footnotes.test.ts) |
| FN-2: a solvent spent to zero keeps its page; scenario through loot and spend | `solventsFound` set by `returnHome` | not checked: no test spends a solvent to zero and then reads the page. Tests only set `solventsFound` (tests/run/footnotes.test.ts, tests/app/desk.test.ts), and the log row of 514d54d records only the golden diff (`solventsFound` added) |
| FN-3: existing footnote scenarios pass unchanged in effect | Ten level-I ids and hook sites pinned | pass (b9dcf9b; tests/engine/fn3-seam-runes.test.ts) |
| FN-4: app tests | Desk view model | pass (0bd01ed; tests/app/desk.test.ts, tests/app/desk-store.test.ts) |
| FN-4: phone check of all three frame states and a write at 375x812 | Log: locked, open and filled after a write | not checked: screenshots went to a scratchpad, none in the repo. The locked level II and capstone frames had no content to check |
| FN-5: Codex test | Codex margin | pass (98a4d58; tests/app/codex-margin.test.ts) |
| FN-5: phone check on the road and at home | Log: checked | not checked: no screenshot in the repo |
| FN-6: a written variant reads as written wherever its line is shown; Bench awards no points | `lineTextFor` and trial footnotes | pass (73ca132; tests/app/bench.test.ts, tests/app/codex-margin.test.ts) |
| FN-7: a Lab trial with a toggled variant shows its effect | Variant switch and reseat | pass (746c4df; tests/app/lab-variants.test.ts). The log says the phone check and autofixer were not run: not checked |
| FN-8: fixture rival note hidden, then offered, then credited | Rival note slot | pass (a5d53c2; tests/app/desk-rival-note.test.ts) |
| FN-9: each new row fires in a scenario; lines integrity test green | Ten Seam rows | pass (81e3446; tests/scenarios/footnote-lines-seam.test.ts, tests/data/lines.test.ts) |
| FN-10: as FN-9 | Method and solvent rows | pass (e70ac38; tests/scenarios/footnote-lines-methods.test.ts, tests/data/lines.test.ts) |
| FN-11: scenarios per aura with and without; re-pick does not corrupt Glyph records | Diagonal aura capstone | pass (257adec; tests/scenarios/aura-diagonal.test.ts, tests/run/aura-diagonal.test.ts) |
| FN-12: phone check, diagonal touches readable beside orthogonal ones | Log: checked with Coil, Steep and Afterglow capstones | not checked: no screenshot in the repo (geometry: tests/app/flowGeometry.test.ts passes, 0223e79). The RevisionEditor overlay with a capstone was not checked |
| FN-A1: every pair is two reasonable opinions; all 4 combinations read sensibly; guidance followed | Draft `docs/design/footnotes-content/seam.md` | pass (9a80d90; approved under FN-G1) |
| FN-A2: as FN-A1 | Same document | pass (9a80d90; approved under FN-G1) |
| FN-G1: every batch has approved text | Approved in place of the player's gate, rule of 2026-11-04 | pass (026d1ba) |
| FN-C1: a `fourCombos` scenario per margin line (Bolt, Shove) | Pilot batch | pass (f333816; tests/scenarios/footnotes/bolt.test.ts, tests/scenarios/footnotes/shove.test.ts) |
| FN-C2: as FN-C1 (Spark) | Spark variants | pass (544bae0; tests/scenarios/footnotes/spark.test.ts) |
| FN-C3: as FN-C1 (Ink, Oil) | 18 variants | pass (830ed71; tests/scenarios/footnotes/ink.test.ts, tests/scenarios/footnotes/oil.test.ts) |
| FN-C4: as FN-C1 (Steam, Brass) | 16 variants | pass (5f2b0d4; tests/scenarios/footnotes/steam.test.ts, tests/scenarios/footnotes/brass.test.ts) |
| FN-C5: as FN-C1 (Strike, Guard, Splash, Touch, Fork) | 28 variants | pass (f8dcf2e; tests/scenarios/footnotes/strikeGuard.test.ts, splash.test.ts, touch.test.ts, fork.test.ts) |
| FN-C6: one scenario per capstone; headline stays true (Seam runes) | 16 capstones | pass (729b568; tests/scenarios/footnotes/capstones.test.ts) |
| FN-C7: as FN-C6 (Ink, Oil, Steam, Brass, Spark) | 12 capstones | pass (76bec51; tests/scenarios/footnotes/capstones2.test.ts) |
| FN-C8: `fourCombos` and capstone scenarios through an invention | Conduct, Repeat, Margin: 18 variants | pass (b4cee43; tests/scenarios/footnotes/methods.test.ts) |
| FN-C9: as FN-C8 | Bind, Lift, Gallnut, Cinder: 28 variants | pass (44f43d3; tests/scenarios/footnotes/solvents-marks.test.ts) |
| FN-P1: thresholds kept or retuned in `tuning.ts`; DESIGN section 11 row | Player playtest gate | not checked: no playtest on record; thresholds stay 8/25/60 and 5/15/36 until calibration (the DESIGN row of 2026-11-17 says so) |

## Notes

- Re-run on 2026-11-17: every non-sim test file cited in the six close-out verification files, together: 112 files, 5327 passed, 12 todo. `tests/sim/` was not run; rows that cite a sim name the log row.
- Open items from the log rows, none a failed check: FN-1 left the home-only rule (P10) to FN-4, which built it; FN-4's "a subject with no points stays hidden" is an open question for the player; `VariantDef.rival` should use the `$data/rivals` `RivalId` (FN-8); the missing Seam lines `steam:unit` and `brass:unit` were stamped later by EN-9b and EN-9c, outside this plan.
- Autofixer: the log rows for FN-4 to FN-7 and FN-12 record no clean run. Not checked.
- Rules and accepted Proposals: DESIGN section 11, 2026-11-17 "Footnotes built (FN)".
