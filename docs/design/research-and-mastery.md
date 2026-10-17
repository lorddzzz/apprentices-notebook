# Research and Mastery: The Scholar's Press

> **Status: Building.** Decided in the design round of 2026-10-13 (§0). **First slice shipped 2026-10-13:** Bench + Compile, see the [implementation plan](../plans/research-and-mastery-plan.md). **Stages C, D and G shipped 2026-10-16** (§0, second and third tables; [plan](../plans/glyph-mastery-plan.md)). **Drafts redesigned and built as folios 2026-10-17** (§0, fourth table and "Folios built"). Next: the player's playtest of the folios, then footnotes (stage E).
> Summary and decision log: [DESIGN.md](../../DESIGN.md) §6.3 and §11. Base rules: DESIGN.md §6.2 (flow rules), §6.3 (runes), §9.5 (v0 rule defaults).
> Numbers and effects are drafts, to tune by playing. The alternatives explored before this choice (fusion and evolution, chronicles and slow projects, and standalone versions of the Bench and Compile) were removed after the decision. They are in git history at commit `86e1b25` (`docs/design-options/`).

## 0. Decided in the design round (2026-10-13)

| Question | Decision | Why |
|---|---|---|
| Resonance feedback | **Total only** (x / 6 pips plus one margin line), as in §3.2 | You reason about which slot is wrong. Knowing aspects pays off, and brute force doesn't |
| What aspects describe | **What the rune does**, read off its rule. All 14 runes retagged (§2) | Deduction is fair only if the clues are visible in rules the player already sees |
| Outer auras on a Glyph | **They reach every inner rune**, as if touching each one. The Glyph costs **+1 ink per outer aura** touching it (§4.4) | Power with a price. The player chose this over buffing only the entry rune and over sealed Glyphs |
| First playable slice | **Stage A + B together** (Bench + Compile, §11) | Test the whole direction before judging it |
| Crystallise | **Permanent.** The Glyph is retired for good, and there's no un-crystallise (§5.3) | It's a real sacrifice, and the crystal means more because of it |
| Where patterns prove themselves | **Expeditions only**, not the Lab | A Glyph is a pattern that worked under pressure |
| Proof on a wipe | **Kept** | Like codex finds: what was learned stays learned |
| Other defaults (§12) | Kept: unlimited free trials, parents not consumed, Glyphs shared across members, free renaming, aspects closed at 8 | No objection; tune by playing |

**Build defaults for the first slice** (*Proposal*, 2026-10-13, plan §1; tune by playing):

| Topic | Default | Why |
|---|---|---|
| Glyph ownership (P1) | A Glyph uses its inner runes from the collection, as if placed one by one; any member can place it if they are free | Shared Glyphs without a second ownership system |
| Fair Copy collapse (P2) | The cluster collapses into its entry socket; outside runes stay put; the preview names any that would no longer connect | Nothing moves without the player seeing it |
| Blocked Fair Copy (P3 + build) | An aura that also powers outside cells blocks it, and so does another spell flowing through the selection (found by the fuzz: it would silently cut that spell). The message names the cell | Compiling must never change behaviour |
| The arrow (P4) | Every Glyph has an arrow, the way in; a Payload Glyph entered from any other side stops the flow there | One readable rule |
| Outer auras (P5) | Outer Amplify: +1 to every inner Source and Material; outer Echo: echoes a Spell Glyph, nothing on a Payload; +1 ink per outer aura | §0 rule applied to both auras |
| Proof (P6, P7) | A player cast (not an echo) in a trip battle with ≥ 1 meaningful event; the last 300 casts per member; written when the fight ends, win or wipe; proof from any member counts | Bounded save, proof survives a wipe |
| Trial stage (P8) | 5×3 stage, caster on the left, one training dummy two tiles away (three in a column for area runes); a Source parent leads, otherwise `Bolt>` leads | A fixed, readable stage |
| Recipes again (P9) | Writing a known recipe again makes another copy for one solvent | Runes come in counts |
| Old saves (P10) | Old research points became solvents round-robin Gallnut → Pitch → Cinder | They were promised as reagents |
| Unlocks (P11) | Bench: from the first solvent (then it stays). Fair Copy: once anything is proven. The first compile of each idiom is free | §6.2 sequence |
| Shelf (P12) | Two tabs: Runes (20, three rows of 7; 26 and four rows since the Seam deepening) and Fair copies | 20 runes no longer fit two rows |
| Bench feel | Solvents seen before can be trialled at 0 count; a repeated attempt says "tried before"; Write in ink needs a fresh exact trial | Never punish curiosity; the commit stays deliberate |
| Idioms | Matched as an ordered subsequence along one branch (`Bolt ▸ Ink ▸ On Inked ▸ Spark` is Cashing In); Undertaker = Source → On Kill → any Material | The §7 example must count; no rune is a "Reach-area" payload |
| Bench runes | Quill 2 damage, 4 charges, pools ink under what it hits; Brand also inks, never pools, lasts the battle, +2 fire (the larger of branded/oil-soaked applies); Smear passes the mark one hop (allies too); Torch lights every oil tile in its footprint; Mist inks a whole touched cloud, then clears it | Drafts made concrete |
| Loot | Each Seam table carries Gallnut, Pitch and Cinder (weight 1 each); deep and heart add vellum (1) | Roughly the old research share |
| Codex | An aspect counts as known once an owned rune carries it; unknown recipes show their silhouette and torn sentence | Aspects are read off runes you hold |
| Fair Copy in the Study | Proven cells glow whenever something is proven (the discovery cue); a "Fair copy" toggle appears at the page's bottom-left; tap a glowing cell to select the largest proven pattern, tap its last rune to trim (the way in stays; never below 3); the confirm sheet shows ink before → after, runes that would be stranded, and needs a name (≤ 24 characters) | Pre-computed glows and tap-to-trim keep selection phone-friendly (§10 risk) |
| Glyphs on the page | Tapping a Glyph turns it (the arrow is the way in) and shows a card with "Look inside" (peek, rename); a placed Glyph tool is dropped after one placement; any placement that would push ink over capacity (an aura next to a Glyph adds +1) is refused | Same gestures as arrow runes |
| Stranded runes (2026-10-14) | A Fair Copy slides the runes it would strand up to the Glyph's way out, keeping their shape; the old warning remains only when they can't fit. Behaviour must stay identical (the identity test covers it) | The player's pick: a fair copy should look tidier than the draft |
| Idiom trim (2026-10-14) | While trimming, the selection shows the matched idiom and the cost; the trim that breaks the match fades the name and switches the cost from "free" to "1 vellum" | The player's pick: warn at the moment of the trim, not in the sheet |
| Fair Copy tidy, built (2026-10-14, *Proposal*) | The block slides so its first rune sits on the exit cell; it moves only if every target cell is a free socket **and** the compiled spells behave exactly as before (catches multi-exit Forks and auras losing their touch). Auras don't move with the block. On the holed member pages it refuses more often | Never change a cast silently |
| Trim chip, built (2026-10-14, *Proposal*) | "Cashing In · free" for an idiom's first compile, "· 1 vellum" after; the faded "no longer …" chip stays until the selection restarts | Free first compile (P11) |
| Scald, Etch, Kiln, built (2026-10-14, *Proposal*) | **Scald**: Steam whose cloud is scalding; at the burn step every unit inside (allies too) takes 1; steam over a scalding tile keeps it scalding, vents give plain steam. **Etch**: inks like Ink (puddles, diffuses, stains) and etches brass in its footprint for the battle; when Spark conducts through a network with etched brass, every inked unit **on or beside** the network is sparked as if hit directly. **Kiln**: Brass whose new plates arrive hot (units it coats stay cold) | Etch as drafted added nothing (units on a network are already sparked), so its reach is one tile wider. *Ask the player* |
| Owner's hints (2026-10-14, *Proposal*) | Every rune, interaction, recipe, aspect and idiom has a `hint`; it shows faded under `???` (aspects: under the dimmed rule). Torn-page recipes keep their torn sentence and get none. Recipe hints describe the effect, never the ingredients | Hint without naming |

**Decided in the design round of 2026-10-16 (stages C, D and G, built together):**

| Question | Decision | Why |
|---|---|---|
| Scope of the next build | **C + D + G together**: profiler and elegance, revisions, Glyph parameters, the owner's drafts. Footnotes (E) get their own round after this is played | Reliability gold's reward (a second parameter) needs D; drafts need the profiler and revisions |
| Effect score (§4.9, §5.2) | **Harm only**: damage dealt to enemies plus kills. Marks, tiles and shields don't count | One plain number ("4.2 harm a cast"). Setup Glyphs still show in Reliability |
| What a tier remembers | **Best form, kept**: a tier is the best that the last 10 casts have ever reached, and it never drops. The profiler also shows current form | Rewards change ink, so a tier that drops could break a page you already wrote |
| Revisions (§4.8) | **New version, fresh record**: editing a Glyph's inside is free and needs no new proof; the new version earns its own tiers; reverting brings back the old version and its record | Optimising stays honest, experimenting costs nothing |
| Plain spells in the profiler | **Last trip only**: plain spells show the last trip's casts and harm and mark cells that never fired; Glyphs keep a full record | Rewiring would wipe a long record anyway; dead cells are the teaching cue |
| Reliability silver reward | **Kept: a free extra exit**. The player picks the extra side on the Glyph sheet and can change it for free | A new way to wire, not just a number |
| How a draft is repaired (§4.7) | **A test at the desk**: each draft carries a small test stage and a goal from the owner's note; passing marks it repaired and shows the owner's reaction | A clear "it works" moment |
| Draft difficulty | **Harder deeper**: one bug in shallow and mid drafts, two in heart drafts | A few minutes each, growing with depth |

**Build defaults for stages C, D and G** (*Proposal*, 2026-10-16, plan M1–M37 plus calls made while building; tune by playing). Full list: [glyph-mastery-plan.md](../plans/glyph-mastery-plan.md) §1 and the [status file](../plans/glyph-mastery-status.md).

| Topic | Default | Why |
|---|---|---|
| Harm | Damage to enemies (before shields, overkill included) + 1 per kill, the same numbers as the trip ledger | One number everywhere |
| Who gets credit | Each rune owns only its own effect, chain reactions inside it included, never its children's. A Spell Glyph is credited with its source; a Payload Glyph only with its own runes, one sample per socket per cast, and only when one of its runes ran | The record measures the pattern, not its neighbours |
| What doesn't count | Echoes, and fire, scald or heat damage in later rounds. Lab, Bench and desk tests never write records | Fire from several casts merges; proof rules already work this way |
| Economy | Σ harm ÷ Σ cost over the last 10 casts; cost = base ink (before the tier discount) + 1 per outer aura. Tiers **0.7 / 1.0 / 1.3** (bot trips gave p50/p75/p90 = 0.6/1.0/1.1; gold raised because tiers are best-ever) | A discount must not raise its own score |
| Reliability | Share of the last 10 casts with a meaningful event inside the Glyph's own runes: 7 / 9 / 10 of 10 | Setup Glyphs still score |
| Tiers | Need a full window of 10 casts; the best window ever, never drops. Rewards only matter at the desk, so nothing changes mid-fight | Decided: best form, kept |
| Profiler | Casts, harm a cast, ink (base → discounted), current form, the inside with dead cells (0 fires after 5 casts) faded, and one suggestion line: a dead cell and the ink lifting it saves, a trigger that never opened, or idle casts | One readable sentence on a phone |
| Ranked | Best Economy, then best Reliability, then current Economy; Glyphs under 10 casts below with "n / 10" | Competition with your past self |
| Versions | Same id across versions; the current one is in the library, older ones archived with their records; Save makes max + 1; revert swaps. Open cells and the extra exit are settings, never a new version | Stable pages, honest records |
| Revision editor | The inside's box plus a ring (≤ 7 × 7), entry pinned and locked for a Spell Glyph, 3–8 flow cells, every cell reached, Erase or long-press lifts. Save is disabled while anything is wrong or nothing changed; a warning names a page that would go over ink or ownership | Same limits as a Fair Copy |
| Parameters | The Fair Copy sheet can leave one cell open (Material, Trigger or Shape); 2 at Reliability gold. The placed Glyph stores a rune per open cell, chosen at placement from owned runes of that family (default pre-filled) and changeable from the card's "Arguments". Ink is per family, so an argument costs what the default did | Decided in §4.5 |
| Extra exit | At Reliability silver, pick a side (up, right or down, not one an exit uses). The flow leaves through the first exit, then through the extra side, main branch first like a Fork's left | A built-in Fork with one readable rule |
| Drafts | Five drafts in story order (The Lamplighter, Collection, Wet Work, Left Hand First, The Foundry Bell), one per trip at most, only once you own a Glyph, gated by depth. The desk (`#/desk`, from the Study) runs each draft's 5×3 test with one cast; goals read as plain lines with ticks; a stranded rune shows as "never reached" but doesn't stop a test; passing on a clean page adds a Glyph you didn't have to prove and shows the owner's reaction | Decided: a test at the desk |
| Plain spells | The last trip's casts and harm under each spell, and a faint dashed ring on cells that never fired, only while the spell is wired as it was fought | Decided: last trip only |
| Fair Copy fix | A tail that the cluster's own spell would lose counts as stranded even if another spell still reaches it (found by the fuzz; before, the collapse dropped it silently) | Compiling must never change a cast without saying so |

**Decided in the drafts round of 2026-10-17** (after the first playtest of stage G). The player's feedback: the minimal fix gives a much simpler Glyph than their own Fair Copies; parts from an unlimited collection make it too easy; puzzles should be harder and pay more; a long draft could need several fixes, each passing part of a test. These answers **supersede** the 2026-10-16 rows "How a draft is repaired" and "Draft difficulty" above and the "Drafts" build default.

| Question | Decision | Why |
|---|---|---|
| Parts | **A tray of scraps**: a draft can use only the runes on its page plus the loose runes in its drawer, with counts. Nothing from the collection | A defined puzzle; the parts hint at the shape of the answer |
| Several bugs | **A folio with a growing test suite**: a draft has pages; page 1 has one test, passing it turns the page and adds the next test. **Every test runs on every attempt**, so a fix can break what already worked | Real debugging: regressions are the puzzle |
| What a new page adds | **A test and 1–2 new scraps** in the drawer, plus the next fragment of the owner's note | The new parts hint at the next fix |
| Red herrings | **Only in later folios**: the first folios use every scrap; deeper ones add 1–2 decoys | Teach with "use them all", then take the crutch away |
| Length | **2 → 4 pages, rising** with depth: tutorial folios 2, middle 3, the heart folio 4 (≈ 10–20 min for the hardest) | Difficulty grows with the trip |
| Reward | **A Glyph that starts proven with a tier** (Reliability bronze, as if the owner had field-tested it) **and lore with the owner's mark** on the shelf | Worth more than a Glyph you could have compiled yourself |
| The five drafts | **All five rebuilt** as folios (the first two are 2-page tutorials) | One consistent shape |

Open, *tune by playing*: exact trays and decoys per folio, and whether a bronze head start is too much.

**Folios built** (*Proposal*, 2026-10-17, [folios plan](../plans/folios-plan.md) F1–F19 plus calls made while building; tune by playing):

| Topic | Default | Why |
|---|---|---|
| Tray | The owner's page runes at their counts + the scraps of every unlocked page; the editor palette shows only the tray, with counts; lifting puts a rune back; an edit or repair over the tray is refused ("The drawer has no more Oil") | One closed set of parts |
| Pages | One working page for the whole folio; `page` is the highest unlocked, never re-locks; Start over resets the inside only | The suite grows, the code stays |
| Running | "Run the tests" runs every unlocked test; chips `1 ✓ 2 ✗ 3 ○`, goal ticks per test; one board plays (first failing, else newest); a chip shows its test's final state; "broke" marks a test that passed on the previous run this session | Regressions are the puzzle |
| Turning | All unlocked tests pass → "Turn the page": the next fragment, "+ Spark, + On Ignite" and the new test shown before it runs; new scraps tagged "new" in the drawer | The new parts hint at the next fix |
| Copy-in | Last page, every test passing, no issues, inside the tray → the Glyph v1 with `draft` set and a record at Reliability bronze, window empty (0 / 10); the reaction, then the lore | Decided: a head start, not a free reward |
| Mark and lore | Draft Glyphs show a quill on their shelf tile, "in the owner's hand · <name>" on the sheet and a folded "The owner's page" with the lore; revisions keep the mark; reverting to v1 brings bronze back | Decided: the owner's mark |
| The five folios | The Lamplighter 2 pages (5 runes), Collection 2 (6), Wet Work 3 (9), Left Hand First 3 (8, decoy Steam), The Foundry Bell 4 (10, decoys Brand and Echo). Each later page of the deep folios needs 2–4 edits, and each has a designed regression (a tempting fix that breaks an earlier test). The 2026-10-16 one-page fixes no longer mend any folio | Harder and richer than a minimal fix |
| Drawer runes | A drawer may hold runes the player hasn't researched (Smear, Etch, Brand); using them at the desk unlocks nothing | The owner's drawer is the owner's |
| Boards | Folio boards may hold pre-inked units (`r!`): brass carries a spark far, nothing inks that far | The heart's last page needed it |
| Open folio | Shows the page fragments (they are the note); the cover line is only on the list row with "page 2 / 3" or "mended" | The cover repeated page 1 |
| Save v6 | Unmended copies restart at page 1 from the new folio; mended ones stay mended (last page); every draft Glyph's v1 record is raised to bronze | Old work doesn't match the new folios |

## 1. The idea in one page

Two verbs, one grammar.

- **Distil** (the Bench): combine two runes and a solvent to make a **new atom**. A deduction puzzle with exact, deterministic answers.
- **Compile** (the Fair Copy): compress a lattice pattern that has *proven itself in the field* into a **Glyph** (a molecule), which saves ink and space, can take parameters, and can be refactored.
- **Crystallise**: a Glyph that has been polished enough can be **turned back into an atom** with aspects of its own, which then feeds the Bench again. This closes the loop: molecules become the atoms of the next tier.

Everything is held together by **aspects**: a tiny vocabulary of 8 properties that tags runes, solvents, recipes, idioms, and (eventually) your own crystals. Aspects are the "type system" of the game. Learning them is the research skill; the Bench tests it, Compile generalises it.

```
        loot ──► atoms (T0) ──Distil──► atoms (T1) ─┐
                    │                                │
                    └──── lattice ──proven──► Glyph ─┴─Crystallise──► atoms (T2, personal)
                           ▲                    │                          │
                           └──── refactor ◄─────┘                          └──► Bench again
```

**What the player's evenings feel like:** fight → bring home a solvent and a hunch → try a few trials at the Bench → find a rune → wire it into a spell → fight with it five times → realise the pattern is good → compress it → name it → polish it → crystallise it → use it as an ingredient for something nobody else has.

**Why it fits this player (§2 profile):** theorycrafting, hidden combos with visible silhouettes, "build like code", clear rules with surprising results, no reflex demands, no dice.

---

## 2. Aspects: the shared grammar

Eight aspects. Every atom has **two**; every solvent has **one**; every recipe result has **two**.

| Aspect | Reads as | Solvent that carries it | Where it's found (draft) |
|---|---|---|---|
| ☍ **Reach** | travels, lands at a distance | **Chalk** | forbidden guild archives |
| ◈ **Mark** | singles out a target | **Gallnut** | the Seam (ink-makers' side) |
| ≋ **Slick** | coats the floor, spreads, slides | **Pitch** | the Seam (canal side) |
| ♨ **Heat** | burns, ignites | **Cinder** | the Seam (fires) |
| ϟ **Charge** | conducts, empowers | **Quicksilver** | brass quarter (post-v0) |
| ☁ **Vapor** | fills an area | **Fog jar** | bathhouses (post-v0) |
| ▣ **Hold** | blocks, shields, holds back | **Rivet** | brass quarter (post-v0) |
| ⟳ **Return** | repeats, branches, reacts | **Wax** | bathhouses / archives |

### v0 runes, tagged by what they do (**decided**)

| Rune | Aspects | Read off the rule |
|---|---|---|
| Bolt | ☍ Reach · ◈ Mark | travels in a line, hits one target |
| Splash | ☍ Reach · ☁ Vapor | lands within 3, hits a 3×3 area |
| Ward | ▣ Hold · ◈ Mark | shields a chosen ally |
| Ink | ◈ Mark · ≋ Slick | marks units, pools on the floor |
| Oil | ≋ Slick · ♨ Heat | coats the floor, burns |
| Spark | ♨ Heat · ϟ Charge | ignites, arcs and conducts |
| Steam | ☁ Vapor · ▣ Hold | a cloud that stops projectiles |
| Brass | ▣ Hold · ϟ Charge | raises plates, conducts |
| Bend | ☍ Reach · ▣ Hold | deflects the flow |
| Fork | ☍ Reach · ⟳ Return | the flow travels on in two branches |
| On Inked | ◈ Mark · ⟳ Return | reacts to a mark |
| On Kill | ⟳ Return · ☁ Vapor | repeats around each victim |
| Amplify | ϟ Charge · ☁ Vapor | empowers everything around it |
| Echo | ▣ Hold · ⟳ Return | holds the spell and casts it again |

Every pair is unique. Counts: Hold 5, Reach 4, Mark 4, Vapor 4, Return 4, Charge 3, Slick 2, Heat 2. Recipe results must use one of the 14 remaining pairs (rule 3 below).

(The *test* in §9 enforces the rules below, so retagging later is safe.)

### The explainability rule (what makes it deducible, not arbitrary)
Every recipe `Left + Right + Solvent → Result` must satisfy:
1. the **solvent's aspect is one of the result's aspects**;
2. **each parent shares at least one aspect with the result**;
3. the **result's aspect pair is unique** among all runes (so silhouettes are unambiguous);
4. no two recipes share the same unordered parent pair *and* solvent.

So when the codex shows a silhouette with aspects `◈ ≋`, the player can reason: "I need a Mark-ish thing and a Slick-ish thing, and the solvent is Mark or Slick." Not a wiki lookup, but an inference.

---

## 3. The Bench (research), in detail

### 3.1 Trial and commit
- **Trial** is free and unlimited. It runs the pair on a 3×3 test board using the real engine (so the animation shows what the combination *does*), and returns a **resonance score**.
- **Write in ink** (commit) is only possible on an exact match. It consumes the solvent, creates the rune, and fills the codex page. The parents are never consumed.

### 3.2 Resonance (the scoring, exact)
For each **undiscovered** recipe, score the attempt slot by slot, then take the best:

| Slot | Exact | Shares an aspect with the recipe's | Else |
|---|---|---|---|
| Left rune | 2 | 1 | 0 |
| Right rune | 2 | 1 | 0 |
| Solvent | 2 | 1 (its aspect is in the result's aspects) | 0 |

Parents are unordered (try both assignments, keep the best). The result is shown as **x / 6 pips** and **only the total**, never per slot, so the player can't solve each slot independently. A 6 is an exact match.

Plus one **margin line** from a pool keyed to the *weakest slot's aspect gap*, never naming a rune: *"too dry"* (missing Slick), *"nothing to carry it"* (missing Reach), *"it wants a witness"* (missing Mark). Lines are data, one per aspect.

Trials are logged per pair+solvent, and exhausted pairs grey out. No retries needed.

**Why a total, not per slot?** With only a total, a 4/6 means "two exact, nothing shared", or "one exact, two sharing", and so on. The player has to reason, and aspect knowledge pays off. A quick sanity number: 14 runes → 105 unordered pairs × 8 solvents = 840 combinations, with ~12 recipes. Pure brute force is wasteful; aspect reasoning cuts it to a handful of trials.

### 3.3 Recipes, tier 1 (exact runes)

**Stage A slice: the six Seam recipes (retagged to fit the decided rune tags).** All six satisfy the explainability rule. Effects are drafts.

| Result | Family | Aspects | Left + Right + Solvent | Effect |
|---|---|---|---|---|
| **Smear** | Material | ≋ ☁ | Ink + Oil + Pitch | Ink that spreads: the mark passes to every adjacent unit. *Returns the interaction cut from v0 as a reward.* |
| **Torch** | Material | ☍ ♨ | Oil + Spark + Cinder | Oil that ignites when placed, and the fire runs along connected oil. |
| **Fog** | Material | ≋ ▣ | Oil + Steam + Pitch | A slick cloud: units in it slide, and it blocks Bolts. |
| **Mist** | Material | ◈ ☁ | Ink + Steam + Gallnut | Marks every unit in the cloud, then dissipates. |
| **Quill** | Source | ☍ ≋ | Bolt + Ink + Pitch | A bolt that leaves an ink puddle under what it hits. |
| **Brand** | Material | ◈ ♨ | Ink + Spark + Gallnut | A mark that burns: a branded unit takes +2 from fire instead of +1. |

Torn pages in the slice: **Smear, Torch, Mist.**

**Seam deepening (decided 2026-10-14):** three more recipes from the Seam solvents.

| Result | Family | Aspects | Left + Right + Solvent | Effect (draft) |
|---|---|---|---|---|
| **Scald** | Material | ♨ ☁ | Spark + Steam + Cinder | Clouds the tiles like Steam, and the cloud scalds: every unit inside takes 1 at the end of each round while it lasts |
| **Etch** | Material | ◈ ϟ | Ink + Brass + Gallnut | Inks what it hits. Brass it touches (plates, brass units) is etched and stays marked; Spark conducting through etched brass sets off the mark on every unit the conduction reaches |
| **Kiln** | Material | ♨ ▣ | Brass + Spark + Cinder | Raises a brass plate (like Brass) that arrives already hot (heated brass, DESIGN §6.5) |

The loot runes Pierce (☍ϟ), On Ignite (♨⟳) and Thrift (ϟ⟳) take three more pairs.

**Later recipes (old draft, aspects to retag).** The table below predates the decided tags. Its aspect column breaks rule 3 in places (Smear's old ◈ ≋ was Ink's pair). Each recipe is retagged when its solvent's district is built, and the validity test catches any clash. After the Seam deepening (2026-10-14) only ≋ϟ and ≋⟳ are free, which is not enough for the 7 later recipes (Lance, Arc, Coil, Bulwark, Ricochet, Canon, Reap). Lance is already covered by Bolt → Pierce → Spark. The rest get retagged, cut, or wait for a ninth aspect when their districts are designed.

| Result | Family | Aspects | Left + Right + Solvent | Effect |
|---|---|---|---|---|
| **Lance** | Source | ☍ ϟ | Bolt + Spark + Quicksilver | Piercing electric bolt: passes through the first unit. |
| **Arc** | Shape | ϟ ☁ | Spark + Steam + Quicksilver | The flow jumps to every unit in the connected steam. |
| **Coil** | Aura | ϟ ▣ | Brass + Spark + Rivet | Touching paths conduct one extra hop through brass. |
| **Bulwark** | Source | ▣ ⟳ | Ward + Brass + Rivet | Shield that raises a plate (which crumbles on schedule). |
| **Ricochet** | Shape | ☍ ▣ | Bolt + Bend + Chalk | A bolt bends off the first brass it meets. |
| **Canon** | Shape | ⟳ ☍ | Echo + Fork + Chalk | Both fork branches recast next turn. |
| **Reap** | Trigger | ◈ ⟳ | On Inked + On Kill + Wax | Fires when a *mark is consumed*, from the victim's tile. |

**The Seam alone supports six recipes** (Smear, Fog, Quill via Pitch; Mist, Brand via Gallnut; Torch via Cinder), so v0's single district gives a full tutorial arc. The other seven need solvents from places the player hasn't been, which is the pull toward the **district map** (DESIGN.md §6.7).

**Same pair, different solvent** is an intentional deepening later: `Spark + Steam + Fog jar` could be *Thunderhead* (a cloud that stores charge), alongside `Spark + Steam + Quicksilver = Arc`. The player learns that the solvent is the *steering wheel*.

### 3.4 Silhouettes and torn pages (pillar 4 and the mystery)
Each undiscovered recipe shows: **family icon, its two aspect glyphs, ink cost, and the *families* of its parents** (`[Material] + [Source] + [?]`). That is the `???` slot: not blank, but a locked sentence.

About a third of recipes are **pre-written in the owner's hand with one slot torn out**: *"Oil + Spark + ??"*. These are the gentle tutorial and the mystery thread: finishing one earns a handwritten reaction (*"Of course. The cinder. I had it in my pocket the whole time."*). In the slice: Smear, Torch, Mist.

### 3.5 Tier 2 recipes: aspect-keyed (this is where crystals pay off)
Tier-1 recipes use **exact runes**. Tier-2 recipes use **aspect-keyed wildcard slots**:

> **Resonant Lens** = `[any atom with ◈] + [any atom with ♨] + Chalk`

A **crystal** (§5) has aspects derived from its performance, so a crystal can fill a wildcard slot a plain rune can't. Tier-2 results are the strongest runes in the game and the reason to keep crystallising. This also makes the aspect system *grow* in relevance: early game is exact-rune memory, late game is aspect reasoning.

---

## 4. Compile (the Fair Copy), in detail

### 4.1 What is a cluster
A **cluster** is a set of lattice cells that is:
- **flow-connected** (each cell is reached from another cell of the cluster, except one),
- has **exactly one entry cell** (a Source, or a cell whose flow predecessor is outside the cluster),
- **prefix-closed** (if a cell is in, everything on the flow path from the entry to it is in),
- **3 to 8 cells**,
- plus **every aura that touches it** (included automatically; they travel with it).

Two kinds:
- **Spell Glyph**: the entry is a Source. It goes in as a Source: rotatable, has charges, castable.
- **Payload Glyph**: the entry is not a Source. It goes anywhere flow can reach, like a fat Shape rune.

### 4.2 Proven
A cluster is **proven** when it has resolved **5 times with at least one meaningful event** (damage, mark, tile change, kill, shield absorb) *in expeditions* (the Lab does not count; it is for scenario-testing, not grinding).

Implementation-friendly property: proof is **hereditary**: every prefix-closed sub-cluster of a proven cluster is at least as proven. So the engine stores, per cast, only the **set of cells that fired with their rune/rotation** and answers `proven(S)` by counting casts that contain `S`. Cluster canonical form is **rotation-invariant, position-invariant, not mirror-invariant** (arrows matter), so a pattern proven in one lattice counts when rebuilt elsewhere.

### 4.3 The Fair Copy flow
1. In the Study, proven clusters glow on the page. Tap one: the **maximal** proven cluster highlights.
2. **Trim** by tapping a tail cell to drop it (the badge shows whether the smaller cluster is still proven; it always is, by heredity).
3. Choose **parameters** (§4.5).
4. **Name it** (free text; idiom names are suggested).
5. Pay **1 vellum** (idioms: free the first time). The cluster collapses to one socket.

### 4.4 Interface and expansion (how it stays cheap)
A Glyph occupies **one socket**. Its inner runes live in the Glyph's *own* local frame, not on the outer grid. The engine inlines glyphs before resolving:

```
expand(lattice) → flat lattice-with-virtual-cells
```

- The Glyph's **exits** are the directions in which the inner flow leaves the cluster. In the outer lattice, flow leaves the Glyph's socket in those directions (rotated with the Glyph).
- **Outer auras** touching a Glyph reach **every inner rune**, as if they touched each one (**decided**). The price: **+1 ink per outer aura** touching the Glyph. Inner auras work as normal. *Tune by playing:* if Amplify-next-to-a-big-Glyph dominates, raise the price before changing the rule.
- **Ink cost** = sum of inner costs − `floor(cells / 3)` − elegance bonuses, min 1, plus the cost of any parameter rune placed, plus 1 per outer aura touching it.
- **Depth limit 2**: a Glyph may contain Glyphs, but not three deep.
- The event log, combat rules, and previews use the flat expansion; the UI offers "peek inside".

The compression is real: the cluster is more compact on the page *and* cheaper, which is the point. It answers the small-lattice and ink-budget limits directly.

### 4.5 Parameters
A Glyph can leave up to **2 cells open**. An open cell has a **family constraint** (Material, Trigger, Shape…) and never a Source or an open-slot Glyph.
- At placement the player chooses which rune goes in, using a copy from the collection.
- A parameterised Glyph is a **function**; the shelf shows it with "( )" in the corner.
- Example: **Cashing In ( Material )** where the Material is `Ink → On Inked → Spark`'s first rune. The same Glyph is a Smear-cashing build, an Ink-cashing build, or a Mist-cashing build.

### 4.6 Idioms: type-level pattern recognition
Idioms are recognised on **aspect sequences**, not exact runes, so they generalise as the rune set grows:

| Idiom | Aspect shape | Teaches |
|---|---|---|
| **Cashing In** | `Source → Mark-gate → Heat/Charge payload` | marks pay off; triggers see same-cast effects |
| **Bonfire** | `Reach-area → Slick → Heat` | area + fuel + ignition |
| **Chain Gang** | `Source → Return(fork) → (Reach-turn → Heat) ×2` | forking payloads |
| **Undertaker** | `Source → Return(kill) → Reach-area` | death cascades |
| **Static Cling** | `Vapor → Charge`, with a Charge/Return aura adjacent | diffuse then arc |

Building an idiom anywhere (even in the Lab) prints *"Idiom recognised: Cashing In"* with an owner's note, fills a codex page, and makes it **free to compile once proven**. Idiom silhouettes are visible in the codex before discovery, as aspect shapes.

### 4.7 The owner's drafts (debugging as a puzzle)
Some loot is **a half-working Glyph in the owner's hand**: it compiles, but has bugs (a Bend facing the wrong way, a trigger waiting on an event that never happens, a dead branch). The notebook's note says what it *meant* to do.

**Folios (decided 2026-10-17, §0).** A draft is a folio of 2–4 pages. Each page adds a test (a small board and a goal from the next fragment of the note) and drops 1–2 scraps into the drawer. The page can only be mended with its own runes and the drawer's: no runes from the collection. Every test in the folio runs on every attempt, so a fix for page 3 can break page 1. Later folios hide a decoy or two in the drawer. Passing the last page gives the mended Glyph, already at Reliability bronze, with the owner's mark and a page of the owner's story. This is the best mystery delivery vehicle: *someone else's code, read and repaired.*

### 4.8 Refactoring and versions
Open a Glyph at the desk: its inner lattice is an editable page with the same ink rules. Save as **v2**; old versions stay in the changelog, and **reverting is free**. Editing a Glyph that has been crystallised is not possible (it's an atom now); you can fork the source Glyph if you kept a copy.

### 4.9 The profiler
After an expedition, each Glyph (and each lattice) shows:
- casts, events, average effect per cast (the **effect score**: damage dealt + tile changes + marks applied + shield absorbed),
- **dead cells** (inner cells that never fired in N casts),
- a plain-language suggestion: *"The Bend on row 3 never fired. Removing it saves 1 ink."*

The profiler is the game's teaching instrument and the thing a theorycrafter will love. It reads the event log; it never alters rules.

---

## 5. Mastery (one split, two systems)

To avoid two overlapping systems, mastery has a clean rule: **atoms get Footnotes, Glyphs get Elegance.**

### 5.1 Footnotes (atoms)
Each atom earns **witness points**. They don't come from being cast; they come from *distinctive outcomes it took part in*, read from the event log. Examples: Spark ignites oil (1), Spark detonates a mark (2), Bolt kills through steam (2), Ward absorbs a hit that would have killed (3), an Echo recast kills (2). The rule table is data: `{ rune, eventPattern, points }`.

At 5 / 15 / 40 points a rune gains a footnote level (I–III). Each level offers **two mutually exclusive small rule edits**. You pick one and can re-pick at the desk any time for free, like rewiring. Each changes the ink cost by ±1, so mastery trades against the lattice budget instead of just adding power. Footnotes are rule edits, never raw numbers. Draft content for the first runes:

| Rune | Level I (pick 1) | Level II | Level III |
|---|---|---|---|
| **Bolt** | *Long reach*: +1 range through steam | *Sharpened*: +1 damage to inked | *Bloodhound*: if it kills, keep travelling to the next unit |
| **Spark** | *Hotter*: ignites oil at +1 ring | *Grounded*: conducts through brass without losing a step | *Ball lightning*: fork outputs 3 directions |
| **Ink** | *Deep stain*: marks last through a heal | *Seep*: marks one adjacent unit | *Indelible*: detonation leaves a puddle |

**Why witnessing?** Mastery becomes a record of play style. A player who never uses oil never sees Spark ignite oil, so their Spark grows toward conduction instead.

Interaction with Glyphs: **a Glyph snapshots the footnotes of its inner atoms at compile time.** Changing them means a Revision. This keeps Glyphs stable and makes compiling a commitment of *style*.

### 5.2 Elegance (Glyphs)
Two metrics (a third, *Reach*, was cut for scope):

| Metric | Defined as | Tiers (draft, tune by play) |
|---|---|---|
| **Economy** | average **effect score** per cast ÷ ink cost | bronze ≥ 0.8 · silver ≥ 1.2 · gold ≥ 1.8 |
| **Reliability** | share of casts that produced ≥ 1 meaningful event | bronze 70% · silver 85% · gold 95% |

Rewards, all with visible goals:
- Economy tier: **−1 ink** per tier (min 1).
- Reliability silver: a **free extra exit port** (a Fork-equivalent, no rune needed).
- Reliability gold: a **second parameter**.
- Both at gold + a name: eligible to **Crystallise**.

A running list "your Glyphs, ranked" works as the Zachtronics-style histogram. The competition is against your past self.

### 5.3 Crystallise (closing the loop)
At **gold Reliability and silver Economy**, a Glyph can be crystallised at the Bench (cost: 3 vellum and a *Mercury* solvent, one per attempt):

- It becomes an **atom** with **one socket, no inner structure**, the Glyph's final ink cost, and a flat effect. No more depth-limit concerns.
- Its **aspects** are the two most frequent aspects among the events it produced in the field. A *Cashing In* crystal is likely `◈ ♨`; a quirkier build gets surprising aspects.
- It can earn **Footnotes** and it can be used as a **Bench ingredient**, especially in the aspect-keyed tier-2 recipes of §3.5.
- The player's name stays. The shelf shows it with the author's mark: *the Draughtsman's Cashing In*.

Crystallising **retires the Glyph for good** (**decided**: permanent, like ink; there's no un-crystallise). This is the "sacrifice flexibility for power" beat. Revisions before crystallising stay free, so the experimenting happens first.

---

## 6. Economy, pacing, gates

### 6.1 Resources
| Resource | Source | Sink |
|---|---|---|
| **Solvents** (8 kinds) | district loot, enemy drops | Distil (commit) |
| **Vellum** | loot, archives | Compile, Crystallise |
| **Mercury** | rare loot, heart fights | Crystallise |
| **Ink capacity** | ink reserves | the lattice budget (unchanged) |

Trials cost nothing: this is a thinking game, so experimentation never consumes anything. The only scarce things are the *final* writes, so the player is never punished for being curious.

### 6.2 Unlock sequence (the first ~8 evenings, draft)
| When | Unlock | What the player learns |
|---|---|---|
| Evening 1 | v0 as is | the lattice |
| After first win in the Seam | first **solvent** drops; Bench opens with 3 torn pages (Smear, Torch, Mist) | trials, resonance, aspects |
| Mid evening 2 | Fog (Pitch) | solvent as steering wheel |
| After 5 resolutions of any 3+ cell cluster | **Compile** unlocks; Cashing In idiom tutorial | proven, Fair Copy |
| Evening 3 | first **footnote** slots | witnessing |
| Evenings 3–4 | owner's drafts start dropping | debugging, profiler |
| Evenings 4–6 | new districts: Rivet, Quicksilver, Fog jar, Wax, Chalk | the other 8 recipes; tier-1 complete |
| Evenings 6–8 | first **Crystallise** | tier-2 recipes, signature rune |

(Pacing is a hypothesis; each row is gated by data in `src/data/` so pacing is tunable without engine work.)

### 6.3 Loot changes
`src/data/loot.ts`: the "research materials" offer becomes **typed** (`solvent: <id>` / `vellum` / `mercury`). Each district has a weighted solvent table; the heart gives two picks. Until districts exist, the heart's picks can be any solvent so every recipe is reachable in the slice.

---

## 7. Screens (375×812)

### Bench
```
┌ the bench ──────────────────┐
│ [Ink]  +  [ Oil ]  +  [Gallnut] │  tap a slot, pick from shelf
│       ┌ trial 3×3 ┐             │
│       │ . ◈ . . . │             │  plays the real reaction
│       └───────────┘             │
│ Resonance  ●●●●●●  6 / 6        │
│ "it wants to spread"            │
│ [ Trial ]   [ Write in ink ]    │
├ silhouettes ───────────────────┤
│ ◈≋ Material  [M]+[M]+[?]  — torn
│ ♨≋ Material  [M]+[M]+[?]
└─────────────────────────────────┘
```

### Fair Copy (on the lattice page)
```
┌ notebook page ───────────────┐
│ ▢▢▢▢▢  proven clusters glow  │
│ tap = select maximal  · tap tail = trim │
│ ┌ selection ──────────────┐  │
│ │ Bolt ▸ Ink ▸ OnInked ▸ Spark │ 6 ink → 5
│ │ Params: [ Material ▾ ]       │
│ │ Name:  [ Cashing In ]        │
│ └ [ Fair-copy ] (1 vellum) ───┘
└──────────────────────────────┘
```

### Glyph sheet / Profiler
```
Cashing In v2   Economy ◔ silver   Reliability ● gold
inner lattice (editable)  · peek · changelog
casts 31 · avg effect 4.2 · ink 4
dead cells: none        [ Crystallise… ]
```

The shelf gets three visual states per item: atom, Glyph (a folded corner), crystal (a faint prism).

---

## 8. Engine and data architecture

All of it is pure, deterministic TypeScript behind the existing rules.

```
src/data/
  aspects.ts      Aspect ids, glyphs, solvent ↔ aspect, margin-line pool
  recipes.ts      T1: {left, right, solvent, result}   T2: {leftAspect, rightAspect, solvent, result}
  idioms.ts       aspect-shape patterns + names + owner's notes
  footnotes.ts    {rune, level, options[2]: {rule edit, inkDelta}}
  drafts.ts       owner's broken Glyphs
src/engine/
  research.ts     trial(left, right, solvent, known) → {score, margin} ; commit(...)
  cluster.ts      clusters(lattice) ; canonical(cluster) ; entry/exits ; proven(...)
  glyph.ts        compile(cluster, params) ; expand(lattice) ; cost(glyph)
  stats.ts        effectScore(events) ; fold casts → Economy/Reliability ; dead cells
  crystal.ts      aspectsOf(stats) ; crystallise(glyph)
  mastery.ts      witness points ; footnote application (a small "rune modifier" seam in flow)
```

Types (sketch):

```ts
type Aspect = 'reach' | 'mark' | 'slick' | 'heat' | 'charge' | 'vapor' | 'hold' | 'return';
interface Recipe { id: string; result: RuneId; left: RuneRef; right: RuneRef; solvent: SolventId; tier: 1 | 2 }
type RuneRef = { rune: RuneId } | { aspect: Aspect };            // T2 uses aspect wildcards
interface Glyph { id: string; name: string; version: number; cells: Cell[]; params: ParamSlot[]; exits: Dir[]; footnotes: FootnoteSnapshot[] }
```

### Save changes
`collection` stays counts for atoms; add `glyphs: Glyph[]`, `crystals`, `bench: { trials: TrialLog; known: RecipeId[] }`, `castMasks: CastMask[]` (capped at the last ~300 casts per member), `witness: Record<RuneId, number>`. One migration.

### Determinism and RNG
**No RNG at all** in research or mastery. Everything is a pure function of data + event logs, so every system is testable with golden files.

---

## 9. Test plan (per the project's validation rule)

1. **Recipe validity test**: for every recipe in `recipes.ts`, assert the four explainability rules of §2 and uniqueness of keys and aspect pairs. A data change that breaks the grammar fails CI.
2. **Trial golden tests**: a table of (pair, solvent) → score and margin line, including swapped parents, exhausted pairs, and "no undiscovered recipe left".
3. **Scenario test per recipe**: ASCII board plus expected event log (the `scenario` skill), one for each of the twelve results.
4. **Compile identity property**: for each idiom and each owner's draft, `events(flat lattice) == events(compile → expand lattice)` on several boards. This is the single most important test: *compression must not change behaviour*.
5. **Cluster tests**: rotation/position invariance, mirror non-invariance, prefix-closure, heredity of proof, 3–8 size bounds, depth limit 2.
6. **Stats tests**: effect score and dead cells from recorded logs; tier thresholds.
7. **Crystal tests**: aspect derivation is stable for a fixed log; crystal-in-wildcard recipe resolves.
8. **Save migration** from v0 saves, and a fuzz that random sequences of compile/refactor/crystallise never break `expand`.
9. **UI**: phone-size browser-pane check for the Bench, the Fair Copy trim flow, and the Glyph sheet, with screenshots.

---

## 10. Risks, and what we'd do about each

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Feels like a wiki** | Aspects could become memorisation | Total-only resonance forces inference; margin lines teach; silhouettes show aspects; every trial animates the real reaction |
| **Solved by spreadsheet** | Theorycrafters will | It's a feature at ~12–20 recipes; T2 aspect recipes and crystals (player-specific aspects) can't be pre-solved |
| **Research disconnected from the world** | Compiling alone has no world in it | Solvents are district-gated; proven requires real fights; idiom rumours per district; owner's drafts are loot |
| **Compile changes behaviour** | Trust-breaking bug | The identity property test (§9.4); expansion is the only code path |
| **Phone UI for clusters** | Selecting in a 3×6 grid | Pre-computed glows, tap-to-select-maximal, tap-tail-to-trim; no box select |
| **Ink economy bends** | Compression makes lattices bigger | `floor(n/3)` cap, parameter costs, min cost 1, tiers capped; tune in `tuning.ts` |
| **Two mastery systems confuse** | Footnotes vs elegance | Hard rule: atoms get footnotes, Glyphs get elegance, Glyphs snapshot footnotes |
| **Content scale** | 12 recipes, 5 idioms, footnotes | Slice builds 6 recipes, 3 idioms, 2 runes of footnotes |
| **Players never compile** | Optional systems get ignored | Ink pressure creates demand; idioms and owner's drafts give guided first compiles |

### Hypotheses to test by playing (v0 style: answer by play, not upfront)
- Is the Bench fun for **15 minutes**, or does it become chore at ~10 trials? (Kill criterion: if players brute-force instead of reasoning, tighten resonance.)
- Does compiling feel like **a reward** or a chore? (Check: do they compile unprompted by evening 4?)
- Do crystals feel **personal**? (Do they name them, do they care when one is lost in a wipe?)
- Is the ink saving enough to **change builds**, not just tidy them?

---

## 11. Build plan (staged so each step is playable)

| Stage | Scope | Size | Output the player can judge |
|---|---|---|---|
| **A. Aspects + Bench** | `aspects.ts`, 6 recipes, 3 solvents, trial/commit, Bench screen, typed loot, silhouettes, 3 torn pages | M | Is the deduction fun? |
| **B. Compile (plain)** | clusters, proven, Fair Copy, expand, identity tests, 3 idioms, no parameters | L | Does compression feel good? |
| **C. Profiler + Elegance** | stats, dead cells, Economy/Reliability tiers, revisions | M | Is optimising addictive? |
| **D. Parameters** | open cells, parametric Glyphs | S | Do functions click? |
| **E. Footnotes (2 runes)** | witness points, Bolt and Spark footnotes | M | Does mastery add choice? |
| **F. Crystallise + T2** | crystal atoms, derived aspects, aspect-keyed recipes | M | Does the loop close? |
| **G. Owner's drafts** | broken Glyphs, mystery notes | S | Is debugging fun? |

**Decided: A and B ship together as the first playable slice** (built in that order, played together). Stage A+B is the real test of the whole direction. If both land, the rest is extension.

---

## 12. Open questions, with my defaults (**answered 2026-10-13**, see §0)

| Question | Default | Reason |
|---|---|---|
| Does the Lab count toward "proven"? | **No** | prevents grinding; the Lab is for experiments |
| Are Bench trials limited? | **No** | thinking game, never punish curiosity |
| Do parents get consumed on commit? | **No** | keeps the collection stable; solvent is the cost |
| Can Glyphs be shared across party members? | **Yes** (one copy each owned) | matches rune ownership counts |
| Does a wipe lose proof counts? | **No** | wipes already cost the trip's loot; losing proof would punish learning |
| Can the player rename a Glyph? | **Yes, free** | ownership feeling |
| Can a crystal be un-crystallised? | ~~Yes, same cost~~ **No: permanent** (player's pick) | the sacrifice gives the crystal its weight |
| Is the aspect set closed at 8? | **Yes** for now | easier to learn; extensions later (e.g. *Light*, *Sound*) |

The design round on the aspect tagging, the resonance rule, and the outer-aura rule is done (§0). Everything else gets judged by playing Stage A and B.
