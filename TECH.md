# The Apprentice's Notebook — Tech Decisions

> Companion to [DESIGN.md](DESIGN.md). Design says *what* the game is; this file says *how* it's built.
> Last updated: 2026-10-21 (growing paper, save migration, sparse notation and shared viewport).

## 1. Constraints (from DESIGN.md §8)

- Plays on iPhone (portrait) first; iPad, Mac, Windows also work.
- Free to build, host, and play. No paid services.
- Fast iteration between Claude and the player.
- Rules and data separate from presentation.
- Local saves.

## 2. Stack

| Concern | Choice | Why |
|---|---|---|
| Language | **TypeScript** (strict) | Types keep rune/material data honest; already decided in DESIGN.md |
| Build / dev server | **Vite** | Instant start, hot reload, trivial static output |
| UI | **Svelte 5** | Least boilerplate for SVG; built-in transitions/tweens make chain reactions easy to *play out* visibly |
| Rendering | **DOM + SVG** | Crisp shapes at any size, easy taps and layout, fits the minimal ink-and-parchment look and turn-based pace |
| Tests | **Vitest** | Same config as Vite; fast |
| Lint / format | **Biome** | One fast tool instead of ESLint + Prettier |
| Package manager | **pnpm** 11, Node 24 | Already installed |
| PWA | **vite-plugin-pwa** | Home-screen install, offline play, auto-update |
| Routing | Hash routes (`#/study`, `#/lab`) | Works on GitHub Pages with no 404 tricks |
| Saves | `localStorage` JSON with a **schema version** + migrations; export/import as text | Survives updates; text export is a backup against iOS storage eviction |

## 3. Architecture

```
src/
  engine/     pure TS game rules. NO DOM, NO Svelte. Deterministic.
              lattice (compile grid → spell description), flow, combat,
              materials/interactions, enemy intents, seeded RNG
  data/       runes, materials, interaction matrix, enemies, encounters
              (typed TS objects, so a typo is a compile error)
  ui/         Svelte components: study, combat, codex, lab
  app/        routing, save/load, PWA glue
tests/
  scenarios/  chain-reaction tests written as readable ASCII boards + lattices
```

Key rules:
1. **The engine never imports UI.** UI calls engine functions and renders their state.
2. **Everything that happens is an event.** Every action resolves into an ordered **event log** (`Bolt hits rat at C4 → rat inked → Spark → ink detonates (3 dmg) → oil at C5 ignites …`). The UI *animates* the log step by step, and tests *assert* on it. This one log is how chains get shown to the player, how they get tested, and how they get debugged.
3. **Seeded RNG.** Any fight can be replayed exactly from a seed + its actions.
4. **Data-driven.** Adding or tuning a rune means editing `data/`, not engine code, wherever possible.

## 4. Validation loop (how Claude checks its own work)

Goal: Claude can verify a change is *correct* without the player, so the player's time goes to judging *feel, UX and direction*.

| Layer | What it checks | How |
|---|---|---|
| Typecheck + lint | Nothing obviously broken | `pnpm check` |
| Engine unit tests | Each rune/material rule does what its one-line rule says | Vitest |
| **Scenario tests** | Whole chain reactions: given a board + lattice + action → expected event log | ASCII boards in `tests/scenarios/`, using the same notation as DESIGN.md |
| Browser check | It renders, taps work, portrait layout fits | Claude opens the dev server in its browser pane at phone size and takes screenshots |
| Deep links | Jump straight to a state | `#/lab?scenario=oil-chain` loads a scenario directly, so neither of us replays to reach it |

**Lab scene (player-facing dev tool):** a free-play grid where you place enemies, terrain and materials, edit lattices with unlimited ink, and cast anything. It's for hunting combos and judging feel. Lab setups use the same format as scenario tests, so a combo found in the lab can become a test.

**Not doing (yet):** a separate debug overlay. The event log covers most of what it would show; we can add a dev-only log panel later if needed.

## 5. Repo, deploy, workflow

- **Repo:** public GitHub repo under `lorddzzz`.
- **Hosting:** GitHub Pages, deployed by GitHub Actions on every push to `main`.
- **CI gate:** typecheck + lint + tests must pass before deploying, so a broken build never reaches the phone.
- **Workflow:** Claude commits **straight to `main`**. Git history is the safety net.
- **Build stamp:** the game shows its short commit hash in a corner, so you always know which build you're playing.
- **iPhone:** open the Pages URL in Safari → Share → *Add to Home Screen*. The app updates itself; if a change seems missing, close and reopen it.
- **Feedback:** the player plays, then tells Claude in the next session. No tooling.

## 6. Services

| Service | Used for | Cost |
|---|---|---|
| GitHub (repo, Actions, Pages) | Code, CI, hosting | Free for public repos |

Nothing else. No backend, no analytics, no accounts.

## 7. Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-10-12 | Svelte 5 + Vite + TS, DOM/SVG rendering | Player said "surprise me"; best fit for SVG and animated chains |
| 2026-10-12 | Public GitHub repo + GitHub Pages | Simplest free hosting; no extra service |
| 2026-10-12 | Auto-deploy on push to main, CI-gated | Player's pick; fastest couch loop |
| 2026-10-12 | Commit straight to main | Player's pick |
| 2026-10-12 | Lab scene from the start; no debug overlay yet | Player wants combo hunting; event log covers debugging |
| 2026-10-12 | Event log as the core engine output; scenario tests; deep links | Player wants Claude to self-validate so loops are fast and their time goes to feel/UX/direction |
| 2026-10-12 | Feedback by talking to Claude | Player's pick |
| 2026-10-12 | Renamed project folder and repo to `apprentices-notebook` | Matches the working title; public repo `lorddzzz/apprentices-notebook` |
| 2026-10-12 | TypeScript pinned to ^6 (not 7) | svelte-check only supports TS ≤ 6 today; revisit when it supports 7 |
| 2026-10-12 | Svelte MCP (remote) added to `.mcp.json` | Current Svelte 5 docs plus an autofixer that catches Svelte 4-isms |
| 2026-10-12 | Biome rule bans UI/Svelte imports inside `src/engine/**` | Enforces "the engine never imports UI" mechanically |
| 2026-10-12 | Skeleton deployed; CI-gate failure test skipped | Live URL, build hash and iPhone Home Screen install verified. A red run is assumed to block deploy via `needs: check`, not tested. |
| 2026-10-13 | Engine layout: `Ctx` draft mutation inside one `structuredClone` per action; `src/data` imports engine types only | Public functions stay pure (previews = call and discard) while internals avoid copy-heavy code; no runtime cycle between data and engine |
| 2026-10-13 | UI state: engine objects in `$state.raw` (structuredClone-safe); logic in plain .ts, reactive wrappers in .svelte.ts | `applyAction` clones its state; a deep `$state` proxy throws `DataCloneError`. Plain .ts logic is unit-testable without a DOM |
| 2026-10-13 | Playback: UI projects events onto a view model, snaps to engine state at the end | Animation needs no rule code in the UI; any projection drift self-heals at the final snap |
| 2026-10-13 | Battle input is a pure reducer (`app/battleInput.ts`: tap + mode → mode + action); previews call `applyAction` and discard; `overlayFor(state, mode)` derives every board highlight; `BattleSession` (`battle.svelte.ts`) only wires them to playback | All interaction logic is unit-tested without a DOM; the board can never show a preview the engine wouldn't produce |
| 2026-10-13 | Projection drift guard: every Lab scenario (demo + 3 end turns) and every encounter (4 idle rounds) must project to the engine's final state | Catches a missing `project` case the moment an event type is added |
| 2026-10-13 | A Bolt that hits a unit gets a flight trail from `aimPreview` (`castLead`), since the engine emits no `lands` event for it | Cheap, exact for player casts; echo recasts keep only the cast pulse |
| 2026-10-13 | Lab keys the battle view by session and unit outros are local | Switching scenarios swaps the board instantly instead of leaving fading tokens behind |
| 2026-10-13 | Persistence: `GameStore` (`game.svelte.ts`) holds the save in `$state.raw`; every lattice edit goes through pure `flow.editLattice` and one `writeSave` (only when the page changed); `loadSave(backend, now)` copies unreadable text to `<key>.corrupt` and starts a new game | The write path is unit-tested with a counting memory backend; a corrupt save is never lost |
| 2026-10-13 | `study.ts` Profile wrappers call the engine's `canPlace` as the final say on placements | One rule source for what fits; a test checks study.ts and the engine agree on every rune and socket |
| 2026-10-13 | Lab battles take members' lattices from the player's profile unless the scenario defines them | The Lab is the place to try the notebook you are building |
| 2026-10-13 | Trip screens derived from `trip.status` (battle / loot / crossroads / cleared), a wipe from `game.wipe`; reload mid-fight recreates the encounter from the trip seed (`startBattle` is deterministic), so a spent charge in an unfinished fight is not kept | The save only changes on `finishEncounter`/pick/push/return: one write per decision, nothing to repair after a closed tab. The live `BattleSession` is never persisted |
| 2026-10-13 | `flow.ts` trip reducers (`setOut`, `startBattle`, `endBattle`, `takeOffer`, `pushOnward`, `goHome`) are pure wrappers over `engine/run.ts`; `GameStore` only commits their result. `endBattle` derives the `WipeSummary` (lost loot, interactions learned) | Whole trip lifecycle is tested in `tests/app/trip.test.ts` with no DOM. A wipe summary is shown once and not saved (the save already lost the loot) |
| 2026-10-13 | `__game.debug.forceWin/forceLose` (`BattleSession.forceEnd`) exist only to verify screens; reachable only through the dev-only `window.__game` handle | Lets the browser checklist reach loot/crossroads/wiped without playing every fight |
| 2026-10-13 | Lab edits are checkpointed: `LabStore` keeps `{state, log, lattices, base, actions}` snapshots (cap 60) pushed before every action (`BattleSession` `onAction` hook) and edit; Undo pops one and `BattleSession.replace` swaps it in. An edit (paint, lattice) rebases: `baseOf(state)` becomes the scenario's start and `actions` restart | One mechanism undoes casts, moves, painted tiles and rune changes; export always replays from the last edit |
| 2026-10-13 | `toScenarioDef(id, base, actions, events)` emits both members' lattices, `hp` for units off their default hp and `intents` from live telegraphs; `tests/app/lab.test.ts` replays the export of every `SCENARIOS` entry and compares lines and final board. Painting only the tile under a unit keeps the unit (`applyEdits`); changing a unit goes through `labSetCell` (fresh hp, no intent) | The scenario list doubles as the round-trip corpus. Shields, charges, round number and rng state are not captured (not in the notation) |
| 2026-10-13 | Code review fixes: the trip records the current fight's actions (`Trip.actions`, save **version 1**, migration 0→1 adds `[]`); `beginEncounter` replays them, `GameStore` commits `recordBattleAction` on every action, and a record that no longer replays restarts the fight with a toast. `parseTrip` also refuses trip states that cannot move on (looting with no offers, crossroads at the heart, 0 HP, actions outside a fight). Supersedes the 'reload recreates the encounter' row | A reload (iOS eviction, the autoUpdate service worker after a deploy) threw away the fight, and reloading on the lost overlay escaped a wipe with the loot intact. One save write per action is small |
| 2026-10-13 | Research slice: `Lattice.runes` is `Placed[]` (`PlacedRune \| PlacedGlyph`, narrow with `isGlyph`); lattice ASCII writes a Glyph socket as `G:<id>` + arrow. `compileLattice`/`inkUsed`/`validateLattice` take an optional `GlyphLibrary` (run.ts passes `glyphLibrary(p)`); a Glyph's inner cells compile in its rotated local frame, inner nodes carry `inner` and the socket as `at`. Identity tests compare `describeLog` of flat vs compiled casts on real boards | Compiling must not change behaviour; one compile path, no separate expansion step |
| 2026-10-13 | Silent `trace` event at the end of every non-echo cast (fired cells + `meaningful`); `describe` returns `null` for it, `describeLog` and playback drop it. Proof masks are written at the end of a trip fight by replaying `trip.actions` (`recordTripProof`); clusters compare in a canonical form invariant under rotation and translation (not mirroring) | Proof needs the exact cells that fired without touching the visible log; the replay is deterministic and short |
| 2026-10-13 | Save **version 2**: Profile drops `research`, gains `solvents`, `vellum`, `bench {trials, known}`, `glyphs`, `proof` (≤ 300 masks per member), `idioms`; migration 1→2 turns research points (and pending research loot) into solvents round-robin. `parseSaveData` validates every new field, and a lattice Glyph must exist in `glyphs` | One migration for the whole slice |
| 2026-10-13 | Built by an orchestrator session (Opus) with Sonnet/Haiku subagents in git worktrees, squash-merged per task with `pnpm check` after each merge. `.claude/launch.json` has a second dev server (`dev-alt`, port 5190) for parallel browser checks | Parallel waves on disjoint files kept main green throughout |
| 2026-10-13 | The `implement` skill codifies orchestration: cheapest-fitting model per task, a tracked `docs/plans/<plan>-status.md`, and usage pacing by projected 5h use (narrow at 80%, wrap at 90%, hold at 96%) with auto-resume after the reset and a weekly guard | v0 lost agents to the limit and stopped too early; the research run worked but kept status untracked |
| 2026-10-14 | Seam deepening state: `Tile.stain/heat/etched/scald`, `Unit.heat/etched`, `TUNING.heatRounds/heatDamage`; board ASCII `$` stained oil, `s` scalding steam, `^` hot, `#` etched (brass only). New events `pierced`, `heated`, `cooled`, `scalded`, `stained`, `etched`, `inked` via `'stain'`; `heated`/`stained` discover `heat`/`stain`. Pierce compiles to `Spell.pierce` and `SpellNode.pierced` (runes after it act on both targets); On Ignite reads the cast's own `ignite` events through a log index | All rules stay events in the log, and scenario boards can set every new state |
| 2026-10-14 | Save **version 3**: `Trip.stats` (`TripStats`, folded per fight by `accumulateStats` from the whole fight log, which `finishEncounter` now takes as a 4th argument and returns as `stats` even on a wipe) and `SaveData.lastTrip` (`TripRecap` with the room's `place` name, read by `#/trip-page` so a reload works; a recap without `place` falls back to the depth title); migration 2→3 adds empty stats and `lastTrip: null`. Layout variants are derived (`variantFor`: `deriveSeed(trip.seed, 2000 + encounter)`), never stored; `placeOf(trip)` names the room and is the battle's title. The doorway is `TripStatus 'doorway'` (resolves to the Study screen); its edits live in a `GameStore` draft until Done, so `applyDoorway(p, t, lattices)` can compare old and new lattices | No migration for variants; the doorway can't refill charges by accident |
| 2026-10-14 | Parallel UI agents: `.claude/launch.json` adds `dev-alt2` (5191) and `dev-alt3` (5192). `preview_start` by name launches from the main checkout, so worktree agents run `pnpm dev --port N --strictPort` themselves and open the URL | Found when agents' previews showed old code |
| 2026-10-16 | Glyph mastery engine: the `trace` event carries `spans` (`NodeSpan`: each node's own stretch of the cast's log, offsets from the first event after `cast`, `to` exclusive; one span per run, so On Kill gives one per victim). `profiler.ts` folds spans into per-version `GlyphRecord`s at battle end in the same replay that writes proof (`recordTripCasts`, `closeBattle`). `glyphLibrary` returns the **effective** view (Economy discount, active extra exit, open cells cut to the allowance) so the compiler just honours it. `SpellNode.viaInner` lists local shape cells walked inside a Glyph. `profiler.ts` and `drafts.ts` never import `run.ts` (run.ts imports them); `revision.ts → run.ts → drafts.ts → revision.ts` is a function-level ESM cycle, harmless | Attribution by log index needs no new event types and keeps every other event byte-identical |
| 2026-10-16 | Save **version 4**: `GlyphDef.version/params/extraExit/draft?`, `PlacedGlyph.args?` (by local cell key; an arg the compiler can't honour falls back to the default, and the validator ignores `'arg'` issues so a stale arg never blocks a load), `Profile.glyphArchive/glyphRecords` (keys `id@N`)/`drafts`, `SpellTally.cells/fired`, `TripStats.elegance`, loot `{kind: 'draft'}`. Migration 3→4 is additive. Notation for args: `G:g1>[1,0:Smear]`, several in local reading order, arrow suffix on arrow runes. Fixture save for UI checks: `tests/fixtures/glyph-mastery-save.json` | One migration, all additive |
| 2026-10-16 | Economy calibration: `tests/sim/calibrate.test.ts` (skipped unless `CALIBRATE=1`; `CALIBRATE_CAREERS`, `CALIBRATE_TRIPS`, run with `--silent=false`). 2400 bot trips, 8803 Glyph casts, non-overlapping 10-cast windows of harm ÷ base ink: overall p25/p50/p75/p90 = 0.50/0.62/1.00/1.10 (Spell 0.60/0.68/1.03/1.13, Payload 0/0/0.20/0.44). `economyTiers` = 0.7/1.0/1.3. The fuzz gained a Glyph-mastery test (`MASTERY_SEEDS`, default 6) that revises, reverts, opens cells, sets args and extra exits between real trips | Bots aren't players: a first guess to tune by playing |
| 2026-10-16 | Orchestration pacing changed (player's call): near the 5h limit keep starting the smallest unblocked task instead of holding at 90%; at 96% send one best-effort nudge. A cut-off task is restarted after the reset, the same as waiting. In this build F1 started at 88% and finished; U6 started at 94% and was resumed after the reset with its context | Unused window budget is wasted |
| 2026-10-19 | **Rune redesign engine:** lattices compile to `Step` trees (action/kind, trigger, shape, fork, seal, split); `resolve.ts` runs them in wiring order with unit targets following their unit; triggers read a deep-copied `Snapshot` taken at cast start; mechanics live in one module each (`mix`, `bursts`, `networks`, `push`, `marks`, `jars`, `schedule`, `inventions`, `solvents`, `leans`) and talk through a static `hooks.notify` fan-out (solvents, then marks, then jars) | Keeps ordering in one place and each rule in its own file, so parallel builders owned disjoint files |
| 2026-10-19 | **Every event carries `EventMeta`:** `line` (the fine-print line that caused it, set by `withLine`) and `origin` (the cast that made the board object, set by `withOrigin`); a per-cast cap of 500 events fizzles runaway chains | Witnessing, the masked preview, idioms and lifetime elegance all read the log instead of re-deriving causes |
| 2026-10-19 | **Fine-print integrity and projection drift tests re-register the engine suites** inside one file (spying on `runDraft`) and check rows ↔ fired lines and view ↔ engine for every run | Vitest isolates files; a shared log pass is a follow-up (BL-100) since `pnpm check` now takes ~70 s |
| 2026-10-19 | **Save v7, no migrations:** an older save shows "from an older edition" and starts fresh; the migration chain and its fixtures are deleted | The player restarts from scratch; no dead migration code |
| 2026-10-19 | **Invention library in `BattleState.inventions`;** footnote texts passed to `applyAction(state, action, footnotes)` | Battles replay deterministically from state + actions |
| 2026-10-24 | **Household core (HC):** save v9 is breaking (every older version takes `OlderEditionError`, the old text is kept via `addCorrupt`, `legacyV7.ts`/v8 reader removed; household, `ink`, `lattices`, `proof` keyed by members and validated on parse). `P` notation marks start points on standable tiles (may share a state or water; never a unit, plate, gate or grate); room data uses `P` only (`checkRoom`: 5–7 × 6–9, 4+ `P`, no apprentice tokens); apprentice letters stay legal in scenarios/tests/Lab. Party placement = seeded shuffle of the start points with `deriveSeed(trip.seed, START_SALT + encounter)` (`START_SALT = 6000`, never stored; no trip → `deriveSeed(seed, START_SALT)`; thresholds `THRESHOLD_SEED = 1`), battle rng untouched. Sweep `tests/sim/household-sweep.test.ts` (`HOUSEHOLD_SWEEP=1`) | Deterministic, replayable placement without storing spots; one save format |

| 2026-10-20 | **Growing pages W0/N1 (build in progress):** explicit growing shapes use signed stable coordinates and disposable sparse framing; fixed ASCII keeps its holes. Separate lattice labels/keys leave battle notation unchanged. Growing text uses `@lattice 1 growing` with one signed coordinate/token per occupied cell. External import policy is 8 MiB UTF-8, depth 64, collection 32,768, aggregate fields/slots and tokens 100,000, work 1,000,000; measured desktop proxies and frozen v7 baselines live in `tests/fixtures/growing-pages/` | No bounds-area allocation or coordinate rebasing; import safeguards remain separate from ink. Save v8 migration and growing editors are still pending, tracked in the growing-pages status file |

| 2026-10-20 | **Growing viewport V1:** session-keyed in-memory anchor/offset/pitch transforms, bounded edit windows and sparse Fit miniatures. One surface owns tap/hold/pan/capture/cancellation; overview navigates without edits. Subpixel markers retain exact cell identity through hit testing; no camera state is saved or added to undo | Keeps editing targets60px, preserves work position across edits/erasure, and avoids bounds-sized DOM/SVG surfaces. Game editor integration remains pending |

| 2026-10-21 | **Growing engine E1:** save v8 keeps sparse placements; a frozen v7 decoder validates historical member geometry and preserves keys, proof, records and replay. Resource refusal retains text and blocks ordinary writes with an export panel. Compiler/resolver/tree traversal and engine cloning use explicit work stacks; Bend history is linked until materialized | Signed page identity survives above/left growth without changing battle coordinate validation. Deep accepted spells no longer rely on the JavaScript call stack; existing game editor must be replaced before deployment |

| 2026-10-21 | **Growing app A1:** Lab working pages convert to growing paper; sparse exports, battle snapshots and undo preserve coordinates. Stable editor session keys separate members and home/doorway/Lab, renewing only at explicit import/reset/load boundaries; no navigation in save or undo. Flow-zone traversal is iterative | UI integration can preserve camera position across ordinary edits while reset/import starts fresh. A 20,000-cell flow-zone regression and signed Lab cast/undo/replay checks pass |
| 2026-10-29 | Actions and habits (AH): `HABITS[id].rule` holds only the bent field (`jarLimit`, `forkAhead`, `fuseOnStep`, `tallyMarkWeight`, `wards`, `holdExtra`, `unisonReach`, `touchReach`, `eraseRestores`); the engine reads `habitOf(unit)` (member lean, foe `trick`) and `habitRule(unit)`; flows and jars carry the id. Harm: `dealDamage(…, { harm })` with `HarmKind`; `guardHarm` runs `HARM_GUARDS` (habit wards first); a cancelled hit logs `unharmed` and is not a hit. The headline event carries `habit` and `maskPreview` never masks it; edge cases are ordinary lines with the habit as subject. `BattleState.erased` is the Erase record. Fuzz: `tests/sim/actions-habits-fuzz.test.ts` (`AH_FUZZ_SEEDS`). |
| 2026-10-29 | Adding a district (DK-18): copy `tests/fixtures/district-kit/fixture-district/`. Data: `src/data/districts/<id>.ts` exports one `DistrictData` (rooms, edge, `ret`, `checkpoint`, `hear`, `gate`, map, lean), listed in `districts/index.ts` (`DISTRICTS`; `PLAYABLE_DISTRICTS` once it has rooms). Engine: `src/engine/districts/<id>.ts` exports one `DistrictModule`, added to `DISTRICT_MODULES`; omit unused hooks. Ids are `<id>:name` (rules, pieces, steps, offer kinds, shape); duplicates throw at load. Rules pick a slot (carry / afterChemistry / late); pieces use `{token}` in layouts with onArrive/onTurnEnd/onStruck/onHit and `removeFromRoom` for falls; trip shape = `returnBlocks`, `choices`, `roomSetup`, `afterRoom`, `offersFor` with JSON state and a forgiving `parseState`; a stand-in heart is `EnemyDef.script` with `standIn: true`; offer kinds `roll`/`joinPool`/`onPick`/`onBank`/`onWipe`/`parse`/`limitPerTrip`. Test with a mocked kit as in `tests/run/kit.test.ts`; never load the engine inside a `vi.mock` factory (it binds the unmocked kit or hangs). |
| 2026-10-29 | Recruitment (RC): `profile.recruits` `{ notes: ApprenticeId[] }`, optional (absent = none); `parseRecruits` accepts door arrivals only, each once, none already in the household; written by `knockAtDoor(p, recruitJoined)` (goHome, the wipe path in `endBattle`, `settleAtDoor` on import/load), removed by `welcome`. `src/engine/recruits.ts`: `preconditionsOf`, `isReady(p, id, {trip, atLandmark})` (trip pages count), `waitingFor`, `guaranteesFor`, `recruitOffers`, `doorArrivals`, `welcome`, `isRevealed` (the only reveal test the UI may use); placement is `DistrictKitData.recruit`/`recruitPages`. DK-R1: `OfferSource { kinds, contributors }` in `trip/offerKinds.ts`; `RECRUIT_OFFERS` is one line in `OFFER_SOURCES`; contributors roll on their own seed (salt 5000 + room) so table draws never shift. Sim: `tests/sim/recruits.test.ts` (`RECRUIT_FUZZ_CASES`, `RECRUIT_CAMPAIGN_SEEDS`, `RECRUIT_BOT_SEEDS`). Placing a recruit: two data lines, see recruitment-verification.md §5. |
| 2026-10-29 | District kit at call time (DK-19): a district module's hearing kinds (`conditionHolds` falls back to `KIT.hearKinds`; unknown kinds throw), rules (`boardRules()` replaces the eager `BOARD_RULES`) and events (`DistrictEvent` ∈ `GameEvent`, `isDistrictEvent`; `describe` reads `KIT.events[type].describe`; view/fx/timing no-op) are read from `KIT` at call time. Engine files import `KIT` from `./districts` (the index), not `./districts/kit`, to avoid mock-order traps. |

## 8. Repo & tooling

**Versions (pinned by caret, checked 2026-10-12):** svelte 5.57, vite 8.3, @sveltejs/vite-plugin-svelte 7.3, typescript 6 (see log), svelte-check 4.7, vitest 5, @biomejs/biome 2.5, vite-plugin-pwa 2.0, @vite-pwa/assets-generator 2.0, workbox-window 7.4.

**Scripts:** `dev` (host-exposed so the iPhone can reach it), `build`, `preview`, `test`, `test:watch`, `lint`, `format`, `typecheck`, **`check`** (typecheck + lint + test, the one gate, also run in CI), `icons` (regenerate PWA icons from `public/icon.svg`).

**Aliases:** `$engine`, `$data`, `$ui/*` (tsconfig + vite).

**Build stamp:** `__BUILD__` is the short git SHA (`GITHUB_SHA` in CI, `git rev-parse` locally, `dev` as fallback), shown in the bottom-right corner.

**PWA:** `vite-plugin-pwa`, `autoUpdate`, Workbox precache of the whole app; manifest scope and start URL are `/apprentices-notebook/`; iOS meta tags and safe-area CSS in `index.html` / `theme.css`.

**AI setup:**
- `AGENTS.md`: project rules (architecture, validation, workflow, Svelte 5 runes only).
- `.claude/settings.json`: shared permissions and a PostToolUse hook that runs Biome format on edited files.
- `.claude/launch.json`: `dev` server entry for the browser pane, plus `dev-alt` (port 5190) for a second session or agent.
- `.claude/skills/`: `verify` (self-validation checklist), `scenario` (writing scenario tests), `design-round` (how to run a design round), `implement` (orchestrating a plan with subagents and usage pacing).
- `.mcp.json`: Svelte MCP (`https://mcp.svelte.dev/mcp`).
- Built-in browser pane covers interactive checks; Playwright is not used yet.
| 2026-10-17 | Districts as data (`src/data/districts.ts`: `DISTRICTS`, `encountersOf`); a `Trip` carries its `district`; the Seam keeps its variant salt (`2000 + encounter`) and other districts use `3000 + 100·index + encounter`. A Seam identity test (`tests/run/seam-identity.test.ts` against a fixture written from the commit before the refactor) gates every change: never regenerate it | Old saves, scenarios and replays must not move |
| 2026-10-17 | Save v5 (migration 4 → 5): `Profile.city { heard, open, hearts, solved, trips, fresh }`, `trip.district`, `lastTrip.district`, `stats.heard`; `parseCity` enforces heard ⊇ open ⊇ hearts and the Seam open | Everything before v5 is Seam-only |
| 2026-10-17 | `Intent` is a union (`attack` / `summon` / `flare`); readers narrow on `kind`. Board tokens `w>`/`wv`/`w<`/`w^` (water; the arrow belongs to the water), `h` grate, `g` gate, `l` lamp; foes `e`, `n`, `m`, `M`. `blocksUnits(tile)` (plate, gate, grate) drives walks, pushes, slides and projectiles; `blockerName` names what stopped a shot | One place for "what blocks"; the log says grate or lock gate |
| 2026-10-17 | Threshold battles use `BattleSpec.objective` (the drafts' goal DSL): `checkEnd` wins on the goal, checked on each action's log, never on an empty board | Reuses the drafts' checker |
| 2026-10-17 | Orchestrated UI agents run vite from their own worktree on a spare port (`pnpm dev --port 519x --strictPort`): the shared preview ports serve the main checkout | Agents were screenshotting old code (BL-87) |
| 2026-10-17 | Save v6 (`migrateFolios`): `DraftCopy.page`; unmended copies reset to the new folio's start, draft Glyph v1 records raised to bronze. Folio content is one file per folio in `src/data/folios/`; `DraftDef.pages` replaces `test`/`hint`. `draftTest(d, test, inside)`, `folioRun`, `trayCounts`/`trayIssue`, `turnPage`. Intended solutions live in `tests/helpers/folio-solutions.ts` (tests only); `tests/helpers/folio.ts` has `checkFolio` and `oneEditNeighbours` (one-edit search, ~1 s for all folios) | Content tasks ran in parallel on disjoint files; solutions stay out of the shipped data |
| 2026-10-17 | `insideFlow(inside)` compiles a Glyph's inside alone into a `CompiledLattice` in local cells; `FlowOverlay` takes an `origin` so it can draw on a canvas that doesn't start at 0,0 | Flow lines on the draft page and the revision editor, same overlay as the board |
| 2026-10-19 | `Origin.glyphAt` identifies the exact Glyph socket for lifetime mastery; resolver stamps payload steps and sealed objects. `ScenarioDef.inventions` is an optional library; Lab edits and exports preserve it. Lantern Walk follows jar movement events | Deterministic lifetime attribution and reproducible invention demos |
| 2026-10-19 | Shield gain events carry the resulting total and expiry round. Playback uses these values rather than guessing across owner-turn repeats | T1 seed 37 exposed a Guard refresh that preserved shields in the engine after playback cleared them |
| 2026-10-19 | T1 adds 140 seeded invention/solvent fuzz cases and real first-evening integration, with deterministic greedy calibration bots | All 140 agree with playback; added tests take about 2.7 seconds in isolation, below the 15-second budget |
| 2026-10-19 | K1 audit found no remaining obsolete system files; legitimate Bench drafts, engine drafts and Redraft remain. `.gitattributes` pins text to LF so Windows checkout does not fail Biome | Removes a stale revision comment about retired runes; no active mechanics removed |
| 2026-10-19 | `Step.glyph` survives stored clones. Silent `trace.continued` events merge by caster/spell/cast with their original trace; zero-range deferred spans carry local fired cells while harm follows Origin | Profiler, proof and trip ledger avoid extra samples/casts and false dead cells for jar tails |
| 2026-10-19 | Bolt uses one footnote-aware travel helper for resolution, flight, preview and aim overlays. Three fine-print rows cover empty/cloud/solid obstacles; ten authored level-I variants map stored choices to behavior | Approved Bolt variants alter only unobstructed landings; final integrated gate: 94 files / 2,909 tests; production PWA build succeeds |
| 2026-10-21 | Growing-page resource validation prices invention graphs iteratively with one memoized pricer per operation, checks safe integer ink totals and uses indexed placement neighbors. External validation charges aggregate Glyph body expansion even without arguments; arithmetic overflow is a distinct resource refusal | Admitted deep dependency chains must not overflow the stack or amplify repeated work; refusal retains the original save |
| 2026-10-21 | Ordinary and revision lattice editors share one sparse viewport and pointer owner; signed world coordinates map to bounded visible cells and local SVG windows. Session keys retain camera state through edits/member switches and reset it on document load/import or revision Reset. Glyph profile geometry uses actual local entry/exits in a readable internal scroller | Paper navigation must not edit wiring, rebase identity or shrink phone editing targets; grown Glyphs remain readable |
| 2026-10-21 | Explicit growing shapes use stable signed safe integers within ±floor(MAX_SAFE_INTEGER/4); bounds are derived framing only. Fixed ASCII scenarios retain their geometry. Lattice labels use spreadsheet columns or explicit signed coordinates; battle labels stay bounded | Growing left/up must not rebase Source, proof or local Glyph identities |
| 2026-10-21 | Save v8 preserves sparse placements; frozen validated legacyV7 decoding migrates v7 while older/future editions keep distinct errors. Iterative compiler, resolver, clone and traversal consumers handle accepted long paths. Growing text uses @lattice 1 growing with canonical x,y TOKEN lines | Old live trips and distant sparse pages must roundtrip without rectangular allocation or identity drift |
| 2026-10-21 | External input budgets: 8MiB UTF-8, depth64, collection32768, aggregate entries/tokens100000 each, work1000000; scenario components share one budget. Geometry adds no gameplay cap. Resource refusal keeps original storage and exposes a backup; invalid manual imports are atomic | Protect phone work/memory without cropping or silently replacing existing notebooks |
| 2026-10-21 | External saves and scenarios preflight the actual compiler control flow without retaining expanded paths or linked steps. One aggregate budget counts revisits, path cells, Bend via/viaInner trails, aura snapshots and Glyph indexing/pricing across members; fixed holes are indexed once. Trusted live and typed fallback pages retain their existing behavior | A153KBfan-in save previously expanded to1.13Mpathcells/~264MBdesktopheap despite linear import checks; allocation must be admitted before materialization |
| 2026-10-30 | District kit, ink-quarter requests (DK-IQ): modules contribute `harmGuards` (read lazily through `harmGuards()`; the `HARM_GUARDS` const is gone because it would read `KIT` before the kit loads), and `applyMark` passes through `guardHarm` (cancel or redirect; returns the unit marked). Ordinary foes can set `EnemyDef.behaviour` to a `KIT.foes` entry (intent kind `behaviour`, routed in turn/describe/overlay by `engine/behaviours.ts`). Objectives and threshold goals are `KitGoal`. Foe walks never end on an `aiAvoid` piece unless exempt. Rules a board brings get their state at battle creation (`initBroughtRules`). Tests that register fixtures in the real kit live in `tests/districts/`, outside the `tests/scenarios` glob of `projection.test` | Requests D1–D3, D7, D8 of the ink-quarter plan; every later district reuses them |
