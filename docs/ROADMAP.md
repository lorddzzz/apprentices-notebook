# Roadmap and backlog

> The one place for everything we *could* work on. Not a commitment: the player picks what's next, and a picked item gets a design round (`design-round` skill) and/or a plan in [docs/plans/](plans/) before it is built.
> Created 2026-10-15 from a full read of DESIGN.md, TECH.md, the feature doc and the plan status files. **Proposals are marked as such; the player has not yet ranked this list.**
> Related: [DESIGN.md](../DESIGN.md) (the *what*, decision log §11) · [TECH.md](../TECH.md) (the *how*, §7) · [research-and-mastery.md](design/research-and-mastery.md) (feature doc for stages C–G).

## How to use this doc

- **Sections** run from "what we'd do next" to "deliberately not doing": [1 Now](#1-now-top-priority) · [2 Roadmap](#2-roadmap-planned-tracks) · [3 Backlog](#3-backlog-ideas-ready-to-pick) · [4 Tech and tooling](#4-tech-and-tooling) · [5 Parked](#5-parked-cut-or-deferred) · [6 Open questions](#6-open-design-questions) · [7 Done log](#7-done-log).
- **IDs** (`BL-nn`) are stable. Never renumber; move an item between sections instead. New items take the next free number.
- **Promoting an item:** design round → plan in `docs/plans/<name>-plan.md` → build with the `implement` skill → move the item to the [Done log](#7-done-log) with the date and the plan link, and update DESIGN.md §11 / TECH.md §7 in the same commit.
- **Keep it honest:** when a playtest or a build changes the picture, edit this file in the same commit. Grep-friendly: `grep -n "area:.*bench" docs/ROADMAP.md`.

### Metadata legend

| Field | Values |
|---|---|
| **Type** | `feature` · `content` (data/runes/enemies/layouts, mostly `src/data/`) · `design` (needs a decision first) · `balance` · `polish` (UX, visuals, feel) · `bug` · `tech` · `test` · `docs` · `playtest` (needs the player's hands) |
| **Size** | `XS` minutes, one edit · `S` one focused task (≈ ≤ 3 % of a 5h usage window) · `M` a few tasks, one plan wave (≈ 5–15 %) · `L` its own plan, orchestrated build (≈ 50–150 %; the whole Seam deepening, 14 tasks and 3 design rounds, was about 1.3 windows) · `XL` several plans over several sessions |
| **Area** | `combat` · `lattice` · `runes` · `materials` · `bench` (research) · `compile` (Glyphs) · `mastery` · `run` (trips, loot, layouts) · `world` (districts, enemies, setting) · `party` · `study` (home UI) · `codex` · `lab` · `save` · `story` · `audio` · `tooling` · `docs` |
| **Status** | `ready` (can start now) · `needs-design` · `needs-playtest` · `blocked` (by an ID) · `idea` (not looked at closely) |
| **Needs** | IDs or things that must come first |

---

## 1. Now (top priority)

The Seam deepening (2026-10-14) has been built but not yet played. These are the loose ends around it, and they're cheap. **Proposal:** clear them in one short session before starting a big track.

#### BL-01 · Playtest the Seam deepening
`playtest` `S` · area: run, combat, bench, study · status: ready (player) · needs: —
Play a few trips and report on **feel, UX and direction** (not bugs; those are ours). Things we want opinions on: do the three layouts per depth get noticed; does the quiet doorway feel like a find; Pierce / On Ignite / Thrift: fun or fiddly; are heated brass and stained oil readable on the board; is the trip page worth reading; is the lattice-first Study layout good on the phone; is the Bench fun for 15 minutes; does compiling a Glyph feel like a reward or a chore (hypotheses in the feature doc §10). Output: new items here and decisions in DESIGN.md.

#### BL-02 · Out-of-charges stalemate
`design` `S` · area: combat, run · status: needs-design · needs: BL-01 (does it come up in real play?)
With every charge spent, a lone rat out of reach can never be killed (Shove does no damage). The fuzz bots count these separately. Options already on file (DESIGN §10b): charges per fight, a refill on each win, or a way out for the stranded party (a damaging Shove bump, a free basic attack, retreat). Then make the fuzz treat a stalemate as a failure.
Refs: [seam-deepening-status](plans/seam-deepening-status.md) Follow-ups; DESIGN §10b.

#### BL-03 · Settle Etch
`design` `S` · area: runes, materials · status: needs-playtest · needs: BL-01
The drafted Etch added nothing (units on a conducted network are already sparked), so the build widened it: when Spark conducts through a net with etched brass, every inked unit **on or beside** the net is sparked. Marked "ask the player". Keep, tune or redesign.
Refs: feature doc §0 (Scald, Etch, Kiln row).

#### BL-04 · Bench empty pips
`bug` `XS` · area: bench, study · status: ready · needs: the exact screen from the player
Reported as pips not filling; the agent could not reproduce it (renders filled at 3/6). Check 0/6 and 6/6 on the live build and ask for a screenshot if it is still there.

#### BL-05 · Undo after walking onto a stain
`bug` `S` · area: combat, lattice · status: ready · needs: —
A move that ends on stained oil can't be undone, because `UndoRecord` has no stain field. Add it and a scenario test.

#### BL-06 · Docs refresh
`docs` `XS` · area: docs · status: ready · needs: —
TECH.md header still says "2026-10-12"; DESIGN §10 still says "Next: the player plays v0" and leaves "do triggers see same-cast effects?" open although we ship "yes"; §10 checkbox state vs. what's built. Link this roadmap from CLAUDE.md and DESIGN.md.

---

## 2. Roadmap (planned tracks)

Four tracks. Within a track the order matters; across tracks it doesn't. **Proposal: Mastery first**, because Compile currently rewards only an ink saving and nothing grows with use, and a second district would sit on that thin layer. The player decides.

### Track M · Mastery (the Scholar's Press, stages C–G)

Designed in [research-and-mastery.md](design/research-and-mastery.md); stages A + B (Bench and Compile) shipped 2026-10-13.

#### BL-10 · Stage C: profiler and elegance
`feature` `M`–`L` · area: compile, mastery, study · status: ready (after BL-01) · needs: —
Per-Glyph stats, dead cells, **Economy** and **Reliability** tiers (bronze/silver/gold) with rewards (−1 ink per Economy tier; a free exit port at Reliability silver), a "your Glyphs, ranked" list, and **revisions** (edit a Glyph's inside, versions, free revert). The "optimising is addictive" test. Needs a short design round to fix the "effect score" definition. Feature doc §4.8, §4.9, §5.2.

#### BL-11 · Stage D: Glyph parameters
`feature` `S`–`M` · area: compile, lattice · status: blocked · needs: BL-10
Up to 2 open cells per Glyph with a family constraint (Material, Trigger, Shape; never a Source). Glyphs become functions. Feeds the Reliability-gold reward "a second parameter". Feature doc §4.5.

#### BL-12 · Stage E: footnotes
`feature` `M` · area: mastery, runes · status: needs-design · needs: —
Witness points from distinctive outcomes in the event log (Spark ignites oil, a Ward absorbs a lethal hit…); levels at 5 / 15 / 40; each level offers two exclusive small rule edits that change ink cost ±1; re-pick free at the desk; Glyphs snapshot footnotes at compile time. First slice: Bolt, Spark, Ink. The footnote *content* needs a design round per rune. Feature doc §5.1.

#### BL-13 · Stage F: Crystallise and tier-2 recipes
`feature` `M`–`L` · area: mastery, bench, compile · status: blocked · needs: BL-10, BL-12; mercury added to loot
A gold-Reliability / silver-Economy Glyph becomes a **permanent** atom (3 vellum + mercury): its two most frequent field aspects, can earn footnotes, can feed the Bench. Aspect-keyed tier-2 recipes are where crystals pay off. Feature doc §3.5, §5.3.

#### BL-14 · Stage G: the owner's drafts
`feature` `S`–`M` · area: compile, story, run · status: blocked · needs: BL-10
Loot that is a half-working Glyph in the owner's hand, with a note of what it *meant* to do. Debug it with the profiler. The best mystery vehicle we have: someone else's code, read and repaired. Feature doc §4.7.

### Track W · World

#### BL-20 · Aspect set: a ninth aspect, or retag
`design` `S` · area: bench, world · status: needs-design · needs: —
Only the pairs ≋ϟ and ≋⟳ are free; the 7 later recipes (Arc, Coil, Bulwark, Ricochet, Canon, Reap, plus the Lance variant) don't fit in 8 aspects. Decide: add a ninth aspect (the feature doc floated *Light*, *Sound*), retag, or cut recipes. **Blocks BL-21's recipes.**

#### BL-21 · Second district
`feature` `XL` · area: world, run, combat, bench · status: blocked · needs: BL-20, a design round (which district and what it feels like)
Candidates from the setting: oil-lit canals, the ink-makers' quarter, the bathhouses, brass bridges, rooftops, a guild archive. Each district favours a material, has its own solvents, 2–3 new enemy types, 3 layouts per depth, a heart fight and a weird/uncanny tone. Reuse the Seam deepening scaffolding (layout variants, place names, trip page). Breaks into: design round → enemies and layouts → loot tables and solvents → recipes (BL-24).

#### BL-22 · City map with `???` districts
`feature` `M` · area: world, study · status: blocked · needs: BL-21 (can start with the Seam plus locked doors)
The door becomes a map of districts; locked districts show as `???` with an owner's hint (pillar 4). Unlock conditions in data. DESIGN §6.7.

#### BL-24 · Recipes for the new solvents
`content` `M` · area: bench · status: blocked · needs: BL-20, BL-21
The remaining tier-1 recipes (Arc, Coil, Bulwark, Ricochet, Canon, Reap; solvents Rivet, Quicksilver, Fog jar, Wax, Chalk), each with aspects read off its rule, a silhouette, hint and Lab scenario. The validity test catches aspect clashes. Feature doc §3.3.

### Track R · Rivals

#### BL-30 · Rival inscribers
`feature` `XL` · area: combat, world, lattice · status: needs-design · needs: BL-21 (ideally), BL-10
Enemies with lattices of their own whose chains are telegraphed too (Into the Breach for spell chains). The most distinctive idea in the design and the hardest: how an enemy lattice is authored, shown and previewed, and how AI picks casts deterministically. Do a design round and a small prototype in the Lab before committing. DESIGN §6.7.

### Track A · Atmosphere and party

#### BL-40 · Real names
`design` `S` · area: story · status: ready · needs: —
The game, the apprentices, the city and the Seam are placeholders (DESIGN §9.4). Pick names once play suggests them.

#### BL-41 · The mystery and lore text
`content` `M` · area: story, codex · status: idea · needs: BL-14 (delivery), BL-21
Why the owner was expelled. Delivered through codex notes, owner's drafts, guild archives. Stays low priority until the core is fun; the hint lines and torn pages are the groundwork.

#### BL-42 · Audio
`feature` `M` · area: audio · status: needs-design · needs: —
Decided "none in v0", never revisited. Needs a tone decision (rain, kettle, chime on a chain?), free assets or synthesis, and the iOS rules (a user gesture to unlock, mute switch, PWA behaviour).

#### BL-43 · A third party member
`feature` `L` · area: party, lattice · status: needs-design · needs: —
Max party size and recruitment are open (DESIGN §6.1). Each member is a lattice shape plus an affinity: a Steam or Brass member would explore the untouched affinities before any signature abilities (held back deliberately, playtest 1).

---

## 3. Backlog (ideas ready to pick)

Unscheduled. Anything here can be promoted when it earns it.

### Runes and rules

| ID | Item | Type | Size | Area | Status | Notes |
|---|---|---|---|---|---|---|
| BL-50 | Auras that reach diagonally | feature | M | lattice, mastery | needs-design | "Rune upgrade" from playtest 1. Could be a footnote reward (BL-12). |
| BL-51 | Unbuilt runes from the family table: **Pull** (Source), **Wider**, **Bounce** (Shape), **When ally hit** (Trigger) | content | M each | runes | needs-design | Each needs aspects (check BL-20 first) and a rule that stays one sentence. |
| BL-52 | More idioms (3 now) | content | S | compile | ready | Each is data in `idioms.ts` plus a Lab scenario. |
| BL-53 | Alternate-solvent recipes: **Thunderhead** (Spark + Steam + Fog jar) next to Arc | content | S | bench | blocked (BL-21) | "The solvent is the steering wheel". Feature doc §3.3. |
| BL-54 | Footnote content for the other runes | content | M | mastery | blocked (BL-12) | After the first three. |
| BL-55 | Fire: its own element or a state; terrain decay; final matrix | design | S | materials | idea | Open since v0 (DESIGN §6.5, §10). |
| BL-56 | Balance pass: lattice sizes, ink costs, charges, enemy numbers | balance | S | combat, run | needs-playtest | Open checkboxes in DESIGN §10; do after BL-01. |

### Content

| ID | Item | Type | Size | Area | Status | Notes |
|---|---|---|---|---|---|---|
| BL-60 | More Seam layouts (3 per depth now) | content | S | run | ready | Data + the fuzz plays them automatically. |
| BL-61 | New enemy types: mutated vermin (canal eels, bathhouse slugs), constructs (steam golems) | content | M | world, combat | ready (design the traits) | Easiest inside BL-21. |
| BL-62 | More loot offer kinds beyond runes / ink reserves / solvents / vellum / doorway | content | S | run | idea | "Lattice sockets" and "notebook pages" were considered and not chosen. |
| BL-63 | Doorway variants or a second rare offer | content | S | run | idea | Only if the doorway lands well in BL-01. |

### Study, Lab, Codex

| ID | Item | Type | Size | Area | Status | Notes |
|---|---|---|---|---|---|---|
| BL-70 | Lab palette can't paint stain, heat, etch, scald | polish | S | lab | ready | Scenario strings work; only the palette lacks them. |
| BL-71 | Lab: loading the same scenario again with `?demo=1` in-page does nothing | bug | XS | lab | ready | The `$effect` skips an unchanged id. Pre-existing. |
| BL-72 | Visually check the Codex pages for Heat and Stain | test | XS | codex | ready | Never checked at 375×812. |
| BL-73 | iPad / desktop layout check | test | S | study, combat | idea | Promised in DESIGN §7; only 375×812 is verified. |
| BL-74 | Codex entries: automatic vs player-written | design | S | codex | idea | Open since v0 (DESIGN §6.6). |
| BL-75 | Accessibility pass (colour-blind safe materials, tap sizes, more reduced-motion) | polish | M | study, combat | idea | Reduced-motion is already honoured for the new pulses. |

---

## 4. Tech and tooling

| ID | Item | Type | Size | Area | Status | Notes |
|---|---|---|---|---|---|---|
| BL-80 | Playwright smoke test on the built app (load, start a trip, one cast) | test | M | tooling | idea | Browser checks are manual (browser pane) today; TECH §8 "Playwright not used yet". |
| BL-81 | Prove a red CI run really blocks the deploy | test | XS | tooling | ready | Skipped at setup (TECH §7, 2026-10-12). Push a failing test on a branch. |
| BL-82 | Save safety beyond copy/paste: export to a file / share sheet, a "back up your notebook" nudge | feature | S | save | idea | iOS can evict site data; today only the text backup in the Study menu protects a save. |
| BL-83 | TypeScript 7 | tech | XS | tooling | blocked (svelte-check support) | Pinned to ^6 (TECH §7). |
| BL-84 | Dev-only event-log panel | tech | S | tooling | idea | "Not doing yet" in TECH §4; the log mostly covers it. |
| BL-85 | Measure proof-replay cost at the end of long fights | test | XS | tooling | idea | Flagged as a risk in the research plan; check the fuzz timing. |
| BL-86 | Dependency refresh (svelte, vite, vitest, biome, vite-plugin-pwa) | tech | S | tooling | idea | Versions were pinned 2026-10-12. Run `pnpm check` and the Lab. |
| BL-87 | Worktree/preview friction for orchestrated builds (`preview_start` always runs in the main checkout; alt ports 5190–5192) | docs | XS | tooling | idea | Fold into the `implement` / `verify` skills. |

---

## 5. Parked (cut or deferred)

Not planned. Each line says why, and what would bring it back.

| Item | Why parked | Comes back if |
|---|---|---|
| Walls as terrain | Cut from v0; plates, units and the edge already block | A district needs a layout feature plates can't give |
| Slippery brass | Cut for good 2026-10-14: plates can't be walked on, so nothing to act on | Never, barring a mechanic change |
| Fusion with rune evolution; rune chronicles / slow projects | Rejected research directions; in git at `86e1b25` | The Scholar's Press fails playtests |
| Lattice sockets and notebook pages as loot | Not chosen in the loot round | Ink reserves feel too thin |
| Member signature abilities | Wait until more affinities are explored | BL-43 or a second affinity pair plays well |
| Permanent death | Likely no | Never planned |
| Input alternatives: Confirm-only casting, undo for the last cast | The double tap works | The double tap misfires again |
| Trip pacing alternatives: charges per fight, refill per win | Charges are fine for now | BL-02 picks one |
| Wipe penalty alternatives: keep one item on a wipe | Trips are cheap | Trips get longer or costlier |
| Reserve settings: the notebook-pages world, the wandering study, the ink sea | Held for later districts or endgames | A late-game or New Game+ idea is needed |
| A third elegance metric, *Reach* | Cut for scope | Reliability and Economy feel flat |
| Aspects beyond eight (*Light*, *Sound*) | Closed for learnability | BL-20 decides otherwise |
| Echo and Splash as cut candidates | They stayed in v0 | Never mind unless one is dead weight |

---

## 6. Open design questions

Short list of decisions with no owner yet. Each links to the item that would settle it.

1. How should a party with no charges left be able to finish a fight? → BL-02
2. Is Etch's wider reach right? → BL-03
3. Ninth aspect, retag, or cut recipes? → BL-20
4. Which district comes second, and what is its material and tone? → BL-21
5. Max party size, and does a third member come before a second district? → BL-43
6. Is Fire an element or a state; does terrain decay? → BL-55
7. What does the game sound like, if anything? → BL-42
8. Does the player want more breadth (content volume) or more depth (mastery) next? → Section 2 intro

---

## 7. Done log

Newest first. Link the plan or doc, not the commits.

| Date | What | Where |
|---|---|---|
| 2026-10-14 | Study layout reworked around the lattice board | DESIGN §11 (last row) |
| 2026-10-14 | **Seam deepening**: Pierce, On Ignite, Thrift; Scald, Etch, Kiln; heated brass; stained oil; 3 layouts per depth; the quiet doorway; owner's hints; trip page; Fair Copy tidy; place names | [plan](plans/seam-deepening-plan.md), [status](plans/seam-deepening-status.md) |
| 2026-10-13 | **Research slice**: Bench (distil), Fair Copy (compile), Glyphs, proof, idioms, 6 recipes, save v2 | [plan](plans/research-and-mastery-plan.md), [feature doc](design/research-and-mastery.md) |
| 2026-10-13 | v0.1 legibility: numbered recipe, Fork order, unit traits, charges loosened | DESIGN §10 |
| 2026-10-13 | **v0 built**: engine, Study, Codex, the Seam, Lab | [v0 log](v0-build-log.md) |
| 2026-10-12 | Design rounds, tech decisions, skeleton deployed | DESIGN §11, TECH §7 |
