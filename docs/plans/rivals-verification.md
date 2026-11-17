# Rivals: verification (CL-3)

Written 2026-11-17 for [rivals-plan.md](rivals-plan.md) section 5, from the build log rows (`grep -n 'RV-' build-program-log-archive.md`) and the test files on main. One row per acceptance line. "pass" names the test file (re-run for this file, see the note at the end; sim files are not re-run) or the commit that carried the proof. "not checked" means nothing on record can be pointed at: a phone check whose screenshots went to a scratchpad or a tool-results folder and were not saved in the repo counts as not checked.

| Check | How | Result |
|---|---|---|
| RV-W0: `pnpm check` green; TECH row; later RV tasks write only inside the contracts | Contract test; TECH section 3 "Authoring a rival" and the 2026-11-17 RV row | pass (94a0c53; tests/engine/rv0-contracts.test.ts) |
| RV-1: a board with `L` builds, clones and serialises; pinned intents resolve | Rival units | pass (4ba4146; tests/engine/rv1-rival-units.test.ts) |
| RV-2: displaced caster casts a parallel line; a moved apprentice is not followed; a partial chain keeps its effects; full starvation strikes only a pre-shown, occupied, adjacent tile; stun, death and dry charges never strike | Locked-aim scenarios | pass (324cba6; tests/scenarios/rivals.test.ts) |
| RV-3: scenarios for each failure case, drift, self-harm and "placed and opened the same turn is illegal" | Long wick as an object lock | pass (232b3be; tests/scenarios/rival-wick.test.ts) |
| RV-4: same state gives the same plan (property test); the real state is untouched; the rng state is unchanged | Planner properties | pass (da6478a; tests/engine/rivals-plan.test.ts) |
| RV-5: the desired scene plays: lantern, herd back onto it, wick shown and opened, his own trap catches him; he never detonates harmlessly; he lays a trap with no jar | Lamplighter scenarios | pass (90db8c9; tests/scenarios/lamplighter.test.ts) |
| RV-6: moving or blocking the caster changes the preview, not the aim; a jar's drift moves the wick highlight | Rival preview | pass (43b67f0; tests/engine/rival-preview.test.ts) |
| RV-7: phone check 375x812 with screenshots (lantern, herd, wick, fallback, unknown line); autofixer clean | Rival telegraph on the board | not checked: no screenshot in the repo and the log row records no autofixer run (logic: tests/app/rival-telegraph.test.ts, 03f4563) |
| RV-8: readable at phone size; never shows unwitnessed fine print | Rival sheet | not checked for phone size: the capture is in a tool-results folder, not the repo. Unwitnessed fine print: pass (9885b9b; tests/app/rival-sheet.test.ts) |
| RV-9: both scenarios open from `#/lab?scenario=...`, play to a win and a loss | Lab scenarios | pass (5daae88; tests/scenarios/lamplighter-lab.test.ts) |
| RV-10: suite green in `pnpm check` | Fuzz and planner properties, `RV_FUZZ_SEEDS` default 20 | pass (a74deb6; tests/sim/lamplighter-fuzz.test.ts, tests/sim/lamplighter-plan.test.ts; log: 200 seeds passed before the gate) |
| RV-G1: player sign-off, or a list of changes fed back into RV-5 and RV-2 | Playtest gate | not checked: no playtest on record. The open rule questions were answered in DESIGN section 11, 2026-11-12 "Design round on the open questions" |
| RV-11: the Lamplighter suite unchanged after re-expression; hooks unit-tested | Trick hook registry | pass (bf02e10; tests/rivals/tricks.test.ts, tests/scenarios/lamplighter.test.ts) |
| RV-12: same plans as before on the RV-10 suite | Goal registry | pass (d4bf3c6; tests/rivals/goals.test.ts) |
| RV-13: the gallery shows all five fixture tricks at 375x812 | Trick banner and gallery part | not checked: no screenshot in the repo (7cb3c73) |
| RV-14: every fixture needs no engine edit outside the hooks; any gap fixed in the API or filed | Five fixture rivals | pass (2c71ba3; tests/rivals/fixture-rivals.test.ts) |
| RV-15: engine tests for won, wiped, repeat and stand-in cases | Page banking | pass (71f8b07; tests/engine/rival-pages.test.ts) |
| RV-16: scenario tests for each rule in rivals section 3 | Rival credit | pass (8b8799f; tests/engine/rival-credit.test.ts) |
| RV-17: phone check; the trick is marked excluded; owned and missing parts are correct | Codex Pages tab | not checked: the log says phone-checked but no screenshot is in the repo (742dcd8). Parts and "Excluded": pass (tests/app/codex-rivals.test.ts) |
| RV-18: the profile is unchanged except D4 witnessed lines; no wick in the trial; phone check | Bench page trial | pass for profile and wick (158949b; tests/app/bench-page-trial.test.ts). Phone check: not checked, no screenshot in the repo |
| RV-19: ordinary ink and ownership errors appear; nothing is unlocked | Copy to the Study | pass (69f8113; tests/app/rival-copy.test.ts) |
| RV-20: hidden until the page is held; still needs the slot's level and solvents | The Lamplighter's Jar note | pass (7048e01, f89509c; tests/engine/rv20-rival-note.test.ts, tests/scenarios/jar-wick-note.test.ts) |

## Notes

- Re-run on 2026-11-17: every non-sim test file cited in the six close-out verification files, together: 112 files, 5327 passed, 12 todo. `tests/sim/` was not run; rows that cite a sim name the log row.
- RV-20b: the planner ignores jars when the Jar note is written (decided 2026-11-12, DESIGN section 11). Built at f637ab7 and f89509c; checked by tests/scenarios/jar-wick-note.test.ts.
- Open follow-ups from the log rows, none a failed check: the Codex page has no read-only wiring drawing, no rune headlines and no rival-note link (RV-17); `starved` is not yet in `RivalPreview` (RV-6); origin-less `scheduled` in `driftWaiting` matters if a rival lays Pitch (RV-16); wick damage of about 4 is a playtest item for RV-G1 (RV-5).
- Autofixer: the RV log rows for RV-17 and RV-19 say it was not run; RV-7 and RV-8 record none. Not checked.
- Rules and accepted Proposals: DESIGN section 11, 2026-11-17 "Rivals built (RV)".
