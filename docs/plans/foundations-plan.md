# Foundations: one arrival pipeline and the engine contracts

> Design: [rune rules](../design/rune-design-final.md) §3–§7, [audit](rune-redesign-audit.md), [party](../design/party.md) §1 and §0d, [districts](../design/city-and-districts.md) §5 (drift details). Roadmap: **BL-128** (groups BL-105, BL-106, BL-107, BL-108, BL-109, BL-112, BL-123). Brief: [build-program.md](build-program.md).
> State: Drafted (not approved)
> Scope: make movement, delayed effects, the event cap and the event log trustworthy before AH, DK and the district plans build on them.

## 1. Scope and settled rules

Delivers:

- **One arrival pipeline** (BL-108): every way a unit or board object comes to stand on a tile goes through one engine entry point that fires the same arrival hooks (marks spreading into clouds and Bind *enters*, step-jars, stains, Wax/solvent hooks, later habits, writ tiles and district terrain), applies the same exemptions (swimmers, fliers, anchored), and emits events that playback projects to the same board the engine ends on. Today's causes (walk, push, slide, Swap, current drift, Pitch drift, Draw, Graphite restore) move onto it; the coming ones (Pull, Hop, the basic Swap, return to sender, gargoyle carry, a foe's swap, barge cargo) are built on it by their owners.
- **Delayed invention context** (BL-105), **dusk-jar identity** (BL-106), **no state change after the 500-event cap** (BL-107): reproduce first, then fix.
- **Authoritative event contracts** (BL-109): the log states what playback now guesses.
- **Stable footnote variant IDs and explicit learned Bind events** (BL-123).
- **Save/battle fallback resilience** (BL-112), kept small.

Settled rules this plan keeps, not re-decides: design §4.4 (crush, slide, drop, no pinball), §6.4 limits 1–6, J1–J5 (jars), R7–R8 (unit targets follow the unit, triggers read the cast-start snapshot), the drift details (city §5: *a drifting unit isn't inked by a puddle it lands on*, a drifted member loses its undo), party §1 (Pull, Hop and Swap land as arrivals; anchored and flying foes can't be swapped), §0d (the runaway's Fuse jars also open when she steps onto them).

Leaves out: the actions and habits themselves (AH), district terrain, cargo and writs (DK and the district plans), footnote levels (FN), the household save reset (HC), the development event inspector (BL-84, optional tooling).

## 2. Proposals

- **P1 · Arrival is a cause plus a tile list.** A mover calls one function with the unit (or object), the tiles it *entered* in order, a `cause` (`walk`, `push`, `slide`, `pull`, `hop`, `swap`, `drift`, `return`, `carry`, `restore`, plus kinds DK registers), the `origin` of what moved it, and whether the last tile is the **landing**. Hooks declare whether they answer every entered tile or only the landing. Reason: today each mover hand-calls a different subset (`movement.ts::moveMember` calls `notify` then `stainMarks`; `push.ts::push` calls `notify` per tile and never stains; `runes/actions.ts` Swap notifies without staining; `current.ts::driftUnits` and Graphite's restore call nothing).
- **P2 · Which tiles count as entered** (keeps current behaviour where it exists): walk = landing only (you pick your path; the preview shows it); push, slide, pull = every tile moved through; hop, swap, drift, return, carry = landing only; `restore` (Graphite) and spawns are not arrivals. Reason: matches today's walk/push split and makes Hop "over a jar" mean something.
- **P3 · Fixed hook order, open registry.** Core hooks run in today's order: solvents (Wax melts first), marks (spread, Bind *enters*), jars, stain, then registered hooks in registry order (habits, writs, terrain). Hooks are data-like entries `{ id, answers: 'each' | 'landing', subjects, causes?, exempt?, run }` composed from per-owner lists: FD owns the core list, AH a habits list, DK the terrain/district list it assembles from district modules. No runtime registration, so the engine stays deterministic and each plan edits only its own file.
- **P4 · Interruption.** If a hook kills, moves or holds the unit, the remaining tiles and hooks for that arrival stop (as `push` does today). Simultaneous moves (swap, a drift step, Graphite) lift everyone, set everyone down, then run arrivals in a stated order (swap: caster then target; drift: the order `driftUnits` resolves).
- **P5 · Exemptions as traits, per hook.** Traits are read from the unit (`flies`, `swims`, `anchored`; AH's body habits add their own). Anchored units never enter the pipeline (they never move). Fliers skip *ground* hooks (stain, drop and district floor terrain) but still open step-jars and spread marks; swimmers are normal arrivals on water. The drift exemption for stains stays (city §5) as one `causes` filter on the stain hook. Reason: one table instead of checks scattered over `push.ts::heldBack`, `current.ts::carried` and foe AI.
- **P6 · Object arrivals use the same pipeline.** A jar, a board piece (DK's cargo crate, a dead letter) or a floating state arriving on a tile fires object hooks: a step-jar arriving under a standing unit opens on it (Pitch drift does this today; **Draw does not** — P6 makes Draw match). A state arriving under a unit does not count as that unit arriving (no stain from a drifting puddle).
- **P7 · Unit drift becomes a real arrival.** A drifted unit now opens a step-jar it lands on, spreads its mark into a cloud and answers Bind *enters*, as a jar drifting onto it already does. **Redefines:** today a unit carried onto a jar does nothing while a jar carried onto a unit opens. Stain stays exempt for drift.
- **P8 · Fire has no arrival effect** (it burns whoever stands in it at round end, `mix.ts::roundEndChemistry`). The hook slot exists, so a later "entering fire burns at once" is one entry. See question Q1.
- **P9 · Delayed runs keep their sealing context** (BL-105). A scheduled entry stores the auras that touched its step, the caster's gifted auras, Fog jar's `weaker` and the habit; `schedule.ts::stepOf` and `jars.ts::runDetached` restore them instead of starting empty. Limit 5 stays: a repeat coming due is spent, and Margin never echoes an echo. `woken` is consumed by the Wick invention that waited, not inherited by a nested Wick, which waits its own round. Whether Repeat re-applies Coil's widening is a design choice, so the default is "yes, the context it was cast with" (Q2).
- **P10 · Jar identity is a monotonic id** (BL-106). `BattleState` gains a jar counter; `jars.ts::newestSeq` (max of the board) can reuse an id after the newest jar opens. Dusk snapshots `(tile, id)` pairs and opens only those.
- **P11 · The cap unwinds** (BL-107). Reaching `CAST_EVENT_CAP` logs `fizzles` and unwinds the cast to its boundary (a sentinel caught by the cast and by `runDetached`), so no helper loop keeps mutating. Helpers emit before they mutate (audit), and a detached run started inside a capped cast does not start. The cap becomes an injectable test option so tests can cut a chain at every event.
- **P12 · Event contracts** (BL-109). `crush` gains `at` and `dir`; `held` gains `rounds`; `jarSealed` carries the jar's id and its visible contents (J3 shows them to both sides; masked fine print stays masked by the existing witnessing rule); a `floated` event replaces Pitch's reuse of `drawn`/`scheduled` for waiting things on water; `released` carries the bound mark's origin. Every relocation event (existing `moved`, `push`, `swapped`, `drift`, and AH/DK's new ones) shares one shape: `unit`, `from`, `to`, `path`, `cause`, so playback can project new causes without new code.
- **P13 · Footnotes by id** (BL-123). The runtime footnote context maps line to **variant id**; `footnotes.ts::hasFootnote` compares ids, and handlers name variant ids. The profile already stores ids.
- **P14 · Learned Bind events are stored** (BL-123). The profile holds `bindEvents`; Bind itself grants *hit* and *enters*; *pushed* and *dies* are granted by the rewards that teach them (the bridges' and the Cartographers' pages, owned by BR and CG). Until HC's reset, loading infers the set with today's rule in `run.ts::knownSetOf`, so no save breaks.
- **P15 · Fallback resilience** (BL-112). If `ensureBattle`'s restart also throws, the trip closes as an abandoned fight back home with a toast (no crash, no loot lost that was already banked); the corrupt-save slot keeps the last three texts. HC's incompatible-save clearing reuses this keep-before-replace path instead of its own.

## 3. Current implementation and risks

- **Movers:** `movement.ts` (`moveMember`, `enemyWalk`, `shove`), `push.ts::push` (per-tile `notify('entered')`, slide, crush, fall), `runes/actions.ts` (Swap rune, Draw's `drawHop`), `current.ts` (`driftFloats`, `driftUnits`, no hooks), `solvents.ts` (`driftWaiting` opens step-jars directly with `openJar`; Graphite's `undoBoard` places units), `bursts.ts` (Shackle throw, Skid plate, Wall ring all go through `push`). `hooks.ts::notify` is a static fan-out to solvents, marks, jars; stains are a separate call in `mix.ts::stainMarks`.
- **Exemptions** live in three places: `push.ts::heldBack`/`flies`/`swims`, `current.ts::carried`, and data flags in `data/enemies.ts`.
- **Delayed context:** `schedule.ts::stepOf` builds bare steps with `auras: []`; `jars.ts::runDetached` starts every flow with `auras: []` and a shared `woken`.
- **Dusk:** `jars.ts::openDuskJars` snapshots coordinates only; `sealJar` assigns `newestSeq + 1`.
- **Cap:** `ctx.ts::emit` silently drops events after the cap; only `resolve.ts`'s step loop checks `fizzled`. Each `runDetached` gets a fresh budget.
- **Playback:** `app/view.ts::projectWith` guesses hold rounds (`ACTIONS.holdRounds`), jar contents (reads the end state's `peek`) and the crushed plate (`wearBesideUnit`). `tests/app/projection.test.ts` and `tests/sim/fuzz.test.ts` already compare projection to final state: they are the safety net to extend.
- **Footnotes/Bind:** `footnotes.ts::hasFootnote` resolves an id to text and compares text; `run.ts::knownSetOf` derives Bind events from methods and open districts.
- **Save:** `app/game.svelte.ts::ensureBattle` retries `startBattle` unguarded; `app/save.ts` keeps one `.corrupt` text.
- **Risks:** the pipeline touches every scenario with movement; changing hook order or tile counts changes existing logs. Mitigation: FD-1 freezes today's behaviour as a matrix of tests before FD-3 moves code, and every intended change (P6, P7, P9, P10) lands as its own test diff. Event-shape changes ripple into `app/view.ts`, `app/fx.ts` and fixtures.

## 4. Contracts

**Provides**

- `engine/arrival.ts`: `arrive(ctx, subject, entered, { cause, origin, landing })` for units and `objectArrives(ctx, object, at, { cause, origin })` for jars, pieces and states; `relocateAll(ctx, moves, cause)` for simultaneous moves; returns whether the move was interrupted (P1, P4, P6).
- `ArrivalHook` type and the composed hook list (P3), with the core entries: `solvent`, `markSpread`, `bindEnters`, `stepJar`, `stain`; the `ArrivalCause` union that DK can extend; `unitTraits(unit)` and the exemption table (P5).
- A **relocation event shape** and a generic playback projection for it (P12), plus the arrival-matrix test helper other plans reuse to prove a new cause or hook.
- Scheduled entries with context (P9), jar ids (P10), the cap sentinel and injectable cap (P11), the event contract fields (P12).
- Footnote context keyed by variant id (P13); `Profile.bindEvents` with grant/infer helpers (P14).
- A guarded battle restart and a keep-before-replace save helper (P15).

**Consumes**

- Nothing from other plans. Assumes HC clears incompatible saves later (P14's inference and P15's backup are what it builds on); assumes AH registers habit hooks in its own list, DK registers terrain and new causes in its own list, and districts (IQ return, BR carry, CN cargo) call `arrive`/`objectArrives` rather than setting `pos` themselves.

## 5. Tasks

| ID | Goal | Owned area | Role | Size | Depends on | Acceptance |
|---|---|---|---|---|---|---|
| **Wave 0: contracts and reproductions** |
| FD-0 | Arrival, cause, hook, trait and relocation-event types; injectable cap option; jar id field; `Scheduled` context fields; footnote-id context type (types only, no behaviour change) | `engine/arrival.ts` (types), `engine/types.ts`, `engine/events.ts`, `engine/ctx.ts` | Strong | S | — | `pnpm check` green; all existing logs unchanged |
| FD-1 | **Arrival matrix:** a table-driven test of every current cause × hook (step-jar, Fuse jar, stain, mark spread, Bind *enters*/*pushed*, Wax, fire) × trait (land, flier, swimmer, anchored), recording today's results; flag the inconsistencies (drift, Draw, walk path, swap stain, Graphite) | `tests/engine/arrival-matrix.test.ts` | Strong | M | FD-0 | Matrix passes on today's code; inconsistencies listed in the test as `todo` cases with the expected P-rule |
| FD-2 | **Reproduce BL-105/106/107:** Coil/Margin on Repeat, Wick and Filings; nested Wick; a jar tail replacing a later queued dusk jar; a reused jar seq; a chain cut by the cap at every event index with projection vs final state | `tests/scenarios/delayed.test.ts`, `tests/engine/cap.test.ts` | Strong | M | FD-0 | Each report reproduced (or recorded as not reproducing, with the case kept as a regression) |
| **Wave 1: the pipeline and the fixes** |
| FD-3 | Build the pipeline and move every current mover onto it (walk, enemy walk, push/slide, Swap rune, drift, Pitch jar drift, Draw, Graphite restore); unify exemptions | `engine/arrival.ts`, `hooks.ts`, `movement.ts`, `push.ts`, `current.ts`, `solvents.ts` (drift/undo), `runes/actions.ts` (Swap, Draw) | Strong | L | FD-1 | Matrix green with only P6/P7 rows changed, each as a reviewed test diff; no mover sets `pos` outside the pipeline (grep check in a test) |
| FD-4 | Delayed context fix (P9) | `schedule.ts`, `jars.ts::runDetached`, `inventions.ts` | Strong | M | FD-2 | FD-2's BL-105 cases pass with P9's outcomes; limit 5 and Glyph lifetime credit tests unchanged |
| FD-5 | Dusk identity (P10) | `jars.ts` | Medium | S | FD-2 | Replacement jar waits until next dusk; ids never reused |
| FD-6 | Cap unwinding (P11) and the emit-before-mutate audit | `ctx.ts`, `resolve.ts`, `jars.ts`, helpers that emit | Strong | M | FD-2 | Cap sweep: projection equals final state at every cut; cast terminates; fuzz bound tightened |
| **Wave 2: contracts on top** |
| FD-7 | Event contracts (P12) and generic relocation projection; drop the guesses in `projectWith` | `engine/events.ts` + emitters, `app/view.ts`, `app/fx.ts` | Medium | M | FD-3, FD-5 | Projection and fuzz tests pass with the guess helpers removed; masked previews disclose nothing new |
| FD-8 | Footnote variant ids (P13) | `engine/footnotes.ts`, handlers reading footnotes, `app/game.svelte.ts`, Lab | Medium | S | FD-0 | Footnote scenarios pass; a variant's text can change without changing behaviour (test) |
| FD-9 | Stored Bind events (P14) | `engine/run.ts`, profile types, save load, Bench | Medium | S | FD-0 | Bench offers the same events on existing saves; a grant helper adds one; codex unchanged |
| FD-10 | Fallback resilience (P15) | `app/game.svelte.ts`, `app/save.ts` | Fast | S | — | A save whose fight fails twice returns home with a toast; three corrupt texts kept; app tests |
| FD-11 | Fixed-scenario sweep: re-run every scenario and fixture touched by FD-3–FD-7, update expected logs where a P-rule says so, and phone check of drift/jar/swap playback | `tests/`, fixtures | Medium | M | FD-3–FD-7 | `pnpm check` green; 375×812 screenshots of a drift onto a jar and a crush into a plate agree with the end state |

## 6. Verification

- **Scenario tests** (`scenario` skill): one per P-rule that changes behaviour (P6 Draw onto a unit opens the step-jar; P7 a rat drifting onto a jar opens it but is not stained; P9 a Coil-touched Repeat; nested Wick waits twice; P10 replacement jar; P11 cap cut).
- **Arrival matrix** (FD-1) stays as the regression net; AH, DK and each district add their cause and hooks as rows.
- **Projection agreement:** `tests/app/projection.test.ts` and the fuzz bot extended with movement-heavy seeds (current lanes, jars, stains, swaps) and the cap sweep; zero disagreements.
- **Phone check** at 375×812 (`verify` skill): drift onto a jar, a slide through a step-jar, a crush into a plate, a dusk with a replacement jar.

## 7. Open questions for the player

- **Q1 · Forced into fire:** should a unit pushed or pulled onto a burning tile take fire damage at once, or only at round end as now? Default: round end only (P8); party §1's "reaches fire" then means "will burn at dusk", and the preview says so.
- **Q2 · Repeat and auras:** should a Repeat or Margin echo next turn keep the auras its first cast touched (Coil's extra reach, Afterglow)? Default: yes (P9), because a delayed copy of your spell should be your spell.

## 8. Execution notes

- **Critical path:** FD-0 → FD-1 → FD-3 → FD-7 → FD-11. FD-2 → FD-4/5/6 runs beside FD-1/FD-3 (different files, except `jars.ts`: FD-5 after FD-3 lands, or merge carefully). FD-8, FD-9, FD-10 are independent and can run any time after FD-0.
- **What others wait for:** AH needs FD-3 (Pull, Hop, Swap arrive through it) and FD-7 (relocation event shape); DK needs FD-0/FD-3 (cause and hook registry); FN needs FD-8; BR/CG need FD-9's grant helper; HC needs FD-10's keep-before-replace path.
- **Rough size:** 12 tasks, about two L-equivalents of work (one L, six M, five S); Strong-heavy because the pipeline changes event order under every scenario.
