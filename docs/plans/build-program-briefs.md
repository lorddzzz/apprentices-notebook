# Build program: briefs for the packs not started yet

Spawn `pack-worker` with the role's model and effort and paste one brief as written ([templates](../../.claude/skills/implement/templates.md)). Delete a brief when its pack merges. A routine window runs these; a design window writes the next ones (listed at the end). Trimmed in the design window of 2026-11-12c: waves 8–13 merged except ED, F5, O and I (their briefs deleted); C3b is new (bridges-plan P24).

## Order for the routine windows

A pack starts when the packs in its "Starts when" are merged. Packs on one line own disjoint files and may run together. None of these runs `tests/sim`.

| Wave | Packs (together) | Starts when |
|---|---|---|
| 8b | **C3b** bridges carried variants (`brink-cap-fall`, `chalk-network-ring`) | now |
| 9 | **ED** ledger and owner | C3b |
| 10 | **F5** foundry footnote audit · **O** FU-21 | F5: ED · O: ED |
| 11 | **I** FU-2–5 | F5 |

File clashes that set this order: **C3b and ED share the cast paths** (`src/engine/resolve.ts` and `src/engine/inventions.ts`; ED also edits `bursts.ts`, whose `unitsNear` C3 changed), so C3b runs and merges before ED starts; ED, F5 and I all edit `src/data/lines.ts`; ED and O both touch `src/engine/solvents.ts`; I owns `src/engine/events.ts` (C3b adds no event). C3b alone edits `schedule.ts`, `turn.ts`, `src/engine/types.ts`, `districts/{api,types}.ts` and `districts/bridges/**`. No pack here needs a UI port.

Every brief's "Leaves for later" items are also in the status file's Owed list.

## Pack C3b: bridges carried variants (Strong: Sonnet high; escalate to Opus high)

Starts now (C3 merged). Runs before ED: both edit the cast paths (`resolve.ts`, `inventions.ts`). Strong by role: it adds a queue kind, a `DistrictModule` reader and writer and a bridges-state field, ordered inside the dusk, and C3 at Default stopped on exactly these two.

```
Pack C3b of docs/plans/bridges-plan.md: task BR-19c (`brink-cap-fall`, `chalk-network-ring`).

Read: bridges-plan.md P24 (this contract, in full) and P21–P23; docs/design/footnotes-content/bridges.md §2
Brink-III, §4 Chalk-network-II and §8; DESIGN §11's last row; pattern: src/engine/schedule.ts (`run`,
`disturbRepeats`, `runScheduled`), `crackedTiles` in src/engine/districts/api.ts with `unsupported` in
src/engine/districts/types.ts and src/engine/districts/bridges.ts, `collapseOnce` in
src/engine/districts/bridges/collapse.ts, C3's tests in tests/scenarios/footnotes/bridges-{brink,chalk}.test.ts.
Own:
- src/engine/runes/brink.ts (new): `brinkOutcome` and `fogWard` moved verbatim from src/engine/resolve.ts
  (commit the move alone first as `refactor:`, every test green and unchanged), then the cap-fall record;
  src/engine/resolve.ts (the import and the Brink branch's calls only; not the settle calls).
- src/engine/schedule.ts (the three functions below; `'brink'` skipped in `runScheduled` and counted in `run`'s
  `again`), src/engine/types.ts (`Scheduled.kind` only), src/engine/turn.ts (one call at the end of `roundEnd`).
- src/engine/inventions.ts (`conduct`: the ring join and spend only), src/engine/districts/api.ts (two
  functions), src/engine/districts/types.ts (two optional `DistrictModule` hooks), src/engine/districts/bridges.ts
  (two hook lines in the module object only), src/engine/districts/bridges/types.ts (`BridgesState`,
  `parseBridges`), src/engine/districts/bridges/collapse.ts (both records, the replay call, the spend).
- src/data/footnotes/bridges.ts (the ring entry; the header's "not here yet" paragraph goes);
  tests/scenarios/footnotes/bridges-brink.test.ts, tests/scenarios/footnotes/bridges-chalk.test.ts,
  tests/districts/bridges/carriers.test.ts (new), tests/data/footnotes.test.ts (the count 239 → 240 only).
Contract (bridges-plan P24; on main: C3's batch, `exposedStep`, `crackedTiles`):
- Ids final. `brink-cap-fall` is already in the data (inert until now): keep its entry and text, "When the target
  falls this dusk, Brink's rest acts once more on the tile it was standing on." Add after `chalk-network-kin`:
  `{ id: 'chalk-network-ring', subject: 'chalk', slot: { line: 'chalk:network', level: 2 },
     text: 'A network cut by a fall still reaches from where the brass stood, once.' }`
  No new event types, lines or `Meets` values.
- Cap-fall carrier. src/engine/types.ts:
  `kind: 'repeat' | 'margin' | 'wick' | 'graphite' | 'filings' | 'thunderhead' | 'pitch' | 'brink';`
  (doc: `brink` is `brink-cap-fall` waiting for `hit` to fall this dusk). src/engine/schedule.ts:
  `export function awaitFall(ctx: Ctx, e: Omit<Scheduled, 'kind' | 'when'> & { hit: UnitId }): void`
    pushes `{ ...cloneData(e), kind: 'brink', when: 'roundEnd' }` and emits nothing;
  `export function replayFallen(ctx: Ctx, fell: readonly { unit: UnitId; at: Coord }[]): void`
    takes every `'brink'` entry whose `hit` is in `fell` out of the queue and, in queue order, runs each once
    as `run(ctx, { ...e, target: { kind: 'tile', at } })` inside `withLine(ctx, 'brink:cracked', …)`;
  `export function lapseFallReplays(ctx: Ctx): void` drops every `'brink'` entry, no event.
  `runScheduled` leaves `'brink'` entries in the queue (beside `thunderhead`); `run` counts `'brink'` in
  `again` (a replay is a repeat: nothing in it waits again). turn.ts: `lapseFallReplays(ctx)` is the last line
  of `roundEnd`, after `slot(ctx, 'late', rules)`.
- Cap-fall record (src/engine/runes/brink.ts, from the Brink branch once the groups are known): when
  `hasFootnote(ctx, 'brink-cap-fall')`, `st.next` is not null and `!flow.repeated`, one `awaitFall` per living
  unit the rest is queued for (every group's targets: plain, weaker, `found`; never `passedOver`), with
  `owner: flow.caster`, `step: st.next`, `target` the Brink target, `hit` that unit's id, `heading` the group
  flow's heading for the target (or null), `origin: flow.origin`, `solvent: group.flow.solvent ?? null`,
  `context: sealedContext(group.flow)`.
- Cap-fall replay (collapse.ts `collapseOnce`): collect `{ unit, at }` for each faller that falls (after the
  right-of-way `continue`; a minion `hold-cap-crush` kills and an elite that re-lands count), then call
  `replayFallen(ctx, fell)` once after the fall loop, before `next` is built. `epilogueFall` never calls it.
- Ring carrier. src/engine/districts/bridges/types.ts:
  `export type BridgesState = { stone: …; originals: string[]; cuts: …; fallenBrass?: string[] };`
  (doc: `chalk-network-ring`'s brass tiles lost to a fall; reading order, no duplicates; P24). `parseBridges`
  reads it as it reads `originals` (KEY-valid strings, deduplicated, sorted in reading order) and sets the key
  only when the list is non-empty; `initBridges` is unchanged. src/engine/districts/types.ts, `DistrictModule`
  beside `unsupported`:
  `fallenBrass?(s: BattleState): readonly Coord[];`
  `spendFallenBrass?(ctx: Ctx, tiles: readonly Coord[]): void;`
  src/engine/districts/api.ts beside `crackedTiles`:
  `export function fallenBrassTiles(state: BattleState): Coord[]` (union over modules in registry order, no
  duplicates) and `export function spendFallenBrass(ctx: Ctx, tiles: readonly Coord[]): void` (every module's
  hook, registry order). Bridges: `fallenBrass` = the recorded tiles still `terrain.drop` (a mended tile is
  forgotten); `spendFallenBrass` (in collapse.ts) removes their keys from the rule state.
- Ring record (collapse.ts `collapseOnce`): when `hasFootnote(ctx, 'chalk-network-ring')`, the falling tiles
  with `isBrass(ctx.s, at)` are read before the clear loop and added to `next.fallenBrass`.
- Ring read (inventions.ts `conduct`): once `net` is found on brass (not the `conduct-cap-cloud` fallback), when
  `flow.solvent === 'chalk'` and `hasFootnote(ctx, 'chalk-network-ring')`, the tiles of
  `fallenBrassTiles(ctx.s)` 4-adjacent to a net tile are appended to `net` before `reach`, `farEnd` and
  `unitsNear` read it, then `spendFallenBrass(ctx, those)` runs (used or not). Events carry the conduct's line
  as Chalk's other variants do.
- Core files read bridges state only through `districts/api`, and the one write to it (the spend) is an api
  call; the queue is core state, read by the bridges module through schedule.ts. Behaviour-neutral without the
  two variants: nothing is queued, `fallenBrass` is never written, goldens, fixtures and scenario output are
  unchanged. Tests import `$engine` before any district file (the kit's lazy import cycle).
Owed by this pack: nothing from the status file. Leaves for later: C3's hygiene items (status Owed, the
bridges Close code review).

Tests first: write every test below as `it.fails` before the engine change (each must fail), then un-mark each
as it lands.

Done when:
- In bridges-brink.test.ts: "brink-cap-fall: a target that falls at dusk takes Brink's rest again on the tile it
  stood on" (a rest whose effect on that tile reaches a unit beside it), "brink-cap-fall: a target that walks
  off, is set down by hold-cap-hang or keeps its tile by right of way gets no replay", "brink-cap-fall: a caster
  who falls in the same collapse has no replay", "brink-cap-fall: the replay keeps half's strength and never
  records another" and "brink-cap-fall: no brink entry outlives the dusk, on a board without bridges too" pass;
  the existing Brink tests pass unchanged.
- In bridges-chalk.test.ts: "chalk:network fourCombos: square or end, then kin or ring" (replaces "chalk:network
  combos: square or end, with kin (ring is not built yet)"), "chalk-network-ring: a Chalk conduct on a network
  cut by a fall reaches from where the brass stood", "chalk-network-ring: the remembered tile is spent by the
  first Chalk conduct that touches it", "chalk-network-ring: a plain Conduct, or none written, does not read the
  fallen tile" and "chalk-network-ring: a tile the Mason mends is forgotten" pass.
- In tests/districts/bridges/carriers.test.ts: "P24: parseBridges keeps fallenBrass and omits it when empty",
  "P24: fallenBrassTiles lists the recorded tiles still fog, in reading order" and "P24: without the two variants
  a dusk fall leaves the bridges state and the queue as before" pass.
- tests/data/footnotes.test.ts passes with only its count changed; tests/data/integrity.test.ts passes;
  tests/districts/bridges, tests/rivals, tests/engine and tests/run pass unchanged; `git status tests/fixtures`
  is clean. Any other test you had to change is a Proposal in your report.

Verify: `pnpm vitest run tests/scenarios tests/data tests/rivals tests/districts/bridges tests/engine tests/run --reporter=dot`
Phone check: no (no screen changes; the orchestrator checks at the wave's end that the Chalk margin lists the ring at level II).
```

## Pack ED: ledger and owner (Default: Sonnet medium; escalate to Sonnet high)

Starts when C3b is merged (C3 and E1 merged; C3b edits `resolve.ts` and `inventions.ts`, and C3 changed `bursts.ts` `unitsNear`, so rebase on main first). Its first attempt left no commits; questions decided 2026-11-12b (ending-plan P26, P27).

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
  guarded call each; in inventions.ts the check sits in `networkTouching`, the conduct's network read, and C3b's
  Chalk ring nodes join after it untouched; in resolve.ts only the `toll` call's `sameStateNet`, not Brink's code,
  which C3b moved to src/engine/runes/brink.ts); the EN block at the end of src/data/lines.ts (new); tests/scenarios/habits-mender.test.ts (new);
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

## Pack F5: foundry footnote audit (Strong: Sonnet high; escalate to Opus high)

Starts when ED is merged (ED and F5 both edit `src/data/lines.ts`; C3 and C3b add no lines).

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
