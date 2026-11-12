# Build program: briefs for the packs not started yet

Spawn `pack-worker` with the role's model and effort and paste one brief as written ([templates](../../.claude/skills/implement/templates.md)). Delete a brief when its pack merges. A routine window runs these; a design window writes the next ones (listed at the end). Rewritten in the design window of 2026-11-12b (waves 5–7 merged except C3 and ED, whose questions are decided here; D3b, F4, E1, D3c, EF, D4 and F6 briefs deleted; D5 is new).

## Order for the routine windows

Two or three at a time; a pack starts when the packs in its "Starts when" are merged. Packs on one line own disjoint files and may run together. **Sims:** D5, F9, MIX and M run `tests/sim`; never two of them at once.

| Wave | Packs (together) | Starts when |
|---|---|---|
| 8 | **C3** bridges footnotes · **D5** generator judge (sims) · **F7** foundry thresholds and floor | now (all three) |
| 9 | **ED** ledger and owner · **F8** foundry screens · **CW0** cartographers contracts | ED: C3 · F8: now · CW0: now |
| 10 | **F5** foundry footnote audit · **F9** foundry proof and open (sims) · **O** FU-21 | F5: C3 and ED · F9: F7, F8 and CW0 · O: ED |
| 11 | **I** FU-2–5 · **MIX** MIX-1 (sims) · **G** BL-110 | I: F5 · MIX: no sims pack running · G: now |
| 12 | **M** FU-17–20 (sims) · **K** FU-9–12 · **L** FU-13–16 | M: C3 merged and no sims pack running · K, L: now |
| 13 | **J** FU-6–8 · **B1** FU-1 · **H** BL-111 | now (all three) |

Free-slot packs (G, H, J, K, L, B1) may move into any earlier wave that has an open slot, if the clash list allows. D5 goes first among the sims packs: EN-G0 waits on it and on the player's phone timings.

File clashes that set this order: C3 and ED both edit the cast paths (`resolve.ts`, `bursts.ts`, `inventions.ts`); C3, M both edit `src/engine/mix.ts`; ED, F5 and I all edit `src/data/lines.ts`; ED and F9 both edit `src/data/types.ts`; ED and O both touch `solvents.ts`; F7 and F9 share `src/data/districts/foundry.ts` (one at a time); CW0 and F9 both edit `src/data/districts/index.ts`; B1 edits `districts/types.ts` (no one else now); J owns `bathhouses/**` engine files (not `bot.ts`, `heart.ts`, `heartFrame.ts`). UI ports: F8 and H 5191, D5 and K 5192, L 5193 (never two on one port at once).

Every brief's "Leaves for later" items are also in the status file's Owed list.

## Pack C3: bridges footnotes build (Default: Sonnet medium; escalate to Sonnet high)

Starts now. Its first attempt stopped on the hit-amount question, decided 2026-11-12b (bridges-plan P21–P23).

```
Pack C3 of docs/plans/bridges-plan.md: tasks BR-19a (Hold, Brink, Lay: lines and capstones) →
BR-19b (Mortar, Chalk, the Chief Warden's note on Brink).

Read: docs/design/footnotes-content/bridges.md (approved; §8 lists the review's changes, build notes and the
2026-11-12b decisions); bridges-plan.md P21–P23; footnotes-audit.md §10; pattern: src/data/footnotes/inkQuarter.ts
with tests/scenarios/footnotes/ink-*.test.ts and the postmaster's note in tests/rivals/postmaster.test.ts.
Own: src/data/footnotes/bridges.ts (new), one line in src/data/footnotes/index.ts, src/engine/exposed.ts (new),
src/engine/damage.ts (the two lines in `dealDamage` below, nothing else), src/engine/types.ts (`Unit.holds?` and
`Unit.holdFreeUntil?` only), the variant hooks at the sites the draft names: src/engine/runes/actions.ts (`hold`,
`holdUnit`), src/engine/runes/flow.ts (`brinkLine`), src/engine/resolve.ts (Brink's rest and target step only),
src/engine/mix.ts (`newLayer` only), src/engine/push.ts (the Mortar bonus only), src/engine/bursts.ts (`unitsNear`
only), src/engine/inventions.ts (Chalk's path end only), src/engine/districts/bridges/{collapse,support,wear}.ts,
src/data/rivals/chiefWarden.ts (`note`), tests/scenarios/footnotes/bridges-*.test.ts (new),
tests/rivals/chiefWarden.test.ts. Not src/engine/districts/bridges.ts, heart.ts or heartFrame.ts.
Contract (on main):
- A variant's effect runs only when `hasFootnote(ctx, '<variant id>')`; its events carry the slot's line
  (`withLine`). Ids are the approved draft's, final (`mortar-unit-guard`, not `-kin`). No new event types or
  `Meets` values.
- Core files read bridges state only through `districts/api` (`crackedTiles`); an effect that writes bridges
  state (stone, the fall, support) lives in src/engine/districts/bridges/ — if one cannot be reached from there,
  stop and report.
- Exposure (P21), "one step more from every hit":
  `export function exposedStep(ctx: Ctx, unit: Unit): { step: 0 | 1; line: LineId | null }` in
  src/engine/exposed.ts, pure, importing only ./ctx, ./footnotes, ./districts/api, ./grid, ./types and $data
  types. `{ step: 1, line: 'hold:held' }` when `unit.held > 0`, `(unit.holds ?? 0) >= 2` and `hold-held-exposed`
  is on; else `{ step: 1, line: 'hold:cracked' }` when `unit.held > 0`, the unit stands on a tile of
  `crackedTiles(ctx.s)` and `hold-cracked-pinned` is on; else `{ step: 0, line: null }` (never 2).
  In `dealDamage`, after the trick/guard block and before the shield maths:
  `const exposed = base > 0 ? exposedStep(ctx, unit) : NOT_EXPOSED; const amount = base + exposed.step;`
  and the `damage` event gains `...(exposed.line ? { line: exposed.line } : {})`. Guards keep seeing `base`;
  a redirected hit is judged on the unit it lands on (the recursive call).
- Held twice (P22): `Unit.holds?: number` = Holds landed during the current hold, read only while `held > 0`
  (no reset needed). `holdUnit` writes it (`u.held > 0 ? (u.holds ?? 1) + 1 : 1`, before `held` is raised) only
  when `hold-held-exposed` or `hold-held-shake` is on, so units are unchanged without them. `hold-held-pass`
  passes the second Hold on, so its target is not held twice (its clause says "held twice").
  `hold-held-shake`: the Hold that makes `holds` 2 sets `held` to 1 (freed at the party's next turn) and
  `Unit.holdFreeUntil` to the round after that release; a Hold on the unit while `ctx.s.round <= holdFreeUntil`
  is refused with the existing `miss` event, line `hold:held`.
- `brink-cracked-dusk` (P23) reads `crackedTiles`; its text is the draft's new one ("Brink counts a cracked tile
  as an edge: it falls at dusk.").
- The dusk hooks run in collapse.ts's step in §8's order; `fallingTiles` stays the one selection. Every "say so
  at build" in §8 becomes a clause in the variant text or a one-line comment.
  `CHIEF_WARDEN_PAGE.note = { rune: 'brink', line: 'brink:drop', variant: 'chiefWarden:brink' }` (was
  `brink:edge`), credit "Copied from the Chief Warden's day-book.". Do not touch the settle calls in resolve.ts
  and mix.ts.
Owed by this pack: nothing from the status file. Leaves for later: none.

Done when:
- BR-19a: tests "<line> fourCombos: …" for hold:held, hold:cracked, brink:cracked, brink:drop, lay:cracked;
  one scenario per capstone option (hold-cap-crush, hold-cap-hang, brink-cap-fall, brink-cap-rim, lay-cap-footing,
  lay-cap-trail); "hold-held-exposed: a foe's attack on a unit held twice deals one more",
  "hold-cracked-pinned: a crush on a unit held on a cracked span deals one more, and the two never stack" and
  "hold-held-shake: the next Hold misses, the one after lands" pass.
- BR-19b: the same for mortar:unit and chalk:network; scenarios for mortar-cap-set, mortar-cap-scatter,
  chalk-cap-circle, chalk-cap-line; the note's tests "hidden without his page", "offered once his page is held,
  credited, and writing it files it in the slot" and "written: a member beside the fog takes a Guard of 1
  instead of Brink's rest".
- tests/data/integrity.test.ts passes (every line fires both ways); tests/districts/bridges, tests/rivals,
  tests/engine and tests/run pass unchanged otherwise (damage.ts is shared: no golden or scenario output
  changes without the footnotes). A test you had to change is a Proposal in your report.

Verify: `pnpm vitest run tests/scenarios tests/data tests/rivals tests/districts/bridges tests/engine tests/run --reporter=dot`
Phone check: no (the orchestrator checks the margin at the wave's end).
```

## Pack D5: generator judge and budget walk (Strong: Sonnet high; escalate to Opus high)

Starts now. The only sims pack while it runs. EN-G0 (a design window) reads its report and the player's phone timings on its dev page.

```
Pack B of docs/plans/ending-plan.md: task EN-S2.

Read: ending-plan.md P8–P12, P28 and rows EN-S2, EN-G0; `git log --grep 'EN-S1' --format=%B`; pattern:
src/engine/drawing/generate.ts and tests/sim/generator.test.ts as EN-S1 left them.
Own: src/engine/drawing/generate.ts, src/engine/drawing/types.ts (the fields below only), `GEN_TUNING` in
src/data/drawing.ts (a new export; `COSTS` and `NEEDS` unchanged), tests/sim/generator.test.ts, src/app/dev/**
(the `#/dev/generator` page).
Contract (on main, EN-S1):
- Pure and deterministic as EN-S1: salts `7000 + 10·room + attempt`, fallback `7900 + room`, the op budget, no
  clock; `checkGenerated` and the P8 pipeline unchanged.
- `GEN_TUNING = { perMember: 2, perDepth: 1, bandBonus: { light: 0, medium: 1, heavy: 2 },
  walkover: { rounds: 2, hpLeft: 1 }, step: 1 }` (defaults; CAL's numbers, P28). `BAND_BONUS` leaves
  generate.ts. Base budget = `perMember × party.length + perDepth × depth + bandBonus[weightBand(drawing)]`,
  depth as today (`min(room, 3)`).
- `RoomTrial` gains `budget: number` and `walkover: boolean` (won, and `rounds <= walkover.rounds` or
  `hpLeft >= walkover.hpLeft`); `GeneratedRoom` gains `dull: boolean`.
- The walk: attempt 1 uses the base budget; attempt n+1 uses attempt n's budget + step after a walkover,
  − step after a loss or a guardrail failure, never below 1. The first won attempt that is not a walkover is
  offered (`dull: false`). When none is fair but one was won, the last won attempt is offered (`verified: true`,
  `fallback: false`, `dull: true`). When none was won, the safe fallback as today (half the base budget,
  `dull` from its own trial).
- Defaults: if the Done-when below fails at the defaults, try `perMember: 3`, then also `perDepth: 2`, nothing
  else; report which set meets it. No other number moves.
- The dev page shows each sample's budget, attempts, win round, HP left and `dull`.
Owed by this pack: nothing from the status file. Leaves for later: EN-G0 (design window) records the limits
in src/data/tuning.ts; EN-2 carries the walk into the production generator; CAL-5 tunes `GEN_TUNING`.

Done when:
- EN-S2: tests "EN-S2: offered rooms are walkovers in at most 10 % of seeds" (the 500-seed fuzz; a fallback
  counts by its own trial), "EN-S2: the offered rooms' median win round is 3 or more and median HP left is
  below 1", "EN-S2: the budget walks up after a walkover and down after a loss" (a short seeded case reading
  `trials[].budget`), "EN-S2: a trio's base budget is larger than a pair's" (`specFor`) and "EN-S2: no walkover
  is offered while a fair attempt exists" pass; EN-S1's three tests pass with titles and assertions unchanged.
- The report: win-round and HP-left distributions (median, p05, p95) of offered rooms before (EN-S1) and after,
  the attempts and budget histograms, dull and fallback counts, ops per trial, desktop ms per offered room, and
  the dev page at 375×812 with 20 samples (screenshots). Phone timings come from the player (EN-G0).

Verify: `pnpm vitest run tests/sim/generator.test.ts tests/drawing --reporter=dot`
Phone check: yes, port 5192 (the dev page changes).
Sims: tests/sim/generator.test.ts.
```

## Pack F7: foundry thresholds and floor (Default: Sonnet medium)

Starts now (F6 merged).

```
Pack F of docs/plans/foundry-plan.md: tasks BF-14 → BF-15 → BF-16.

Read: foundry-plan.md P13, P26 and Pack F's rows; pattern: the bathhouse hearing test, threshold (BH-9) and
intrusion (BH-11) entries in src/data/districts/bathhouses.ts with their tests in tests/data/bathhouse-*.test.ts.
Own: src/data/districts/foundry.ts (map, threshold, intrusion only; not the rooms, heart, loot or gate),
tests/data/foundry-rooms.test.ts, tests/data/foundry-threshold.test.ts and foundry-intrusion.test.ts (new).
Contract (on main): BF-14 (P26): `hear` and `lean` are already in FOUNDRY_KIT; add the map caption and the
solved art key. BF-15: the far bell, a threshold room with ≥ 4 `P`, two same-tone bells far apart and a
decoy tone, free and retryable; its goal reads the far bell rung; a Shove from every start point solves it
(foundry Q3 stays at its default). BF-16 (P13): an `IntrusionSpec` with a pair of bells of one tone far apart,
3 layouts, the piece-scoped `bells` rule only (no Ringers, tune or great bells), the "Seam has no bell" floor line.
Rooms stay in `FOUNDRY_ROOMS_12/_34` and `FOUNDRY_HEART`; do not merge them into `FOUNDRY_KIT` (BF-22 does).
Owed by this pack: nothing. Leaves for later: BF-22 flips the gate and merges the rooms and loot.

Done when:
- BF-14: "BF-14: the foundry is heard by a conducted burst reaching three units in the Seam" and "BF-14: two
  units are not enough" pass; the map entry has its caption and solved art key.
- BF-15: `checkRoom` passes; "BF-15: a Shove from every start point rings the far bell" passes; "BF-15: Retry
  keeps the same spots" passes.
- BF-16: "BF-16: a foundry floor builds from its IntrusionSpec", "BF-16: a strike rings the pair and it hums"
  and "BF-16: no tune, staff or great bell appears" pass; `checkFloor` passes for each layout.

Verify: `pnpm vitest run tests/data/foundry-*.test.ts tests/districts/foundry --reporter=dot`
```

## Pack ED: ledger and owner (Default: Sonnet medium; escalate to Sonnet high)

Starts when C3 is merged (E1 merged). Its first attempt left no commits; questions decided 2026-11-12b (ending-plan P26, P27).

```
Pack D of docs/plans/ending-plan.md: tasks EN-1 → EN-9.

A first attempt left nothing (its EN-1 code was never committed and is lost): rebuild EN-1 from this brief.

Read: ending-plan.md P18, P19, P21, P22, P24, P26, P27 and Pack D's rows; party.md §1 (habit rules) and §2 (the
owner); pattern: an existing habit row in src/data/habits.ts with its scenario test, the entries in
src/data/recruits.ts, and `ledgerOf`/`readLedger` in src/engine/drawing/profile.ts.
Own:
- EN-1: src/engine/ledger.ts (new); one call in `returnHome` (src/engine/trip/crossroads.ts) and one in the wipe
  path of `closeBattle` (src/engine/trip/finish.ts); tests/run/ledger.test.ts (new); tests/run/golden.test.ts
  (lines 105 and 107, a local `noLedger` helper, one check); tests/run/doorway.test.ts (lines 120–122); the four
  EN-1 `it.todo` lines of tests/drawing/acceptance.test.ts (removed).
- EN-9: src/data/apprentices/owner.ts (new) and its one registry line in src/data/apprentices.ts;
  src/data/types.ts (`HabitId` with its doc comment, and `HabitRule.networkGap` only); src/data/habits.ts (the
  `mender` row); tests/engine/ah0-contracts.test.ts (lines 45 and 47 only); src/engine/networks.ts (the `gap`
  option); the network callers' mender checks (bursts.ts, resolve.ts, marks.ts, solvents.ts, inventions.ts: one
  guarded call each); the EN block at the end of src/data/lines.ts; tests/scenarios/habits-mender.test.ts (new);
  the nine EN-9 `it.todo` lines of tests/drawing/acceptance.test.ts (removed, P24).
Contract (on main: EN-W0's optional `Profile.ledger?: Ledger` = { casts, biggest: { chain, caster, name } | null,
districts }, read through `ledgerOf`, stored only once non-empty, P22):
- EN-1: `export function feedLedger(p: Profile, stats: TripStats): Profile` in src/engine/ledger.ts, pure: adds
  the trip's casts (from `stats.spells`), replaces `biggest` when `stats.biggestChain` has more reactions (caster
  = the member's apprentice id, name = the spell's), keeps `districts` in opening order (as `p.city.open`, each
  once). Called from `returnHome` and the wipe path of `closeBattle` only (never Lab, Bench or a threshold).
- P26, goldens: no fixture is re-recorded. golden.test.ts line 105 compares `noLedger(replayed.profile)` with
  `golden.profile`, line 107 `{ ...replayed.save, profile: noLedger(replayed.save.profile) }` with `golden.save`;
  add `expect(ledgerOf(replayed.profile).casts).toBeGreaterThan(0)` for the returned trips. The lock tests do not
  change (a threshold never feeds the ledger; if they fail, stop and report). doorway.test.ts "costs the pick, is
  not banked, and opens the doorway": `home` compared without `ledger`, plus `expect(ledgerOf(home).casts).toBe(0)`.
- P27, types: `export type HabitId = 'forkAhead' | 'twoJars' | RecruitHabitId | 'mender';` with the comment
  saying `mender` is the owner's (EN-9); `HabitRule.networkGap?: number; // the owner's own casts join network
  tiles across this many empty tiles (mender: 1)`. ah0-contracts.test.ts line 45 `toHaveLength(10)`, line 47
  `expect(HABIT_IDS.at(-1)).toBe('mender'); // the owner's (EN-9)`.
- The owner (P18): `src/data/apprentices/owner.ts` exports the entry: id `owner`, token O, hue `gilt` (reserved
  for it), 5 HP, move 3, action `pull`, lean Seam/Board as party.md §2 gives it, starter page
  `Splash → Steam → Spark`, habit `mender`; the registry becomes `{ ...PAIR, ...RECRUITS, ...OWNER }` (last, so
  every tie-break keeps its order). Never offered: recruit offers and the recruit parse read `RECRUITS`; check
  every reader of `APPRENTICE_IDS`/`isApprenticeId` (`grep -rn "APPRENTICE_IDS\|isApprenticeId" src`) and list
  them in the report. No household gains the owner here (EN-10 does). If token O or the lean clashes with an
  existing id, stop and report.
- P19, mender: on the owner's own casts two network tiles in a straight line with exactly one empty tile between
  (no state, compound, unit or blocking piece) join; the gap tile is not in the network; never diagonal, never
  round-end fire spread, never bells. Fine print `mender:unit`, `mender:diagonal`, `mender:dusk`. `networks.ts`:
  an optional `gap` argument on `brassNet`, `cloudNet`, `oilNet`, `sameStateNet`, default 0 (today's result).
- Behaviour-neutral for every household without the owner: the golden fixtures (under P26's comparison) and the
  `tests/sim` JSON reporter output unchanged.
Owed by this pack: `ledger` (and `ledger.districts`, from EF) fed by EN-1; the owner def and `mender` row by EN-9
(status Owed). Leaves for later: the handover joins the owner (EN-10); credits read the ledger (EN-11).

Done when:
- EN-1: "EN-1: counts grow on return and on wipe", "EN-1: lab and bench never feed the ledger", "EN-1: city.open
  keeps opening order", "EN-1: the ledger round-trips through save" pass in tests/run/ledger.test.ts;
  tests/run/golden.test.ts and doorway.test.ts pass with only P26's changes; `git status tests/fixtures` is clean.
- EN-9: the nine "EN-9: …" scenarios named in ending-plan row EN-9 pass in tests/scenarios/habits-mender.test.ts;
  tests/engine/ah0-contracts.test.ts passes with only lines 45 and 47 changed; tests/data/integrity.test.ts passes.

Verify: `pnpm vitest run tests/run tests/drawing tests/engine tests/scenarios/habits-mender.test.ts tests/data --reporter=dot`
```

## Pack F8: foundry screens (Default: Sonnet medium; escalate to Sonnet high)

Starts now (F6 merged).

```
Pack G of docs/plans/foundry-plan.md: tasks BF-17 → BF-19 → BF-18.

Read: foundry-plan.md P14 and Pack G's rows; platform-closure-plan.md §4 "KIT-R2 provides" (the slots
`unitArt`, `fx`, `boardLayers`); pattern: src/ui/districts/bathhouses/ and its registry entries, and BF-1's
`BellPiece` and `ToneSheet` in src/ui/districts/foundry/.
Own: src/ui/districts/foundry/**, tests/ui/foundry-*.test.ts (new), the foundry Lab scenario presets.
Contract: board UI only through the KIT-R2 registry slots (no board component edits; src/ui/districts/index.ts
already lists `FOUNDRY_UI`); tones read by colour, pattern, silhouette size and 1–3 pips (P14); hum = a ring and a
dimmed pattern; muffled = the cloud over the bell; Bench lists bells, ropes and the three foes only after met
(DK-14 `met` keys). The rooms are `FOUNDRY_ROOMS_12`, `FOUNDRY_ROOMS_34` and `FOUNDRY_HEART` in
src/data/districts/foundry.ts (not yet in `FOUNDRY_KIT.rooms`; BF-22 merges them): presets read those exports.
`HEART_HOOKS` (src/engine/districts/foundry/peal.ts) is a list per heart layout (`HookTile[][]`): the heart
fixture hangs its bells at `HEART_HOOKS[layout]`.
Owed by this pack: nothing. Leaves for later: the Close sweep checks dark mode on every foundry screen.

Done when:
- BF-17: Lab board at 375×812, light and dark: all three tones on 7x9, a ring mid-animation, a Ringer
  telegraph, a humming and a muffled bell, a struck-bell highlight on a preview; autofixer clean.
- BF-19: Bench lists bells and foes only after met; the Lab places every piece and foe; a preset per lock
  loads (Lab, 375×812, light).
- BF-18: Lab heart fixture 7x9 at 375×812, light and dark: the tune banner with called note and countdown,
  four hung bells at the hooks and one tapped to strike, the Peal telegraph over the board; autofixer clean.

Verify: `pnpm vitest run tests/ui --reporter=dot && pnpm typecheck`
Phone check: yes, port 5191 (rings, the strike tap and the banner carry meaning).
```

## Pack CW0: cartographers contracts (Strong: Sonnet high; escalate to Opus high)

Starts now (any free slot). Runs before F9 (both edit `src/data/districts/index.ts`).

```
Pack 0 of docs/plans/cartographers-plan.md: task CG-W0.

Read: cartographers-plan.md §2 (P1–P18), §4 and every row of §5; district-cartographers.md §0; pattern:
src/engine/districts/bathhouses.ts and bathhouses/types.ts with tests/districts/bh0-contracts.test.ts.
Own: src/engine/districts/cartographers.ts and cartographers/ (new), src/data/districts/cartographers.ts and
cartographers/, src/ui/districts/cartographers/ (new), the module line in src/engine/districts/kit.ts, the
cartographers lines in src/data/districts/index.ts and src/ui/districts/index.ts,
tests/districts/cartographers/acceptance.test.ts (new).
Contract: behaviour-neutral. Declare the piece (`pencil`, `blank`, `outline`, `circle` art key), rule
(`guildHand`), foe (`surveyor`, `eraser`, `tracer`), event (`inked`, `rubbedOut`, `undrawn`, `drawnIn`,
`circled`, `struck`) and room pencil config types of §4 as stubs; `cartographers:*` loot table ids; stub
hearing (already `pages ≥ 5`) and threshold; the district stays `gate: 'drawing'` with no rooms. The module
declares `heart` and `bot` as absent (CG-10 fills them: `heart` through src/engine/districts/frame.ts's
`placeFrame`, `bot` through `BotTerms` as src/engine/districts/bathhouses/bot.ts does). Invariants P1–P3 stated
in the handoff (paper states, blank erases as a fall, the hand plans next round from `deriveSeed(battle seed,
<salt>)`: pick a salt outside 7000–7999 (EN's range, which also holds the heart frames' 7100–7150), and say which).
Owed by this pack: nothing. Leaves for later (§4, copy into the handoff): every item of "Leaves for later
tasks" (CG-1 to CG-14, CG-F1–F4), including the cartographers' `heart` frame (CG-10, salt 7160, next in the frames'
sequence) and `bot` terms; the Registrar joins `paletteOf`'s masters once CG-10 registers the heart (EF's Owed).

Done when:
- CG-W0: `pnpm check:fast` green; no existing test changes; every "<ID>: <rule>" title named in a §5 row
  exists in the acceptance file as `it.fails` or `it.todo`; the handoff lists invariants P1–P3 and the Owed items.

Verify: `pnpm vitest run tests/districts --reporter=dot`
```

## Pack F5: foundry footnote audit (Strong: Sonnet high; escalate to Opus high)

Starts when C3 and ED are merged (all three edit `src/data/lines.ts`).

```
Pack I of docs/plans/foundry-plan.md: task BF-F1.

Read: foundry-plan.md P15, P25 and Pack I's row; footnotes.md §1 and "Rival notes"; pattern: the ink
quarter's audit (footnotes-audit.md §11) and draft (docs/design/footnotes-content/inkQuarter.md with its §7).
Own: src/data/lines.ts (a new BF block at its end, `pending` rows only where the engine does not stamp yet),
docs/plans/footnotes-audit.md (a new §12), docs/design/footnotes-content/foundry.md (new),
tests/scenarios/foundry-audit-lines.test.ts (new; `it.fails` for each pending line, named "BF-F1: <line> fires").
Contract: audit Toll, Coil, Unison, Rivet and Filings against bells, the hum, muffle, retune and the staff
(Filings or Toll on a bell, Unison for lock 3, Rivet on a Clapper); a line exists only for a real behaviour
(FN P5); the draft gives per rune two margin lines × levels I and II and a capstone pair, per solvent one
margin line and capstones, Coil's non-diagonal capstone, and the Carillonneur's note on Toll (level II;
BF-24's placeholder line `toll:network` is confirmed or replaced, P25). Defining words stay true (the IQ-FG
and BR-G1 rule). No engine change. A variant that changes a hit's amount uses `exposedStep`'s pattern (one
guarded term in src/engine/exposed.ts, bridges-plan P21), not a new damage path: say so in the draft.
Owed by this pack: nothing. Leaves for later: BF-FG (a design window) approves the draft; BF-F2 and BF-F3
build it, BF-F3 the Toll note's effect.

Done when:
- BF-F1: §12 of the audit has the table of real behaviours without rows; the draft exists with every pair's
  Combos read in all four combinations; tests/data/integrity.test.ts passes with the new rows (pending rows
  excluded as today).

Verify: `pnpm vitest run tests/data tests/scenarios/foundry-audit-lines.test.ts --reporter=dot`
```

## Pack F9: foundry proof and open (Default: Sonnet medium; escalate to Sonnet high)

Starts when F7, F8 and CW0 are merged. The only sims pack while it runs.

```
Pack H of docs/plans/foundry-plan.md: tasks BF-20 → BF-22.

Read: foundry-plan.md Pack H's rows and P24; platform-closure-plan.md P6 (bot terms); `git log --grep 'BH-18'
--format=%B` (how the bathhouses merged their rooms and tables); pattern: src/engine/districts/bathhouses/bot.ts
and tests/sim/bathhouses-calibration.test.ts.
Own: src/engine/districts/foundry/bot.ts (new), the `bot:` line and the trip hooks in
src/engine/districts/foundry.ts, tests/sim/foundry.test.ts (new); in src/data/districts/foundry.ts the gate, the
`FOUNDRY_KIT` merges and the rooms' `loot` ids; the foundry entry and `PLAYABLE_DISTRICTS` line in
src/data/districts/index.ts; `LootTableId` in src/data/types.ts (the three foundry ids only); one spread line in
src/data/loot.ts; tests/fixtures/saves/ (one foundry pair, per its README); the last BF-8 todo in
tests/districts/foundry/peal.acceptance.test.ts.
Contract: the foundry's `bot.value` scores pulses that will hit foes and members (0 off a foundry board; the
module has `bot: {}` now); the bot plays the Carillonneur through RV as any rival. BF-22 (F6's Owed): register
`foundry:shallow`, `foundry:deep`, `foundry:heart` in `LootTableId` and `LOOT_TABLES` (`...FOUNDRY_LOOT_TABLES`)
and swap the rooms' placeholder `loot` ids ('shallow'/'deep'/'heart') for them, or `rollOffers` throws; merge
`FOUNDRY_ROOMS_12`, `FOUNDRY_ROOMS_34`, `FOUNDRY_HEART` and `FOUNDRY_RECRUIT_KIT` into `FOUNDRY_KIT` as BH-18
did; returning home or a wipe discards the rung bells; flip the gate and add the foundry to
`PLAYABLE_DISTRICTS`. Opening the district changes no Seam or canal golden fixture. No win-rate target.
Owed by this pack: the foundry's save pair (SAVE-1 README); BF-22's loot tables, kit merges and rung-bell
discard; BF-20's bot value (status Owed, from F4 and F6). Leaves for later: calibration (CAL-4); EN-K6 wraps the
foundry frame.

Done when:
- BF-20: "BF-20: the bot prefers the cast whose ring pulses a foe" passes; "BF-20: 200 seeded foundry trips
  never throw or overrun the cap" passes.
- BF-22: golden fixtures identical; a headless trip from room 1 to the heart runs and rolls every room's loot;
  the todo "BF-8: returning home or a wipe discards the rung bells" is a passing test; "SAVE-1: foundry save
  written by <commit> parses and loads" and "… mid-trip save resumes to its next offer" pass; `pnpm check:fast`
  green.

Verify: `pnpm vitest run tests/sim/foundry.test.ts tests/districts/foundry tests/data tests/run tests/app/save-compat.test.ts --reporter=dot`
Sims: `tests/sim/foundry.test.ts` for BF-20.
```

## Pack O: ink footnote follow-ups (Fast: Haiku high; escalate to Sonnet medium)

Starts when ED is merged.

```
Pack O of docs/plans/platform-closure-plan.md: task FU-21.

Read: docs/design/footnotes-content/inkQuarter.md §8; platform-closure-plan.md P9 and row FU-21; pattern:
the `wax-cloud-*` scenarios in tests/scenarios/footnotes/ink-wax.test.ts.
Own: src/engine/solvents.ts (the `wax-cloud-smother` check in `wax.onHook` only), src/data/footnotes/inkQuarter.ts
(the texts of wax-cloud-smother, sentence-mark-peel, levy-mark-peel, sentence-unit-collar),
tests/scenarios/footnotes/ink-*.test.ts.
Contract: `wax-cloud-smother` keeps its id; its text becomes "A wax mark does not melt in fire while a cloud
stands beside its bearer: the steam keeps the wax cool." and its check reads a cloud on any 4-neighbour of
the bearer instead of its own tile. Clauses: both `*-mark-peel` texts end "A bound mark is released, not
peeled."; `sentence-unit-collar` adds "(born brass is not a collar)". No other behaviour changes.
Owed by this pack: nothing. Leaves for later: none.

Done when:
- FU-21: "FU-21: wax-cloud-smother keeps a wax mark from melting in fire beside a cloud", "FU-21: without a
  cloud beside it the mark melts as before" and "FU-21: wax-cap-seal holds through a real wax invention cast"
  pass; "wax:cloud fourCombos" passes; tests/data/integrity.test.ts passes.

Verify: `pnpm vitest run tests/scenarios/footnotes tests/data --reporter=dot`
```

## Pack I: rivals and events leftovers (Default: Sonnet medium)

Starts when F5 is merged (FU-5 edits `src/data/lines.ts`).

```
Pack I of docs/plans/platform-closure-plan.md: tasks FU-2 → FU-3 → FU-4 → FU-5.

Read: platform-closure-plan.md Pack I's rows; TECH.md §3 "Authoring a rival"; pattern: `removeTrickObject`
and `LockLost` in src/engine/rivals/tricks.ts.
Own: src/engine/rivals/**, src/engine/events.ts, src/data/footnotes/auras.ts, the afterglow rows of src/data/lines.ts,
tests/rivals/**, tests/scenarios/footnotes/auras*.test.ts, and the suites that assert `jarOpened`/`jarCrumbles`
(FU-3; list them in the report).
Contract: FU-2 `LockLost` gains `met` and `spent`; FU-3 `jarOpened` and `jarCrumbles` carry the jar id;
FU-4 a trick may add an arrival cause that enters FD's pipeline with its entered tiles; FU-5 the afterglow
margin lines with the events they need.
Owed by this pack: nothing. Leaves for later: none.

Done when:
- FU-2: "FU-2: a lock fails as spent when its charge is gone and met when its goal is reached" passes.
- FU-3: "FU-3: a wick order names the jar that opened or crumbled" passes.
- FU-4: "FU-4: a trick's arrival cause enters FD's pipeline with its entered tiles" passes; tests/rivals unchanged otherwise.
- FU-5: each new row fires in a scenario; tests/data/integrity.test.ts passes.

Verify: `pnpm vitest run tests/rivals tests/scenarios tests/data --reporter=dot`
```

## Pack MIX: rule pairs (Default: Sonnet medium)

No other sims pack running. Gates ending Pack E (EN-2), with EN-G0.

```
Pack F of docs/plans/platform-closure-plan.md: task MIX-1.

Read: platform-closure-plan.md row MIX-1; pattern: tests/sim/glyph-identity-fuzz.test.ts.
Own: tests/sim/rule-pairs.test.ts (new).
Contract: tests only; every pair among boil-over, collapse, bells, writs, current and the Seam hands on one
board, seeded; a failing pair is filed as a task in the report, not fixed here.
Owed by this pack: nothing. Leaves for later: the cartographers' guild hand joins the pairs when CG-2 merges.

Done when:
- MIX-1: "MIX-1: <ruleA> x <ruleB> never throws", "… never overruns the event cap", "… projection equals final
  state" exist for every pair; the report lists any failing pair.

Verify: `pnpm vitest run tests/sim/rule-pairs.test.ts --reporter=dot`
Sims: this file only.
```

## Pack G: shared scenario-log verification (Default: Sonnet medium)

```
Pack G of docs/plans/platform-closure-plan.md: task BL-110.

Read: platform-closure-plan.md row BL-110; pattern: the `import.meta.glob` blocks in tests/data/lines.test.ts
and tests/app/projection.test.ts.
Own: tests/data/lines.test.ts, tests/app/projection.test.ts, tests/scenarios/lines-registry.ts, one new shared
registrar under tests/scenarios/.
Contract: tests only. Both guards read one shared run of the engine suites; the guard titles "lines fired by
the suite (L1)" and "projection drift guard over the engine suites" stay; mocked-suite isolation is kept (a
suite that mocks `$engine/districts/kit` is not imported into the shared run).
Owed by this pack: nothing. Leaves for later: new scenario files are picked up by the shared registrar.

Done when:
- BL-110: each of the two files takes at most 20 s alone (times before and after in the report); each guard
  still fails on one deliberate break (an un-fired line, a projection drift), both reverted.

Verify: `pnpm vitest run tests/data/lines.test.ts tests/app/projection.test.ts --reporter=dot`
```

## Pack M: test and engine leftovers (Default: Sonnet medium)

Starts when C3 is merged (both edit `src/engine/mix.ts`). No other sims pack running.

```
Pack M of docs/plans/platform-closure-plan.md: tasks FU-17 → FU-18 → FU-19 → FU-20.

Read: platform-closure-plan.md P3 and Pack M's rows; pattern: `castWithCap` in tests/engine/cap.test.ts.
Own: tests/sim/canals-fuzz.test.ts (new), tests/engine/cap.test.ts, src/engine/mix.ts (the cap only, if a bug
shows), the Graphite restore code (`grep -n graphite src/engine/schedule.ts src/engine/outOfRoom.ts`),
src/engine/recruits/offers.ts, tests/run/recruit-parse.test.ts (new).
Contract: FU-19: a restore with no free tile places the unit on the nearest free tile or reports it, never two
units on one tile; FU-20: the recruit card parse accepts the seven recruits only (the DK-7 test card still
parses where its test says; once EN-9 has merged, the owner is rejected like a founder).
Owed by this pack: nothing. Leaves for later: none.

Done when:
- FU-17: "FU-17: canal trips at party 1, 2 and 3 never throw or overrun the cap" passes (seeded, small set).
- FU-18: "FU-18: cap sweep at every event index, push onto a jar" and "… mixing chain" pass.
- FU-19: "FU-19: a restore with no free tile places the unit on the nearest free tile or reports it" passes.
- FU-20: "FU-20: a recruit card naming a founder or an unknown id is rejected by the save parser" passes.

Verify: `pnpm vitest run tests/engine tests/run tests/sim/canals-fuzz.test.ts --reporter=dot`
Sims: tests/sim/canals-fuzz.test.ts for FU-17.
```

## Pack K: map and bathhouse UI (Default: Sonnet medium)

```
Pack K of docs/plans/platform-closure-plan.md: tasks FU-9 → FU-10 → FU-11 → FU-12.

Read: platform-closure-plan.md Pack K's rows; pattern: `solvedArt` in src/ui/districts/canals/index.ts.
Own: src/ui/components/map/DistrictNode.svelte, src/ui/districts/bathhouses/**, the meter component the
bathhouses use, docs/plans/bathhouses-verification.md (one line).
Contract: screens only; the threshold label comes from district data (canals keep "Try the lock"); no
engine change.
Owed by this pack: nothing. Leaves for later: dark-mode sweep at Close.

Done when:
- FU-9: Map at 375×812, light: Bathhouses names its own action, Canals still "Try the lock".
- FU-10: Map with the dome solved, light and dark.
- FU-11: Combat at the bathhouse heart on the tallest board, 375×812: row 9 fully visible.
- FU-12: one screenshot per bathhouse footnote margin subject at 375×812; findings in bathhouses-verification.md.
- autofixer clean on every changed component.

Verify: `pnpm typecheck && pnpm vitest run tests/ui --reporter=dot`
Phone check: yes, port 5192.
```

## Pack L: Seam and ink UI polish (Default: Sonnet medium)

```
Pack L of docs/plans/platform-closure-plan.md: tasks FU-13 → FU-14 → FU-15 → FU-16.

Read: platform-closure-plan.md Pack L's rows; the `verify` skill's states list; pattern: src/ui/districts/seam/.
Own: src/ui/screens/{Map,Cleared,TripPage}.svelte, src/ui/components/map/SetOutSheet.svelte, src/ui/districts/seam/**,
src/ui/districts/inkQuarter/**, src/ui/components/board/StepLayer.svelte.
Contract: layout and contrast fixes only; no engine change.
Owed by this pack: "The margin answered" card (SM-12/14) phone check and the StepLayer pill (SM-2) from the
status file's Rough edges. Leaves for later: none.

Done when:
- FU-13: the autofixer reports no issues for Map, Cleared and SetOutSheet.
- FU-14: the card at 375×812 in light (Seam-heart profile, a proven cluster, one fight); a fix if it overflows.
- FU-15: Combat at the Seam heart, 375×812: the Marginalia's "16/16" readable.
- FU-16: the ink room, a term card, the clock seal and the stamp preview in dark at 375×812, readable.

Verify: `pnpm typecheck && pnpm vitest run tests/ui --reporter=dot`
Phone check: yes, port 5193.
```

## Pack J: bathhouse engine leftovers (Default: Sonnet medium)

```
Pack J of docs/plans/platform-closure-plan.md: tasks FU-6 → FU-7 → FU-8.

Read: platform-closure-plan.md P4 and Pack J's rows; bathhouses-plan.md P7; pattern: `BATH_INTRUSION` in
src/data/districts/bathhouses.ts.
Own: src/engine/districts/bathhouses/** (not bot.ts, heart.ts or heartFrame.ts), src/engine/districts/intrusion.ts,
src/engine/turn.ts (`vents` only), src/data/districts/bathhouses.ts (the intrusion block), tests/districts/bathhouses/**.
Contract: FU-6 wires the thermae vent floor through `IntrusionSpec.terrain`; FU-7: a vent beside a living
boilerman puffs even when a state lies on it, other vents keep today's rule; FU-8: the attendant's and
boilerman's plans read the same footnotes as their resolve. If a design reading is unclear, stop and report (P4).
Owed by this pack: the `vents` rough edge (status). Leaves for later: none.

Done when:
- FU-6: "FU-6: a thermae floor's vents puff at dusk" passes; `checkFloor` passes; lower-seam-floor suites unchanged.
- FU-7: "FU-7: a boilerman's vent puffs over a standing state; other vents do not" passes.
- FU-8: "FU-8: a slick footnote does not make the shove telegraph differ from the shove" passes.

Verify: `pnpm vitest run tests/districts/bathhouses tests/districts/lower-seam-floor* tests/engine --reporter=dot`
```

## Pack B1: crossroads note (Default: Sonnet medium)

```
Pack B of docs/plans/platform-closure-plan.md: task FU-1.

Read: platform-closure-plan.md row FU-1; `git log --grep 'BR-7' --format=%B`; pattern: `warn` on
`CrossroadsChoice` and how src/ui/screens/Crossroads.svelte draws it.
Own: `CrossroadsChoice` in src/engine/districts/types.ts (one optional field), src/engine/districts/bridges/trip.ts
(the span choices' note), src/ui/screens/Crossroads.svelte, tests/run/crossroads-note.test.ts (new).
Contract: `CrossroadsChoice.note?: string` — a ledger line shown under the label; a choice without one renders
as today; it survives a save through the stored `TakenChoice` only where today's fields do (no new saved field).
Owed by this pack: nothing. Leaves for later: none.

Done when:
- FU-1: "FU-1: a choice note reaches the crossroads card data and survives a save" passes; screenshot of the
  bridges span cards at 375×812, light, a note line under each label, and a choice without a note unchanged;
  autofixer clean on Crossroads.svelte.

Verify: `pnpm vitest run tests/run tests/districts/bridges --reporter=dot && pnpm typecheck`
Phone check: no (the orchestrator checks it with the wave's screens).
```

## Pack H: bundle and precache cost (Default: Sonnet medium)

```
Pack H of docs/plans/platform-closure-plan.md: task BL-111.

Read: platform-closure-plan.md row BL-111; vite.config.ts (the PWA block); pattern: none, measure first.
Own: vite.config.ts, src/main.ts, src/app/App.svelte (the screen imports only).
Contract: offline play survives: with the service worker installed and the network off, the home, a Seam
trip and the Lab load; `globPatterns` still precaches every chunk.
Owed by this pack: nothing. Leaves for later: EN-4's worker chunk follows the same split.

Done when:
- BL-111: `pnpm build` sizes before and after in the report; Lab and Gallery are separate chunks; the offline
  check passes in the browser (offline emulation), screenshots at 375×812.

Verify: `pnpm build && pnpm vitest run tests/app --reporter=dot`
Phone check: yes, port 5191 (offline load).
```

## Close-outs (platform-closure Pack N; orchestrator, not a pack-worker run)

Platform-closure Pack N (CL-1 → CL-5) runs last, by the orchestrator in a design window, after every pack above and the tracks that finish the built plans: DESIGN §11 and TECH §7 rows for FD, DK, RV, FN, SM, IQ (write only the missing ones), the five verification files (SM-15 among them), five `code-review` runs, records and the ledger, full `pnpm check`.

## Written in a later design window

| Pack | Tasks | Starts when |
|---|---|---|
| EN-G0 | go/no-go on D5's report (EN-S2) and the player's phone timings on its dev page; limits in `src/data/tuning.ts` | D5 merged and the player's timings in |
| BF-FG | orchestrator review of the foundry footnote draft; brief for Pack J (BF-F2 → BF-F3) | F5 merged |
| EN-12 | the handover text draft (orchestrator, docs only) | any design window |
| CG A… | cartographers Packs A–J briefs | CW0 merged |
| EN E… | ending Packs E–L briefs (E needs EN-G0 go and MIX-1) | EN-G0 |
| CL | platform-closure Pack N | the end |
