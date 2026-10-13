# The Apprentice's Notebook — Tech Decisions

> Companion to [DESIGN.md](DESIGN.md). Design says *what* the game is; this file says *how* it's built.
> Last updated: 2026-10-12 (tech rounds 1–2, project setup).

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

## 8. Repo & tooling

**Versions (pinned by caret, checked 2026-10-12):** svelte 5.57, vite 8.3, @sveltejs/vite-plugin-svelte 7.3, typescript 6 (see log), svelte-check 4.7, vitest 5, @biomejs/biome 2.5, vite-plugin-pwa 2.0, @vite-pwa/assets-generator 2.0, workbox-window 7.4.

**Scripts:** `dev` (host-exposed so the iPhone can reach it), `build`, `preview`, `test`, `test:watch`, `lint`, `format`, `typecheck`, **`check`** (typecheck + lint + test, the one gate, also run in CI), `icons` (regenerate PWA icons from `public/icon.svg`).

**Aliases:** `$engine`, `$data`, `$ui/*` (tsconfig + vite).

**Build stamp:** `__BUILD__` is the short git SHA (`GITHUB_SHA` in CI, `git rev-parse` locally, `dev` as fallback), shown in the bottom-right corner.

**PWA:** `vite-plugin-pwa`, `autoUpdate`, Workbox precache of the whole app; manifest scope and start URL are `/apprentices-notebook/`; iOS meta tags and safe-area CSS in `index.html` / `theme.css`.

**AI setup:**
- `CLAUDE.md`: project rules (architecture, validation, workflow, Svelte 5 runes only).
- `.claude/settings.json`: shared permissions and a PostToolUse hook that runs Biome format on edited files.
- `.claude/launch.json`: `dev` server entry for the browser pane.
- `.claude/skills/`: `verify` (self-validation checklist), `scenario` (writing scenario tests), `design-round` (how to run a design round).
- `.mcp.json`: Svelte MCP (`https://mcp.svelte.dev/mcp`).
- Built-in browser pane covers interactive checks; Playwright is not used yet.
| 2026-10-13 | Lab edits are checkpointed: `LabStore` keeps `{state, log, lattices, base, actions}` snapshots (cap 60) pushed before every action (`BattleSession` `onAction` hook) and edit; Undo pops one and `BattleSession.replace` swaps it in. An edit (paint, lattice) rebases: `baseOf(state)` becomes the scenario's start and `actions` restart | One mechanism undoes casts, moves, painted tiles and rune changes; export always replays from the last edit |
| 2026-10-13 | `toScenarioDef(id, base, actions, events)` emits both members' lattices, `hp` for units off their default hp and `intents` from live telegraphs; `tests/app/lab.test.ts` replays the export of every `SCENARIOS` entry and compares lines and final board. Painting only the tile under a unit keeps the unit (`applyEdits`); changing a unit goes through `labSetCell` (fresh hp, no intent) | The scenario list doubles as the round-trip corpus. Shields, charges, round number and rng state are not captured (not in the notation) |

