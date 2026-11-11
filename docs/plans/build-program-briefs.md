# Build program: briefs for the packs not started yet

Spawn `pack-worker` with the role's model and effort and paste one brief as written ([templates](../../.claude/skills/implement/templates.md)). Delete a brief when its pack merges. A routine window runs these; a design window writes the next ones (listed at the end). Written in the design window of 2026-11-11 (GATE-1, B, C1, D, E merged; their briefs are deleted).

## Order for the routine window

Two or three at a time; a pack starts when the packs in its "Starts when" are merged. Packs on one line own disjoint files and may run together.

| Wave | Packs (together) | Starts when |
|---|---|---|
| 1 | **A** foundry ring engine · **D2** EN-W0 · **S** SAVE-1 | now |
| 2 | **F2** foundry staff and great bells · **B2** KIT-R1 | F2: A merged · B2: A and D2 merged |
| 3 | **C2** ink footnotes build · **D3** KIT-R3 · **F3** the Carillonneur | C2: A and B2 merged · D3: B2 and D2 merged · F3: F2 merged |
| 4 | **D4** EN-S1 | D3 merged |

File clashes that set this order: A and C2 both edit `mix.ts` and `resolve.ts`; A and B2 both edit `districts/types.ts`; B2 and C2 both edit `runes/actions.ts` and `runes/flow.ts`; B2 and D3 both edit `districts/bridges.ts`; B2 and D2 both edit `run.ts`. **C3** (BR-19a → BR-19b) needs BR-G1 first (a design window) and C2 and B2 merged.

## Pack A: foundry ring engine (Strong: Sonnet high; escalate to Opus high after one failed review)

The first attempt stopped for design review and left no commits; spawn fresh.

```
Pack A of docs/plans/foundry-plan.md: tasks BF-3 → BF-4 → BF-5.

Read: foundry-plan.md §2 (P2–P5, P17–P20) and Pack A's rows; `git log --grep 'BF-[012T]' --format=%B`
(what the contracts, pieces and acceptance tests provide); pattern: src/engine/districts/bathhouses/boilOver.ts
(a `late`-slot rule with its preview).
Own: src/engine/districts/foundry.ts, src/engine/districts/foundry/**, tests/districts/foundry/**,
tests/engine/rules-settle.test.ts (new). Outside the district only these edits (P18, P19):
`BoardRule.settle` and `PieceTriggers.onKind` in src/engine/districts/types.ts; `settleRules` in
src/engine/rules.ts; `kindOnPiece` in src/engine/pieces.ts; one call each in mix.ts `landOnTile`,
resolve.ts (end of `castBody`), turn.ts `endTurnAction`; in src/engine/battle.ts the `eventCap`
parameter of `applyAction` and one `settleRules` call.
Contract (on main, plus P18–P20 approved 2026-11-11):
- districts/types.ts, BoardRule<S>: `settle?(ctx: Ctx, own: S): S` — resolves what the rule queued during
  an action; with nothing queued it emits nothing and returns `own` unchanged.
- rules.ts: `export function settleRules(ctx: Ctx, rules: readonly BoardRule[] = boardRules()): void` —
  every active rule with `settle`, slots carry → afterChemistry → late, inside a slot by `order` then id;
  each returned state replaces the rule's own, as `runRuleSlot` does. Read the kit lazily (import cycle).
- Settle points (call `settleRules(ctx)` at exactly these four): (1) last statement of `castBody` in
  `resolveSpell`, inside `inCastScope` (rings share the cast's cap, count in `trace.meaningful`, and the
  rival planner's `simulate` sees them); (2) `applyAction`: `withIdioms(ctx, () => { dispatch(ctx, action);
  settleRules(ctx); })`; (3) `endTurnAction`: right after each `resolveIntent(ctx, e)`, before `checkEnd`;
  (4) `BELLS_RULE.step` settles its own queue before it clears the hum and `struck`.
- `applyAction(state, action, footnotes = {}, eventCap?: number)` passes `eventCap` to `runDraft`.
- districts/types.ts, PieceTriggers: `onKind?(ctx: Ctx, at: Coord, piece: TilePiece,
  kind: Exclude<KindId, 'spark'>, origin: Origin | null): boolean` — true = the piece took the kind and
  nothing lands. pieces.ts: `export function kindOnPiece(ctx, at, kind, origin?): boolean` (like `hitPiece`).
  mix.ts `landOnTile`: `if (tile.piece && kindOnPiece(ctx, at, kind)) return;` before the `holds` guard.
  The bell takes Brass (retune up one tone, wrapping, `foundry:retuned`, no strike, nothing left on the
  tile) and returns false for Ink, Oil and Steam (Steam lands as the muffling cloud).
- A strike (`onStruck` for damage, push, spark, shove, burst; `onHit`) emits `foundry:bellStruck`
  { by, tone } at once, records the striker in `BellsState.struck`, and queues { at, by, origin } in
  `BellsState` (add the field; `parseBells` reads it forgivingly). Settle drains the queue in strike order;
  tone and muffle are read then; pulses run `withOrigin(entry.origin)`, damage then push, once per unit
  per ring (first bell in reading order), neutral; a pulse's push into a bell queues a new strike. A tone
  that hums never rings again this round. The queue is empty after every settle point.
- Do not edit push.ts or damage.ts: strikes arrive through DK-4 piece triggers. If that is not enough,
  stop and report.
Owed by this pack (Leaves for later, foundry-plan §4): pieces' triggers, `BELLS_RULE.step` and `preview`,
`strikable` (true for bells once `onStruck` is set); event `describe` lines (real text); hum passed to the
art through piece data (`BellData` gains it or the art reads the rule state: say which); `eventCap` from
`applyAction` (FD-6 left the production cap unenforced; do it in BF-3, before BF-4's sweep); retune before
the `holds: 'clouds'` guard (BF-5). Leave `NO_UNIT_TONES` (BF-6) and `TUNE_RULE.step` (BF-9) alone.

Done when:
- BF-3: every test titled "BF-3: …" in tests/districts/foundry/bells.acceptance.test.ts passes with its
  `it.fails` marker removed and the test otherwise unchanged, except the one line P20 changes in
  "BF-3: applyAction passes eventCap to the draft"; the todo "BF-3: the preview shows the tiles a tone
  would pulse" is a passing test; tests "settleRules runs each active rule's settle in slot order" and
  "settleRules is a no-op with nothing queued" in tests/engine/rules-settle.test.ts pass.
- BF-4: the same for every "BF-4: …" in cascade.acceptance.test.ts (zero drift, no `fizzles`, at most three rings).
- BF-5: the same for every "BF-5: …" in retune.acceptance.test.ts.
- tests/engine, tests/scenarios and tests/rivals pass unchanged (the settle points are no-ops off the foundry).
Any other test you had to change is a Proposal in your report.

Verify: `pnpm vitest run tests/districts/foundry tests/engine tests/rivals --reporter=dot`
```

## Pack D2: ending contracts (Strong: Sonnet high; escalate to Opus high)

```
Pack 0 of docs/plans/ending-plan.md: task EN-W0.

Read: ending-plan.md §2 (P1–P21), §4 and every Done-when in §5; tests/districts/bh0-contracts.test.ts;
pattern: src/engine/districts/bathhouses/types.ts (contracts with stubs and handoff invariants).
Own: src/engine/drawing/** (new: types and stubs only), the drawing types in src/data/types.ts,
the `Profile` fields in src/engine/types.ts, their three readers in `parseProfile` (src/engine/run.ts),
tests/drawing/acceptance.test.ts (new), one TECH.md §7 row.
Contract: behaviour-neutral. Declare, quoted from ending-plan §4 Provides:
- `Drawing` { name, rule: RuleId | null, foes: EnemyId[] (1–3), pieces: PieceId[] (≤ 2), shape: ShapeId | 'plain',
  length: 3..6, heart: MasterId }; `MasterId`, `ShapeId`.
- `Profile.drawings: (Drawing | null)[]` (3 slots), `Profile.ending: { handover: boolean; creditsSeen: boolean }`,
  `Profile.ledger` (casts, biggest chain with caster and name, districts in opening order); a profile
  without them parses to empty defaults, and a malformed value is dropped, never thrown.
- Stubs that throw "not built (EN-x)": `paletteOf(p)`, `penOf(p): { total, parts }`, `costOf(d)`, `weightBand(d)`,
  `checkDrawing(p, d): Issue[]`, `generateRoom(input): { layout, attempts, fallback, ops }`,
  `checkGenerated(layout, spec)`, `botTrial(state, budget)`, `handover(p)`, `creditsOf(p)`;
  interfaces `GenKit`, `PieceKit`, `FoeKit`, `RuleKit`, `ShapeKit`, `HeartFrame` (each with `needs` and a reason, P5).
- Do not edit src/engine/districts/types.ts (Pack A owns it this window); a needed kit change is a request
  in the report. EN takes seed salts 7000–7999.
Owed by this pack (Leaves for later, ending-plan §4, copy into the handoff): `ledger` fed by EN-1;
`ending.handover` EN-10, `creditsSeen` EN-11; `drawings` written by EN-6; palette, pen, cost, weight,
checkDrawing and src/data/drawing.ts numbers EN-5; generateRoom, checkGenerated, botTrial first by EN-S1,
finished by EN-2; limits in src/data/tuning.ts EN-G0; the kit interfaces filled per district EN-K1–K7
(heart frames and bot terms for built districts from KIT-R3 first); `inkedPage` hooks EN-3, offers EN-8;
`requestRoom` EN-4; screens EN-6, EN-7, EN-10, EN-11; owner def and `mender` row EN-9; the requests
DK-E1–E6 and the other districts' shape registrations.

Done when:
- EN-W0: `pnpm check:fast` green; no existing test changes; every "<ID>: <rule>" title named in an
  ending-plan §5 Done-when exists in tests/drawing/acceptance.test.ts as `it.fails` or `it.todo`;
  test "EN-W0: a profile without the ending fields parses with empty defaults" passes; the report lists
  the requests and the invariants.

Verify: `pnpm vitest run tests/drawing tests/app tests/run --reporter=dot`
```

## Pack S: save compatibility and one owed timeout (Fast: Haiku high; escalate to Sonnet medium)

```
Pack F of docs/plans/platform-closure-plan.md: task SAVE-1, plus the owed canal-rooms timeout.

Read: platform-closure-plan.md row SAVE-1; tests/fixtures/growing-pages/ (how a recorded save is kept);
pattern: tests/fixtures/growing-pages/v9-home.json and the test that loads it (`grep -rln v9-home tests`).
Own: tests/fixtures/saves/** (new, with a README.md), tests/app/save-compat.test.ts (new),
the timeout of the slowest test in tests/data/canal-rooms.test.ts (one line plus a comment).
Contract: tests only, no src/ change. Fixtures are recorded once with the current build (state the commit
in the file name or README) and never regenerated: a later parse change that breaks one is a migration
bug, not a fixture to refresh. `PLAYABLE_DISTRICTS` today: seam, canals, inkQuarter, bathhouses, bridges.
Owed by this pack: the canal-rooms timeout (raise the slowest test's timeout to about three times its
time under `pnpm check:fast` load, the reason in a comment). Leaves for later: each district opened
later (the foundry at BF-22, the cartographers) adds its own pair of saves.

Done when:
- SAVE-1: tests "SAVE-1: <district> save written by <commit> parses and loads" and
  "SAVE-1: <district> mid-trip save resumes to its next offer" pass for each of the five districts;
  the README says to add one pair per district opened.
- `pnpm vitest run tests/data/canal-rooms.test.ts` passes while `pnpm check:fast` runs in another shell.

Verify: `pnpm vitest run tests/app/save-compat.test.ts tests/data/canal-rooms.test.ts --reporter=dot`
```

## Pack F2: foundry staff and great bells (Default: Sonnet medium; escalate to Sonnet high)

Starts when Pack A is merged.

```
Pack B of docs/plans/foundry-plan.md: tasks BF-6 → BF-7 → BF-8.

Read: foundry-plan.md §2 (P1, P5–P8, P16, P18) and Pack B's rows; `git log --grep 'BF-[345]' --format=%B`;
pattern: src/engine/districts/bathhouses/foes.ts and trip.ts.
Own: src/data/districts/foundry/enemies.ts (new), the one-line registrations in src/data/enemies.ts,
src/engine/districts/foundry/foes.ts and peal.ts (new), the trip hooks and foe registrations in
src/engine/districts/foundry.ts, tests/districts/foundry/**. At most one reviewed edit to the `Intent`
union in src/engine/types.ts, only if `FoeBehaviour` (KIT.foes, intent kind `behaviour`) cannot carry
ring and retune: say why in the report.
Contract (on main after Pack A):
- Ringer and Detuner are `FoeBehaviour`s (plan, resolve, preview, describe); a Ringer's ring and a
  Detuner's retune go through Pack A's `ringTone` / `retune` helpers and the settle points, never a
  second queue. Plans are rng-free and avoid harming friends.
- The Clapper is a member of its tone while it stands: supply its `UnitToneReader` in place of
  `NO_UNIT_TONES`; hitting it rings its tone through `FoeBehaviour.onStruck`.
- P16: the Detuner walks to the nearest bell (fewest walking steps to a free tile beside it, foes'
  existing pathing; reading order on a tie), muffled and humming bells alike.
- P7: a won room whose great bell is rung writes `{ room, note }` to `FoundryTripState` in `afterRoom`
  (reads `foundry:bellRung` in the room's log); no offer card. P8: an allied great bell pulses foes only.
- Foe numbers are the plan's P12 defaults; no tuning.
Owed by this pack (Leaves for later, foundry-plan §4): the Clapper's tone reader (BF-6); trip hooks
`roomSetup` placing allied bells at `{hook}` tiles and `afterRoom` (BF-8). Left for later: `offersFor`
(BF-13), rooms (BF-10–12), the three BF-8 todos that need rooms and a foundry trip (BF-10, BF-12, BF-22).

Done when:
- BF-6: "BF-6: the Ringer and the Clapper are in ENEMIES with the plan stats and tokens" passes with its
  marker removed; the seven BF-6 todos in staff.acceptance.test.ts are passing tests.
- BF-7: "BF-7: the Detuner is in ENEMIES with the plan stats and token" passes; the five BF-7 todos are passing tests.
- BF-8: the seven named BF-8 tests in peal.acceptance.test.ts pass with their markers removed; the three
  remaining BF-8 todos stay todo.
A test you had to change is a Proposal in your report.

Verify: `pnpm vitest run tests/districts/foundry tests/engine --reporter=dot`
```

## Pack B2: kit engine hooks (Default: Sonnet medium; escalate to Sonnet high)

Starts when Packs A and D2 are merged.

```
Pack B of docs/plans/platform-closure-plan.md: task KIT-R1.

Read: platform-closure-plan.md §3 "S1 confirmed", §4 "KIT-R1 provides" and row KIT-R1;
pattern: `harmGuards` in src/engine/districts/types.ts and kit.ts (a module list read lazily).
Own: src/engine/districts/{types,kit,api}.ts, src/engine/districts/bridges/support.ts and bridges.ts,
src/engine/districts/lowerSeam.ts, src/engine/runes/actions.ts and runes/flow.ts (the `cracksOf` call
sites only), src/engine/trip/finish.ts, src/engine/run.ts (line 241 only), biome.json,
tests/engine/kit-hooks.test.ts (new), TECH.md §3 (the rival authoring example).
Contract (names approved as written in the plan):
- `DistrictModule.unsupported?(s: BattleState): readonly Coord[]`; `crackedTiles(s)` in districts/api.ts,
  the union over modules in registry order; it replaces `cracksOf` at runes/actions.ts:252 and runes/flow.ts:349.
- `DistrictModule.afterBattleClose?(p: Profile, t: Trip): Profile`, applied in trip/finish.ts in registry
  order; replaces `markDoorSeen`; the lower Seam implements it.
- `DistrictModule.bindsBeforeOpen?: true` replaces `d === 'inkQuarter'` at run.ts:241.
- Biome: files under src/engine/ outside engine/districts/ may import only districts/{kit,api,types,registry,index}.
  One exemption, with a comment naming KIT-R3b: src/engine/sim/bot.ts (it imports bathhouses/boilOver and
  bridges/preview since EN-0; KIT-R3 moves those into the modules' `bot` terms).
- Keep Pack A's `BoardRule.settle` and `PieceTriggers.onKind` as they are.
Owed by this pack: TECH.md §3 still names `bridges:rightOfWay` as the authoring example (it is
`bridges:keystoneRight` now); fix the sentence. Leaves for later (closure §4): every future district
with a support rule implements `unsupported`; the Seam's `'seam'` tests at engine/recruits.ts:200 and
engine/trip/place.ts:20 stay; data/enemies.ts, loot.ts, types.ts still aggregate by hand.

Done when:
- KIT-R1: `grep -rnE "districts/(seam|canals|bathhouses|bridges|inkQuarter|foundry|lowerSeam)" src/engine --include='*.ts' | grep -v '^src/engine/districts/' | grep -v '^src/engine/sim/bot.ts'`
  prints nothing; `grep -rn rightOfWay src TECH.md` prints nothing; a probe import of
  `./districts/bridges/support` from src/engine/push.ts makes `pnpm lint` exit non-zero (probe removed);
  tests "KIT-R1: crackedTiles unions every module's unsupported tiles" and "KIT-R1: afterBattleClose
  marks the door seen on a Seam win only" pass; tests/districts/bridges, tests/districts/lower-seam-*,
  tests/engine and tests/run pass unchanged.

Verify: `pnpm lint && pnpm vitest run tests/engine tests/run tests/districts --reporter=dot`
```

## Pack C2: ink quarter footnotes, build (Fast: Haiku high; escalate to Sonnet medium)

Starts when Packs A and B2 are merged. The approved text is the spec.

```
Pack C2 of docs/plans/ink-quarter-plan.md: tasks IQ-F3 → IQ-F4 → IQ-F5.

Read: docs/design/footnotes-content/inkQuarter.md (approved 2026-11-11; §7 lists the review's changes);
footnotes-audit.md §11 (the stamp sites); pattern: src/data/footnotes/bathhouses.ts with
tests/scenarios/footnotes/bathhouses-runes.test.ts, and the Steward's note in tests/rivals/bathSteward.test.ts.
Own: src/data/footnotes/inkQuarter.ts (new), one line in src/data/footnotes/index.ts, the IQ block of
src/data/lines.ts, tests/scenarios/footnotes-ink-lines.test.ts (markers only), tests/scenarios/footnotes/ink-*.test.ts (new),
the variant hooks at the engine sites the draft names: src/engine/runes/actions.ts (`sentence`, `levy`),
src/engine/runes/flow.ts (`trial`, `tallyCount`), src/engine/resolve.ts (the `trigger` step only),
src/engine/solvents.ts (`turnBack`, `wax.onHook`), src/engine/marks.ts (`release` only), src/engine/push.ts
(the wax-on-cloud refusal only), src/engine/mix.ts (`decayStates` only), src/data/rivals/postmaster.ts
(`note`), tests/rivals/postmaster.test.ts, src/app/study.ts (`finePrint`, one line), tests/app/finePrint.test.ts (new).
Contract (on main): a variant's effect runs only when `hasFootnote(ctx, '<variant id>')`; its events carry
the slot's line (`withLine`). Ids are the draft's, final. Every "say so at build" becomes a clause in the
variant text or a one-line comment. The postmaster's note keeps its page's id `postmaster:sentence`,
`rival: 'postmaster'`, credit "Copied from the postmaster's receipt book.", and
`POSTMASTER_PAGE.note = { rune: 'sentence', line: 'sentence:mark', variant: 'postmaster:sentence' }`.
No new event types or `Meets` values. Do not touch Pack A's settle calls in resolve.ts and mix.ts.
Owed by this pack (status file): IQ-F3 adds the engine stamps first — `sentence:mark` in actions.ts
`sentence`; `levy:unit` (the miss), `levy:mark` / `levy:member` (at `markSpent`), `levy:shielded` in `levy`;
`tally:collar` / `tally:stamp` as the `line` returned from flow.ts `trial` — then drops `pending` from
those seven rows and the `it.fails` markers of their "IQ-F1: <line> fires" tests. `tally:stamp` gets its
stamp but no slot. IQ-F4 widens the `sand:noTarget` text to cover `sand-unit-nearest`. `finePrint` in
src/app/study.ts counts pending rows in its total: filter them (`!l.pending`).

Done when:
- IQ-F3: every "IQ-F1: <line> fires" test passes with its marker removed; tests
  "<line> fourCombos: …" pass for sentence:mark, sentence:unit, levy:mark, levy:member, tally:collar;
  one scenario per capstone passes (sentence, levy, tally: six); "IQ-F3: finePrint counts no pending row" passes.
- IQ-F4: "<line> fourCombos: …" for wax:cloud and sand:unit, and one scenario per Wax and Sand capstone (four).
- IQ-F5: tests "hidden without his page" and "offered once his page is held, credited, and writing it
  files it in the slot" for `postmaster:sentence`, and "written: a unit Sentence crushes against a wall is
  held until your next turn" pass.
- tests/data/integrity.test.ts passes (every line fires both ways).

Verify: `pnpm vitest run tests/scenarios tests/data tests/rivals tests/app/finePrint.test.ts --reporter=dot`
```

## Pack D3: heart frames and trip shapes (exemplar Default: Sonnet medium; the rest Fast: Haiku high)

Starts when Packs B2 and D2 are merged. Two spawns of one pack: KIT-R3a first, then KIT-R3b from its test.

```
Pack D of docs/plans/platform-closure-plan.md: tasks KIT-R3a → KIT-R3b.

Read: platform-closure-plan.md §4 "KIT-R3 provides" and Pack D's rows; ending-plan.md P13 (heart frames);
pattern: `HeartSetup` and `BotTerms` in src/engine/districts/types.ts and EN-W0's `HeartFrame` in src/engine/drawing/.
Own: src/engine/districts/{seam,canals,inkQuarter,bathhouses,bridges}.ts, each district's heart/bot data
file, src/engine/sim/bot.ts (its district imports only), biome.json (removing the sim/bot.ts exemption),
tests/districts/heart-frames.test.ts (new).
Contract (on main): `heart: HeartSetup` { foe, rules, frame(board, seed) } places the master's terrain and
pieces on any allowed board size (5–7 × 6–9), seeded and pure; `bot: BotTerms` { value?, actions? }.
The Seam and canals register a `trip: TripShapeDef` with today's behaviour (no state change to saves).
Behaviour-neutral for every existing trip: golden fixtures unchanged.
Owed by this pack: `DistrictModule.heart` and `.bot` for Seam, canals, ink quarter, bathhouses, bridges;
`trip` for Seam and canals (status Owed, needed by EN-S1 and EN-K1–K5); move sim/bot.ts's
`boilOverState`/`forecastBoilOver` and `crackedSet` reads into the bathhouses' and bridges' `bot` terms
and drop the lint exemption KIT-R1 left. Leaves for later: the foundry and cartographers register theirs
in BF-12 and CG-10 (EN-K6, EN-K7 read them).

Done when:
- KIT-R3a: test "KIT-R3: inkQuarter frame places the postmaster on 5x5, 7x9 and the real room size, seeded"
  passes and the frame passes `checkRoom` on three sizes.
- KIT-R3b: one "KIT-R3: <district> frame …" test per district (seam, canals, bathhouses, bridges), same
  shape as R3a; `KIT.shapes` has `seam` and `canals`; tests/run golden fixtures and tests/sim results
  unchanged; `pnpm lint` passes with no sim/bot.ts exemption.

Verify: `pnpm lint && pnpm vitest run tests/districts tests/run --reporter=dot`
Sims: run `tests/sim --reporter=dot` once at the end for KIT-R3b (bot terms moved).
```

## Pack F3: the Carillonneur (Strong: Sonnet high; escalate to Opus high)

Starts when Pack F2 is merged.

```
Pack C of docs/plans/foundry-plan.md: tasks BF-9 → BF-24.

Read: foundry-plan.md §2 (P3, P9, P10, P15, P17) and Pack C's rows; TECH.md §3 "Authoring a rival";
pattern: src/data/rivals/bathSteward.ts with its trick and src/engine/districts/bathhouses/heart.ts.
Own: src/engine/districts/foundry/tune.ts (new), the tune and trick registration in
src/engine/districts/foundry.ts, src/data/rivals/carillonneur.ts (new), one line each in
src/data/rivals/index.ts and src/data/rivals/types.ts (`RivalId`), the foe ids in src/data/districts/foundry.ts,
tests/districts/foundry/**, tests/rivals/carillonneur.test.ts (new).
Contract (on main): P17's pure functions exported from src/engine/districts/foundry.ts:
`newTune(seed): Tone[]` (four tones, none more than twice, from the trip seed via `deriveSeed`),
`calledNote(t: TuneState): Tone`, `answerNote(t, reason): TuneState` (back to 0, `answered` + 1),
`greatPeal(ctx)` (rings every tone not humming). He is a real rival through RV's API (RV-11 tricks,
RV-14 authoring, RV-15 page): spells, the per-round mark `foundry:playsATune` (called note, advance or
failed; stunned or dead = failed), routine, the page `carillonneur:tune`, the `draw` descriptor; token `V`.
Rings go through Pack A's settle points. No stand-in remains (P10).
Owed by this pack (Leaves for later, foundry-plan §4): `TUNE_RULE.step` (no-op until now);
`carillonneurStandIn` leaves `FOUNDRY_FOE_IDS` and the data.

Done when:
- BF-9: the six named BF-9 tests in tune.acceptance.test.ts pass with their markers removed; the eleven
  BF-9 todos are passing tests.
- BF-24: a test shows the Toll note hidden until his page is held, then offered, then credited; the page
  text (annotation, story with the "Seam has no bell" thread) is present.
A test you had to change is a Proposal in your report.

Verify: `pnpm vitest run tests/districts/foundry tests/rivals tests/engine --reporter=dot`
```

## Pack D4: generator spike (Strong: Sonnet high; escalate to Opus high)

Starts when Pack D3 is merged. The only pack running sims while it runs.

```
Pack B of docs/plans/ending-plan.md: task EN-S1.

Read: ending-plan.md P8–P12 and rows EN-S1, EN-G0; tests/sim/trip-shape.test.ts (a seed fuzz);
pattern: src/engine/districts/bathhouses/trip.ts (room setup) and EN-W0's stubs in src/engine/drawing/.
Own: src/engine/drawing/generate.ts, tests/sim/generator.test.ts (new), src/app/dev/** (the `#/dev/generator` page).
Contract (on main): built content only (Seam foes and ground, the canals' current and lamps); the P8
pipeline; `checkGenerated` per P9; the bot trial per P10 through src/engine/sim with an op budget
(default 6000 applied actions), salts `7000 + 10·room + attempt`, fallback salt `7900 + room`; pure and
deterministic; no wall-clock limit inside the engine.
Owed by this pack: `generateRoom`, `checkGenerated`, `botTrial` first built (EN-2 finishes them).
Leaves for later: the limits in src/data/tuning.ts (EN-G0); the worker (EN-4).

Done when:
- EN-S1: tests "EN-S1: guardrails hold on 500 seeds", "EN-S1: no event-cap overrun inside trials",
  "EN-S1: same input gives the same layout, attempts and ops" pass; the report has first-try acceptance,
  the attempts histogram, fallback rate, ops per trial, desktop timings, and the dev page's URL with 20
  sample rooms (screenshots at 375×812). Phone timings come from the player (EN-G0).

Verify: `pnpm vitest run tests/sim/generator.test.ts --reporter=dot`
Phone check: yes, port 5192 (the dev page is new).
```

## Pack C3: bridges footnotes build (Default: Sonnet medium)

**Not spawnable yet:** needs BR-G1 (the orchestrator's review of docs/design/footnotes-content/bridges.md, a design window), and Packs C2 and B2 merged. Brief to be finished at BR-G1 with the approved ids.

```
Pack C3 of docs/plans/bridges-plan.md: tasks BR-19a (Hold, Brink, Lay: lines and capstones) →
BR-19b (Mortar, Chalk, the Chief Warden's note on Brink).

Read: docs/design/footnotes-content/bridges.md (approved at BR-G1); footnotes-audit.md §10;
pattern: Pack C2's src/data/footnotes/inkQuarter.ts and its tests.
Own: src/data/footnotes/bridges.ts (new), one line in src/data/footnotes/index.ts, the BR block of
src/data/lines.ts, the engine sites the approved draft names (listed at BR-G1),
src/data/rivals/chiefWarden.ts (`note`), tests/scenarios/footnotes/bridges-*.test.ts (new), tests/rivals/chiefWarden.test.ts.
Contract: as Pack C2 (variants behind `hasFootnote`, events carry the slot's line, ids final, no new
events or `Meets`); the Warden's note on `brink:drop` level II, hidden until his page is held.
Owed by this pack: nothing yet (BR-G1 adds any pending stamps).

Done when:
- BR-19a: "<line> fourCombos: …" for hold:held, hold:cracked, brink:cracked, brink:drop, lay:cracked;
  one scenario per Hold, Brink and Lay capstone.
- BR-19b: the same for mortar:unit and chalk:network and their capstones; the note's three tests
  (hidden, offered and credited, written); margin checked on a phone (the orchestrator, at wave end).

Verify: `pnpm vitest run tests/scenarios tests/data tests/rivals --reporter=dot`
```

## Written in the next design window

| Pack | Tasks | Starts when |
|---|---|---|
| BR-G1 | orchestrator review of the bridges footnote draft; finish C3's brief | a design window |
| EN-G0 | go/no-go on D4's report and the player's phone timings | D4 merged |
| F4… | foundry rooms (BF-10 → BF-11), heart and loot, thresholds, screens (after KIT-R2, merged) | F3 merged (rooms share `src/data/districts/foundry.ts` with F3) |
| EN-12 | the handover text draft (orchestrator, docs only) | D2 merged |
| closure | Packs E, G–M of the closure plan and the FU sweep | free slots |
