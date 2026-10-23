# Footnotes: Levels, Capstones and Mastery of Methods

> **Status: Decided** (design rounds 2026-10-23; level I for four runes is built, everything else is unbuilt). Roadmap: BL-54 (and BL-50, BL-118).
> Summary and decision log: [DESIGN.md](../../DESIGN.md) §6.3 and §11. Extends the built footnotes in [rune-design-final.md](rune-design-final.md) §8 (P39). Related: [rivals.md](rivals.md) (the annotated pages), [party.md](party.md) (leans do not change footnotes).

**One-liner:** a footnote is a choice written in the margin of a line of fine print you have witnessed. Level I and II give each witnessed line a pick of two; level III gives each rune a capstone; methods and solvents get their own margins, so inventions grow without a per-recipe ledger.

## 0. Decisions

| Question | Decision | Why |
|---|---|---|
| Level shape | **Levels I and II are line slots; level III is a rune-wide capstone.** On every witnessed line of a rune you may fill a level I slot (one of two variants) and, later, a level II slot (one of two more). A rune's level III is one capstone chosen from two. Per line: 4 variants. Per rune: 2 capstones | The player's pick. Stacked slots give a line two decisions; the capstone is the defining choice that rewards the long grind |
| Inventions | **Methods and solvents carry the footnotes.** Conduct, Repeat, Margin, Bind and Lift (5) and the 14 solvents have their own points and margins (their fine-print lines already exist). Points go to the method and solvent used whenever a flavoured invention's line fires. An invention itself has no margin | The player's pick. Identity = the method (and solvent) you chose, so "Bind mastery" shapes every Bind invention at once; no per-recipe bookkeeping |
| Cost of writing | **Scales with level.** First write of a level I slot: 1 solvent of the line's district. Level II slot: 2. Level III capstone: 1 of each of that district's two solvents. Re-picking an already filled slot is free | The player's pick. The big choices cost more; solvents stay a real sink beside inventions |
| Who earns points | **Household-wide, as now.** Whoever fires a witnessed line in a trip fight, the rune's points are shared by the notebook | The player's pick. Trio choice never costs progress; leans stay about ink and the lattice |
| Rival notes | **Each rival's annotated page carries one unique variant** of a rune on that page: a third option in a named slot, which cannot be earned by points. It is hidden until you hold that page, still needs the slot's level and solvents, and is free to re-pick like any variant | The player's pick. Rivals reward the notebook, not only a trial copy; see [rivals.md](rivals.md) §3 |
| Locked levels | **Empty margins with a point count.** A rune page shows blank frames for slots you have not reached, labelled with their threshold ("level II at 25"), but no text. Slots you can fill are shown with their variants | The player's pick. Matches the codex's empty frames: you see that there is more, not what it is |
| Capstone boldness | **A conditional extension; the headline stays true.** A capstone adds a bounded "when X, also Y" on top; it never rewrites the rune's headline, so the headline remains one always-true sentence (D1) and the preview stays honest | The player's pick. Keeps the shared language of runes stable while still changing how you wire |
| Content pacing | **Seam basics first, then each district brings its own.** One pass writes levels I and II and the capstones for the Seam's 13 runes and the five methods. Each district's build then ships its 3 runes and its 2 solvents in the same shape, plus its rival's unique note | The player's pick. The household can always master what it already holds; every district build adds a complete slice |
| Pacing of points | **8 / 25 / 60 points** for levels I / II / III of a rune (slower than the built 5 / 15 / 40). Methods and solvents use about **5 / 15 / 36** because they fire less often (*tune by playing*) | The player's pick. Level III is a rare badge for a favourite rune; most runes will sit at I or II |
| Where to re-pick | **At home only.** Writing and re-picking happen at the desk; the quiet doorway stays about rewiring | The player's pick. A footnote is preparation; the doorway is a find about the lattice |
| Margin width (build planning, 2026-10-23) | **Margins on 2–3 chosen lines per rune** (3 for Spark and Ink), plus the capstone; other witnessed lines carry no slot (the player's pick) | 62 Seam lines alone would mean ~250 variants; chosen lines that change how you wire are the point |
| Who picks the variants | **Claude authors and chooses the variant pairs; the player judges them by playing** (no review gate, the player's call 2026-10-23) | Keeps content passes moving; the playtest is the review |
| After a wipe | **Points are kept** (as built: `learnFromFight` awards them won or lost). Practice on the Bench or in the Lab awards none | Knowledge isn't loot; no grinding on the test scene |

## 1. Rules

### Points and levels

- A **point** is one witnessed firing run of a line whose subject is a known rune, method or solvent, in a trip fight (one per consecutive run, not per affected tile; unchanged from the built rule). Points are stored per subject, household-wide.
- **Thresholds** (*tune by playing*): runes 8 / 25 / 60; methods and solvents 5 / 15 / 36. The existing `FOOTNOTES.levels` becomes per-kind.
- A firing credits every subject whose line fires, so a flavoured Bind invention's hit can credit the rune lines it uses, Bind's lines and the solvent's lines. No double counting within one subject for one run.

### Slots, variants and capstones

- **Line slot:** one per (line, level I or II). A slot is open when the subject's level is at least the slot's level **and the line is witnessed**. Filling an empty slot costs the solvents above; a filled slot can be re-picked free.
- A level II variant is **independent of the level I pick**: either of its two works with either of the level I variants. Authors write each pair so every combination reads sensibly (4 combinations tested per line).
- **Capstone:** one per rune (not per line), open at level III. It does not need a witnessed line. A rune's two capstones are always shown together on its page once level III is reached. Re-picking is free.
- **Variant guidance:** prefer a choice that changes how you wire over a straight number; a pair should be two reasonable opinions, not a worse and a better. Level I may adjust a rule's reach or length; level II should add an interaction with a neighbouring line; a capstone should invite a new wiring (a new target, trigger or follow-on).
- **Illustrative capstones** (not yet authored, *tune by playing*): Shove: "a crush also shoves the unit it crushed against" or "a unit pushed over oil leaves a slick behind". Spark: "a burst that kills a unit lights its tile" or "a spark that lands on a jar opens it a round early".
- **Aura reach (BL-50):** the diagonal reach is **one of each aura's two capstones** (Afterglow, Steep, Coil: "also acts through diagonally touching cells"), so it comes with overlays designed in the same build. *Proposal.*

### Methods and solvents

- A **method's margin** (Conduct, Repeat, Margin, Bind, Lift) holds slots on the lines the Bench already reveals for it (what a Bind does on a wet tile, a Conduct through a plate…). Its capstone is a conditional extension of the method (Conduct: "also carries a mark"; Repeat: "also repeats after a push").
- A **solvent's margin** (14) holds slots on its own lines; its capstone changes what the flavour does in a named situation.
- Both appear on the **method page** and **solvent page** in the notebook, alongside the rune pages. A level is open when the household has used the method or solvent in an invention that has fired the line in a trip fight.
- The Bench reveals lines for inventions but awards no points, as now.

### Rival notes

- Each rival's page (BL-118) names one rune and one slot; the note is the extra option there and appears only after the page is held. It never replaces the two authored options. It is authored in that rival's own voice and carries a lore line about the rival ("the Lamplighter's note on Jar: the wick does not care who lit it").
- The rival is beaten in the district; its note is a rare, named variant, so a build that uses it says so on the page (the owner's hand credits the author in the margin).

### Notebook presentation

- Every rune, method and solvent page has a **margin column**: filled slots as short handwritten lines, open slots with two choices, locked slots as frames with their threshold. A point counter shows progress.
- The margin appears wherever the subject is used: the preview shows the written variant's effect like any other rule, in the owner's hand.

## 2. Content plan

- **Pass 1 (Seam basics):** level I exists for Bolt, Shove, Spark, Oil. Write the other nine Seam runes' level I, then level II for all 13 and 13 pairs of capstones; level I, II and a capstone pair for each of the five methods. Needs the fine-print audit (BL-101) first, since a slot needs a witnessed line.
- **Per district (BL-113 to BL-117, BL-124):** that school's 3 runes (levels I, II and capstones), its 2 solvents, and its rival's note.
- Order inside a pass is free; runes with more lines (more places to fire) get their margins first.

## 3. What stays open

- The **exact variants and capstones**: authoring happens in the content passes, with a scenario test per variant (see the `scenario` skill) that proves the 4 combinations on a line.
- Whether points should also credit the **invention's parts** or only the method and solvent on a flavoured line (default above credits both).
- The thresholds, after playtest data.
- **Invention notebook organisation** (BL-122): a shelf concern, not a progression one.
- Whether a **fifth level** or prestige exists after the capstone: not planned.
