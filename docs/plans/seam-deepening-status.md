# Seam deepening build status (resume here)

Plan: [seam-deepening-plan](seam-deepening-plan.md). Orchestrator: Opus main session. Updated on every event and committed with every merge.

**State:** building
**Next:** Merge C2 and S1 as they report. Then HOLD for the 02:00Z reset (epoch 1791943200) unless usage leaves room for P1. After reset: P1 (Haiku S), D2 (fuzz must handle doorway), W4. Then P1 (port 5190 after F1), C1 + C2 (D1 merged), then R1 → S1 (after L1), D2, W4. Orchestrator follow-up: recipe.ts text for Pierce/On Ignite/Thrift + Scald/Etch/Kiln after E3.

## Contracts added in W0 (beyond the plan's §2)
- `Tile.scald: boolean` (Scald's steam). Board notation: `$` stained oil, `s` scalding steam, `^` hot, `#` etched (brass unit or plate `=^#`).
- Events: `pierced`, `heated`, `cooled`, `scalded`, `stained`, `etched`; `inked.via` gains `'stain'`. `heated` → interaction `heat`, `stained` → `stain`.
- `finishEncounter(p, t, b, log = [])` returns `stats` too (survives a wipe). S1 must pass the battle log from `flow.endBattle`.
- `SaveData.lastTrip: TripRecap | null` (outcome, deepest encounter, stats) for the trip page. Save v3 migration adds empty `trip.stats` and `lastTrip: null`.
- `applyDoorway(p, t, lattices) → { profile, trip }` (not just Trip). `variantFor(t, encounter)` stub returns 0.
- `EncounterDef.variants` built in `encounters.ts` from `BASE` (one variant each); L1 adds two per depth.
- Recipes Scald (spark+steam+cinder), Etch (ink+brass+gallnut), Kiln (brass+spark+cinder) are in `recipes.ts` with TODO notes; D1 writes the text.
- `src/ui/glyphs.ts` has placeholder circles for the 6 runes and 2 interactions: C1 owns that file too.
- The doorway is **not** in any loot table yet: R1 adds it (D1 must not).

## Tasks
| ID | Model | Size | Status | Branch / commit | Usage Δ | Notes |
|---|---|---|---|---|---|---|
| W0 | opus (me) | M | merged | 88f115d | 5% | contracts, stubs, save v3, worktrees pruned |
| P1 | haiku | S | todo | | | |
| D1 | haiku | S | merged | (see log) | ~2% | recipe hints rewritten by me (D1's named the ingredients) |
| E1 | sonnet | M | merged | (see log) | ~6% | added Spell.pierce / SpellNode.pierced |
| E2 | sonnet | M | merged | (see log) | ~4% | HEAT_DAMAGE moved to TUNING.heatDamage by me |
| F1 | sonnet | M | merged | (see log) | ~7% | also touched run.ts compileGlyph + Study.svelte (3 lines), accepted |
| E3 | sonnet | M | merged | (see log) | ~4% | merge seam with E1 Targets fixed by me |
| L1 | sonnet | M | merged | (see log) | ~6% | also edited tests/sim/fuzz.test.ts specFor (needed) |
| C1 | sonnet | M | merged | (see log) | ~6% | also UnitToken.svelte + playback fixtures (accepted) |
| C2 | haiku | S | running | | | started ~23:00, port 5192 |
| R1 | sonnet | L | merged | (see log) | ~9% | fixed parseLoot rejecting doorway; doorway → `study` screen with draft profile |
| S1 | sonnet | M | running | | | started ~23:02, port 5191 |
| D2 | haiku→sonnet | M | todo | | | all |
| W4 | opus (me) | S | todo | | | |

## Usage log
| Time (UTC) | 5h % | resets in | weekly % | zone | action |
|---|---|---|---|---|---|
| 22:32 | 28 | 3h28m (01:59:59Z) | 44 | normal | start, W0 |
| 22:39 | 33 | 3h21m | 44 | normal | W0 merged; spawn E1 E2 F1 D1 |
| 22:43 | 43 | 3h17m | 46 | narrow? (2.5%/min burst) | D1 merged; hold new spawns until rate settles |
| 22:44 | 46 | 3h16m | 46 | normal (task budget: 46 + E1/F1 rest ~8 + E3 8 = 62) | E2 merged; spawn E3 |
| 22:47 | 51 | 3h14m | 47 | normal | E1 merged + pushed; spawn L1 |
| 22:49 | 58 | 3h11m | 48 | normal (budget) | E3 merged + pushed; no spawn |
| 22:52 | 60 | 3h10m | 48 | normal | F1 merged + pushed; spawn C1 |
| 22:56 | 66 | 3h07m | 49 | normal (66 + C1 rest 6 + R1 15 = 87) | L1 merged + pushed; spawn R1 |
| 22:59 | 75 | 3h01m | 50 | normal→narrow (75 + R1 rest ~10 + C2 3 = 88) | C1 merged + pushed; spawn C2 |
| 23:02 | 78 | 2h58m | 50 | narrow (78 + C2 2 + S1 8 = 88) | R1 merged + pushed; spawn S1 (told: smallest solution) |

## Proposals (from agents, not yet in DESIGN/TECH)
- D1: Thrift rule text doesn't say whether several Thrifts stack (plan silent). Ask player / leave stacking like Amplify.
- D1: Kiln rule "scalds the units beside it for two rounds" compresses S5/S9. Accepted.
- D1: Etch rule says "any brass under it" for "brass in its footprint". Accepted.
- D1: Heat interaction text folds the 2 rounds and 1 damage into one sentence. Accepted.
- D1: all hints and owner notes written in the owner's voice by D1 (recipe hints rewritten by orchestrator). Player judges.

- E2: heat is checked on ignite (refreshing) and at the start of each hazard step for cold brass next to fire; it does not refresh every round (else a 2-round fire gives 3 scalds). Accepted.
- E2: re-heating hot brass is silent; only cold brass emits `heated`. Accepted.
- E2: hot brass scalds after fire damage via dealDamage, source "Heated brass"; it does not detonate inked survivors (unlike fire). Accepted (ask player if detonation feels missing).
- E2: scald order = hot sources in reading order, then victims; a unit beside two hot sources takes 2. Accepted.
- E2: ink stains oil under a unit too, but not oil under steam. Accepted.
- E2: a stain persists after being walked on (unlike a puddle); if both are on a tile the puddle fires first. Accepted.
- E2: a move ending on a stain cannot be undone (UndoRecord can't record it). Accepted for now; follow-up.
- E2: fire and a crumbling plate clear stain and heat silently. Accepted.

- E1: Pierce: both units take the Bolt's full damage, unit 1 first; Quill pools ink under each. Accepted.
- E1: runes before a Pierce act on unit 1 only; a Pierce anywhere on the path makes the spell pierce (the source resolves first), even behind a failing trigger. Accepted.
- E1: Pierce with no second unit: the projectile lands at the end; later runes target unit 1's tile plus the landing tile. Accepted.
- E1: pierced projectile's stopped/lands path is the full flight. Accepted.
- E1: Thrifts stack like Amplify (+1 each); a Glyph's inner Thrift counts too. Accepted (log as Proposal).
- E1: `pierced` counts as meaningful for proof. Accepted.

- E3: Scald emits `scalded` (not `steam`); steam/Fog over scalding steam refreshes and keeps it scalding; fresh steam on a dry tile is plain; vents always give plain steam. Accepted.
- E3: Scald hits every living unit inside (allies too), reading order, source "Scald", before steam ages; once per round it lasts (2). Accepted.
- E3: Etch inks exactly like Ink (puddles, diffuse, stains); plates aren't inked but are etched. Accepted.
- E3: **Etch conduction reinterpreted**: units on a conducted net already take Spark, so when the net contains etched brass, every inked unit on or orthogonally beside a net tile is sparked as if hit directly. ASK PLAYER (feel).
- E3: Etch etches only brass in its footprint; Kiln heats only the plates it raises (not units it coats, not existing plates). Accepted.

- F1: the chip says "· free" for the first compile of an idiom (design makes it free), "· 1 vellum" after. Accepted.
- F1: the lost chip stays until the selection restarts or Done, even through further trims. Accepted.
- F1: tidy also requires the compiled spells to behave exactly as the flat ones (stricter than the plan's three cell conditions; catches multi-exit Forks and auras losing their touch). Accepted.
- F1: auras that touched stranded runes don't move with them (if that breaks behaviour, nothing slides). Accepted.
- F1: a target cell may be one the moving block itself vacates. Accepted.
- F1: Draughtsman/Stoker pages have holes, so tidy refuses more often on real pages. Note for player.

- L1: variant names — d1 The lamplit landing / The drainage cut / The coal chute; d2 The oil cellar / The scullery / The flooded stair; d3 The sentry post / The brass gallery / The boiler alley; d4 Heart of the Seam / The furnace hall / The old foundry. Player judges.
- L1: variant pick salt `2000 + encounter` (independent of battle seed and loot 1000+). Accepted.
- L1: depth 1's new variants use oil and ink puddles, depth 2's steam (variety, same enemy counts). Accepted.
- L1: Crossroads reads "Deeper: {name} (depth N of 4)". Accepted.

- C1: visuals — stained oil = ink-blue hatch + ink drops; hot plate = orange fill, pulsing outline, heat waves, rounds in corner; etched = dark zigzag scratch; hot unit = fire tint + pulsing ring + flame badge; scalding steam = orange overlay + red heat ticks; pulse off under prefers-reduced-motion. Accepted.
- C1: fx — pierced = danger pulse; heated/scalded = fire burst; cooled = steam burst; stained/etched = ink burst. Accepted.

- R1: S12 refinement — a Source that stays on its own cell keeps its count first; only moved/new Sources take spare counts (highest first, pooled by type across both members). Else a no-op doorway swaps members' counts. Accepted.
- R1: a carried count is capped at the new Source's max; among moved Sources the larger max (Thrift) takes the larger count. Accepted.
- R1: a doorway as the final pick → Done goes to the Crossroads. Accepted.
- R1: renaming a Glyph is refused in the doorway ("Rename it at home"). Accepted.
- R1: saves with a doorway in `t.loot`, two in one offer, or one in the heart's offers are rejected. Accepted.
- R1: a reload in the doorway resumes it but drops the unsaved draft; idiom recognition is skipped in the doorway. Accepted (note for player).

## Decisions and fixes made during the build
- Orchestrator: recipe.ts text for the six runes (Pierce source line + "both units", On Ignite branch on "the burning tiles", Thrift/Pierce notes, Scald/Etch/Kiln lines). TUNING.heatDamage added.

## Follow-ups and rough edges
- tests/sim/fuzz.test.ts bots have no `case 'doorway'` (a bot that picks one spins to the 50-iteration guard). D2 must handle it.
- Lab palette (Palette.svelte, app/lab.ts) can't paint stain/heat/etch/scald yet (scenario strings work). D2 may add.
- Codex pages for Heat and Stain interactions not visually checked (W4).
- Battle HUD/log title is still the depth title ("Three rats") while the Crossroads names the variant ("The lamplit landing"). Decide in W4: probably "The lamplit landing" as battle title (≈6 tests assert enc.title).
- `preview_start` by name runs from the MAIN repo root, so agents must run `pnpm dev --port N --strictPort` from their worktree. Put this in spawn prompts.
- Port 5190 is held by a stale dev server from another session (cwd = main repo). Agents use dev-alt2 (5191) / dev-alt3 (5192).
- (fixed) aimPreview follows Pierce; recipe.ts reads out all six new runes.
- UI doesn't draw scalding steam, etched brass, stain or heat yet: C1 (BadgeLayer/TileLayer) must cover `scald`, `etched`, `stain`, `heat`; playback should animate `scalded`, `etched`, `heated`, `cooled`, `stained`, `pierced`.
- Undo after walking onto a stain (needs `UndoRecord.stain`).
