# Seam deepening: implementation plan

Design: [DESIGN.md](../../DESIGN.md) §6.3–§6.6 and §11 (rows of 2026-10-14), and [research-and-mastery.md](../design/research-and-mastery.md) §0 and §3.3. Where this plan and the design disagree, the design wins and the orchestrator asks. Project rules: [CLAUDE.md](../../CLAUDE.md). Run with the `implement` skill.

**Scope** (backlog items 1–13 and 17, decided in three design rounds on 2026-10-14). There are no new districts or new screens beyond the trip page.

| # | Item | Task |
|---|---|---|
| 1 | Bench pips render as empty boxes | P1 |
| 2 | Fair Copy tidies stranded runes | F1 |
| 3 | A trim that breaks an idiom warns while you trim | F1 |
| 4 | Encounter 1 telegraphs on turn 1 | L1 |
| 5 | Lab intro plays only for demos | P1 |
| 6 | Prune `.claude/worktrees` | W0 |
| 7 | Pierce, On Ignite, Thrift | E1, D1 |
| 8 | Alternate Seam layouts, named at the Crossroads | L1 |
| 9 | Owner's hint line on every `???` | D1, C2 |
| 10 | Scald, Etch, Kiln | D1, E3 |
| 11 | A quiet doorway (field rewiring as a loot offer) | R1 |
| 12 | Heated brass | E2 |
| 13 | Stained oil | E2 |
| 17 | The trip page | S1 |

**Not in this plan:** research stages C–G, districts, diagonal auras, walls, audio, real names, and the contingent alternatives in DESIGN §10b.

---

## 0. Team and models

Same setup as the [research plan](research-and-mastery-plan.md) §0: an **Opus** orchestrator (contracts, merges, docs, final verification), **Sonnet** implementers, and **Haiku** clerks. Tasks run in worktrees with explicit file ownership. A task that fails review twice moves up one model. UI agents use the `dev-alt` preview (port 5190).

Subagents never edit `DESIGN.md`, `TECH.md` or `docs/design/*`. Every rule they invent goes under **Proposals** in their report, and the orchestrator logs it.

---

## 1. Rules this plan settles (*Proposals*, log in DESIGN §11 when built)

The design rounds fixed the direction. These are the defaults to build, and the player judges them by playing.

| # | Topic | Default | Why |
|---|---|---|---|
| S1 | Pierce | A Shape rune for line spells (Bolt, Quill, and a Spell Glyph whose source is one). The projectile skips the first unit and stops at the second. Every rune after Pierce acts on both, the first one first. On Splash and Ward it does nothing, and the recipe says so ("nothing to pass through"). Two Pierces in one flow don't stack. Ink 1 | Two targets is a positioning puzzle; stacking would turn it back into "hits everything" |
| S2 | On Ignite | Ink 2. It passes if the cast has emitted `ignite` since the cast began (including from a Torch or a spark arc earlier in the same flow). The rest of the flow targets the units on those ignited tiles, and also the tiles themselves for Materials (Ink on a burning tile stains nothing, because the oil is burning). If nothing ignited, the flow stops | The player's pick: land on the new fire |
| S3 | Thrift | Aura, ink 3. +1 charge per trip to each Source it touches, counted when the trip starts. An outer Thrift on a Spell Glyph gives +1 to the Glyph's spell, costing +1 ink as for any outer aura (P5) | Consistent with Amplify and Echo on Glyphs |
| S4 | New runes in loot | Pierce: shallow and deep (weight 1). On Ignite: deep. Thrift: deep and heart. Starting collection: 0 of each | Rarer runes deeper, as the design says |
| S5 | Heated brass | Fire on a tile orthogonally adjacent to a brass plate or brass unit (or under a brass unit) heats it for `TUNING.heatRounds = 2` rounds; re-heating refreshes the count. At the burn step of round resolution, each hot plate or hot brass unit deals 1 to every orthogonally adjacent unit (inked +1 applies), but not to itself. Codex interaction `heat` | "Fire heats brass → scalds adjacent" from the original table, made exact |
| S6 | Stained oil | Ink landing on a tile with unlit oil stains it (`tile.stain`). A unit that ends a move (walk, shove or slide) on a stained tile is inked. When the oil burns or is washed away, the stain goes with it. Codex interaction `stain`. Ink puddles still form as now | A trap you lay, smaller than Smear |
| S7 | Scald | Like Steam (clouds the tiles, puts out fire). The cloud is scalding for as long as it lasts: at the burn step, each unit inside takes 1 | Draft from the design |
| S8 | Etch | Inks what it hits. A brass plate or brass unit in the footprint becomes etched for the battle. When Spark conducts through a network that contains etched brass, every inked unit the conduction reaches detonates as if sparked directly | Draft from the design |
| S9 | Kiln | Raises a plate as Brass does, already hot (S5) for `heatRounds` | Needs E2 |
| S10 | Alternate layouts | Each depth has 3 layouts (the current one plus 2 new), each with a short place name. Seed `trip.seed` and the depth pick one, deterministically, and the choice is derived rather than stored (no save change). The Crossroads names the next fight. Encounter 1's current layout moves one rat to within bite reach so turn 1 shows danger | Seeded and replayable; deriving avoids a migration |
| S11 | A quiet doorway | A new loot kind `doorway`. Weight 1 in deep tables only (never in the heart's offers, since you go home after the heart). At most one per offer. Picking it opens the Study's lattice editor in field mode (banked collection only, no Bench, no Fair Copy, Glyph placement allowed). "Done" returns to the Crossroads, or to Loot if picks remain | The player's pick: a rare find that costs a loot pick |
| S12 | Charges after rewiring | Charges follow the rune type. After the doorway, each Source on the new lattice takes the remaining count of a Source of the same rune or Glyph from before (highest first). Extra Sources of that type (a second owned copy) start full | Lifting and replacing a spell must not refill it |
| S13 | Fair Copy tidy | After collapsing, runes that would no longer get flow are moved as a block: translated so the first one sits on the Glyph's exit cell, keeping their relative positions and arrows. This only happens if every target cell exists in the member's shape and is empty after the collapse. Otherwise nothing moves and the current warning shows. The confirm sheet says "N runes slide up" | Identity property: the cast is the same before and after (extend `glyph-identity.test.ts`) |
| S14 | Idiom trim warning | In trim mode a chip shows the matched idiom and the cost. A trim that breaks the match fades the chip to "no longer Cashing In · 1 vellum" | Warn while trimming |
| S15 | Owner's hints | `CodexEntryDef.hint`: one line in the owner's voice for every entry that can be `???` (runes, interactions, recipes, aspects, idioms). It's shown in the handwriting style under the `???`. Torn-page recipes keep their torn sentence and get no extra hint | Hint without naming |
| S16 | Trip stats | `Trip.stats` accumulates per encounter at `finishEncounter`, from the event log: casts, damage and kills per member and spell; the biggest chain (most reaction events from one cast, with the spell's name); first discoveries this trip (interactions, idioms, recipes written are not trip events); and proof gained (casts recorded). Save v3, where the migration adds empty stats to a live trip | Data for the page; the profiler can reuse it later |
| S17 | The trip page | `#/trip-page` is shown after Return home and after a wipe (from Wiped, "Read the trip"). Up to 3 highlights picked in order: the first new discovery, the biggest chain (if it has ≥ 3 reactions), and the pattern closest to proof (a cluster at 3–4 of 5). Below that, a folded ledger: one row per spell with casts, damage and kills. "Back to the desk" leads to the Study | Highlights + ledger |
| S18 | Lab intro | The 1.5 s intro playback runs only with `demo=1` or the ⋯ "Play demo" | Feel note from v0 |

---

## 2. Contracts (Wave 0, orchestrator)

- `src/data/types.ts`: `RuneId` gains `pierce | onIgnite | thrift | scald | etch | kiln`. `InteractionId` gains `heat | stain`. `CodexEntryDef.hint?: string`. `EncounterDef.variants: { name: string; layout: string }[]` (the depth's layouts; `layout` is kept as `variants[0]`). `LootTableDef` can hold `{ kind: 'doorway' }`.
- `src/data/tuning.ts`: `heatRounds: 2`.
- `src/engine/types.ts`: `Tile.stain: boolean`, `Tile.heat: number`, `Unit.heat: number`, `Unit.etched` / `Tile.etched: boolean`. `LootItem` gains `{ kind: 'doorway' }`. `Trip.stats: TripStats` (interface defined here), `TripStatus` gains `'doorway'`.
- `src/engine/events.ts`: `heated`, `scalded`, `stained`, `etched` events with stub text.
- `src/engine/notation.ts`: ASCII for stain, heat and etch in scenario boards (the `scenario` skill's harness).
- `src/engine/run.ts`: stubs `variantFor(t: Trip, depth): number`, `applyDoorway(p, t, lattices): Trip` (S12), and a call to `accumulateStats(t, log)` (new file `src/engine/tripStats.ts`, stub) inside `finishEncounter`.
- Save v3 with a migration stub. Rune entries in `runes.ts` with placeholder text, so the data integrity test stays green.
- `git worktree prune` and clean `.claude/worktrees` (item 6).

Commit `chore: seam deepening contracts (W0)`, then push.

---

## 3. Waves and tasks

| Wave | Task | Model | Size | Owns | Depends on |
|---|---|---|---|---|---|
| 1 | **P1** Polish | Haiku | S | `components/common/Pips.svelte`, `screens/Bench.svelte`, `src/app/lab.svelte.ts`, `screens/Lab.svelte` | W0 |
| 1 | **D1** Data content | Haiku | S | `src/data/runes.ts`, `recipes.ts`, `loot.ts`, `codex.ts` (rune text, aspects, owner notes, all hint lines, the 3 recipes, loot weights) | W0 |
| 1 | **E1** Loot rune behaviours | Sonnet | M | `src/engine/cast.ts`, `lattice.ts`, `glyph.ts`; `tests/scenarios/new-runes.test.ts` | W0 |
| 1 | **E2** Heated brass and stained oil | Sonnet | M | `src/engine/materials.ts`, `turn.ts`, `movement.ts`, `damage.ts`; `tests/scenarios/brass-and-stain.test.ts` | W0 |
| 1 | **F1** Fair Copy tidy and trim warning | Sonnet | M | `src/app/faircopy.ts`, `src/engine/cluster.ts`, `study/FairCopySheet.svelte`, `lattice/LatticeEditor.svelte`; `tests/app/faircopy.test.ts`, `tests/scenarios/glyph-identity.test.ts` | W0 |
| 2 | **E3** Scald, Etch, Kiln | Sonnet | M | `src/engine/materials.ts` (new functions only); `tests/scenarios/research-runes.test.ts` | E2 |
| 2 | **L1** Layouts and the Crossroads name | Sonnet | M | `src/data/encounters.ts`, `run.ts` (`variantFor`, `beginEncounter`), `screens/Crossroads.svelte`; fuzz over every variant | W0 |
| 2 | **C1** Art and the shelf | Sonnet | M | `RuneGlyph.svelte` (6 icons), `board/TileLayer.svelte`, `board/BadgeLayer.svelte` (stain, heat, etch visuals), `lattice/RuneShelf.svelte` (26 runes = four rows of 7, must fit 375×812 without scrolling) | D1 |
| 2 | **C2** Codex hints | Haiku | S | `codex/CodexEntry.svelte`, `CodexRecipe.svelte`, `CodexAspect.svelte`, `CodexIdiom.svelte` | D1 |
| 3 | **R1** A quiet doorway | Sonnet | L | `run.ts` (`applyDoorway`, offers), `src/app/flow.ts`, `src/app/study.ts` (field mode), `screens/Study.svelte`, `screens/Loot.svelte`, `trip/OfferCard.svelte`; `tests/run/doorway.test.ts` | L1 |
| 3 | **S1** Trip stats and the trip page | Sonnet | M | `src/engine/tripStats.ts`, `src/app/save.ts` (v3 migration), new `screens/TripPage.svelte`, `screens/Wiped.svelte`, route; `tests/run/tripStats.test.ts` | L1 (`run.ts` hook already in W0); merge after R1 if `flow.ts` conflicts |
| 4 | **D2** Lab scenarios and fuzz | Haiku → Sonnet for the fuzz | M | `src/data/scenarios.ts` (one per new rune and interaction), `tests/sim/fuzz.test.ts` (bots use the new runes, take doorways, and play all variants) | all |
| 4 | **W4** Wrap-up | Opus | S | Docs, a QA playthrough (Haiku), the `verify` skill at 375×812 over the whole loop | D2 |

**Acceptance (every task):** `pnpm check` green; new rules covered by scenario tests that assert on the event log; `.svelte` files clean under `svelte-autofixer`; UI tasks include 375×812 screenshots in the report.

**Task-specific checks:**
- **P1:** the Bench result shows filled pips (find out why `tone="ink"` renders empty) in light and dark mode; the Lab loads without the intro unless `demo=1`.
- **E1:** Pierce through rat → sentry; Pierce stopped by steam after the first unit; On Ignite with nothing lit stops; Spark → Oil → On Ignite → Ink inks everyone in the blaze; Thrift between two spells gives both +1 at trip start; an outer Thrift on a Glyph.
- **E2:** burning oil next to a sentry heats it and scalds its neighbours at round end for 2 rounds; a stain inks a rat that is shoved onto it; fire clears the stain.
- **F1:** the identity property holds for every tidied compile (the fuzz in `glyph-identity` over random proven clusters); trimming Cashing In by one shows the warning.
- **L1:** every variant passes the bot fuzz with no softlock and at least one bot win per variant; encounter 1 shows an intent on turn 1; the same seed always gives the same variant.
- **R1:** a doorway never appears in the heart's offers or twice in one offer; S12 cannot refill charges (test: lift and replace Bolt); a reload in the doorway resumes it.
- **S1:** a v2 save with a live trip loads with empty stats; the page renders for a win, a return and a wipe.

---

## 4. Risks for the orchestrator to watch

- **The shelf at 26 runes** (C1) may not fit one phone screen. Fallback: tabs by family, logged as a Proposal.
- **On Ignite retargeting** (E1) is the first rune that changes *where* the flow lands mid-cast. The recipe text (`src/app/recipe.ts`) and the preview overlay must name it. If E1 can't do that inside its files, the orchestrator adds a small follow-up on `recipe.ts`.
- **Hot plates plus Kiln** could create a no-go ring around the party. The fuzz in D2 should check for softlocks.
- **Doorway and proof:** casts after a rewire still count toward proof (the masks are per cell). That's acceptable, and noted for the player.
- **`run.ts` hot spot:** L1, R1 and S1 all touch it. W0 lays down the stubs, and the waves keep them sequential.

## 5. After the build

Play hypotheses for the player:
- Does Pierce change where you stand?
- Does On Ignite find a combo you didn't plan?
- Is the doorway a joy, or too rare to matter?
- Do the hints pull you toward the Bench?
- Does the trip page make you want to go again?
