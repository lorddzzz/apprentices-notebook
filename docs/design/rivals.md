# Rival Inscribers

> **Status: Decided — core direction** (2026-10-22); unbuilt. Detailed defaults below are **Proposals to validate in the first Lab prototype**, not player-approved mechanics. Roadmap: BL-30, BL-118. No implementation plan yet.
> Summary and decision log: [DESIGN.md](../../DESIGN.md) §6.7 and §11. Related: [city-and-districts.md](city-and-districts.md) (guild schools), [party.md](party.md), [rune-design-final.md](rune-design-final.md) §10 (current rival direction).

## 0. Decided in the scoping round (2026-10-18)

| Question | Decision | Why |
|---|---|---|
| Who they are | **Each guild's inscribers**: an elite in the deeper rooms and the heart's master. A few come back across trips as **named faces** | Rivals belong to the guild schools, so every district has its own |
| Their rules | **Mostly yours: the same runes, plus one signature trick** per rival that you can't get | Runes stay honest when an enemy uses them too. The trick makes each rival memorable |
| The best moment | **Breaking their chain**: you read their telegraphed spell and starve it (shove away the unit their trigger waits for, put steam in a line's path, put out the oil they meant to light) | Into the Breach for spell chains |
| The reward | **A page of their lattice**: witnessing their casts reveals fine print and names any idiom actually performed; victory brings home a spell page. The 2026-10-22 round below chooses its format (BL-118); the old folios are retired | You learn a school by facing it |

### Design round (2026-10-22)

| Question | Decision | Why |
|---|---|---|
| Fighting style | **A recognisable routine with responses to the board.** A Lamplighter sets a trap, then tries to drive you into it; when the setup is gone, they change plans for a later telegraph. An already shown aim remains locked | Learn the rival's style while letting each fight unfold differently |
| Reward for breaking a spell | **A fully starved rival may make a nearby plain strike, shown in advance, with no chase or new target.** The fallback must be avoidable. Partial chains keep their resolved effects | Disruption should reward foresight without making the rival helpless at close quarters |
| Recovered page | **Their intact, annotated spell**, with notes explaining its cleverness and a little of its author's story; try it and adapt it. No repair puzzle is required | Keep the reward connected to the fight and immediately useful for study |
| First signature trick | **The long wick.** The canal Lamplighter can spend a later turn opening his existing jar from afar. That intention is shown before the party acts | An ordinary trap becomes dangerous in a new way while remaining available for interference |
| Unfamiliar components on a recovered page | **A trial copy.** Try the complete spell freely at the Bench; field use and adaptations require owning its parts, learned through the usual routes. The personal signature trick stays with the rival | Immediate experimentation without bypassing the household's learning progression |

The five rows above are the player's choices. The operational rules below are proposed defaults, to be checked by playing before a roster is authored. Alternatives were discussed in chat, not stored as competing designs in this repository.

## 1. Reading and breaking a spell

**Proposals:**

- One to three short spells per rival, normally 3–6 runes. Selecting the rival shows its short lattice, ordinary rune headlines and a separately labelled personal trick.
- The board shows the next action's path, landing, stored effects due to open, and conditional fallback. Detailed consequences follow the existing discovery rules: witnessed fine print only, with party harm always warned. Inspecting a page does not itself count as witnessing its effects.
- **Lock the Source's native aim:** Bolt keeps its direction; Touch and area Sources keep their board tile; self stays self. A displaced caster casts from its actual position, so a Bolt's parallel line can move; its direction cannot turn to follow an apprentice. A tile aim that is no longer legal fails. Recalculate the visible path and landing after each board change, without choosing a new aim. This interpretation needs a phone playtest, especially displacement of Bolt casters.
- Choose recipients from that locked aim when the cast begins. After that, ordinary shared rules apply: a unit-targeted chain follows a recipient it has already selected as effects resolve. Moving before the cast does not make the rival track the original apprentice.
- Plan the next action only at the normal enemy planning step. Movement happens before the new telegraph, as for current enemies; no extra movement is inserted between a displayed spell and its execution. Round one shows an intent without moving.
- A **fully starved** action produces no gameplay effect: no damage, movement, changed material/status or stored effect. Traversal and a failed trigger alone do not count. A placed jar counts even if nobody is hurt. A chain that accomplished anything keeps those effects and earns no fallback.
- **Fallback:** a 1-damage plain strike at one adjacent board tile chosen and shown with the main intent. If no apprentice is adjacent when planning, there is no fallback. Ties use board reading order. The tile never changes; it must still be adjacent to the rival and contain a party member when the fallback resolves. Leaving the tile or pushing the rival out of reach defeats it. No new target, chase or bonus action after partial success; stun, death and exhausted charges do not trigger this contingency.

Damage and chain length are *tune by playing*. The fallback is conditional, not a second scheduled attack.

## 2. First rival: the Lamplighter with the long wick

**Decided placement:** a guild elite in canal room 4; the lamp-mother remains the heart. The wardens' pass is still a normal conditional loot offer after that room, not automatically granted with the rival page. See [city-and-districts.md](city-and-districts.md) §5b.

**Proposed character:** a working lamplighter checking a route, carrying an improbably long taper and the wardens' pass. Their page explains how to leave a light where it will be needed; a margin note hints that the lamps keep the drawn streets in place. A personal name and finished prose can come with district content.

### Spell kit (*Proposal*)

| Action | Construction | Purpose |
|---|---|---|
| Leave a lantern | `Bolt → Jar → Oil → Spark` | A normal step-jar at Bolt's landing. If it lands under a stationary unit, placement does not count as entering it. The sealed oil and spark resolve only when opened |
| Drive them toward it | `Bolt → Oil → Shove` | Uses ordinary oil and movement rules to push or slide a target toward the jar, or another visible hazard |
| The long wick | Personal action, not a household rune or an extra cast | Open the existing owned jar instead of casting a spell that turn |

The starting prototype uses a step-jar so remotely opening it is a meaningful choice. The earlier canal sketch's Jar-and-Fuse wording is refined to this pair; Fuse can be explored later, not added as another starting spell.

**Long-wick details (*Proposal*):** one ordinary owned jar at a time. Opening it remotely consumes the Lamplighter's action; it cannot be placed and remotely opened in the same turn. The intent names that particular jar and highlights it, its current tile and its contents. This is an explicit **object lock**, not a spell re-aim: drift or Draw carries the same marked jar and updates the preview. If it opens early, is erased, crumbles or ceases to be his, the order cannot switch to a replacement jar. Opening uses the jar's ordinary contents, origin and reaction rules, including harm to the Lamplighter and his allies. No remote fire effect is added. Its normal step trigger remains live throughout.

**Routine (*Proposal*):** choose deterministically, at the next planning step, among legal moves and actions:

1. With a live jar, prefer a shove that sends an apprentice into it without catching the Lamplighter in the resulting harm.
2. Otherwise, open the jar remotely if its current contents would harm an apprentice without harming the Lamplighter.
3. Otherwise, keep the jar and seek a useful shove into a visible hazard, or move toward a position that can herd someone toward the jar. Do not detonate harmlessly just because a turn has passed.
4. Without a jar, prefer laying a trap at a useful legal Bolt landing near the party. If no useful placement exists, approach or use the shove spell rather than cast an empty plan.

Ties prefer the shorter move, destination in board reading order, then aim in a fixed direction order. Full scoring and reachability belong in the build plan. No random choice or search for an unseen future party action. Changes to the setup affect the *next* plan, not the order already shown.

**Starting numbers (*Proposal*, tune by playing):** 6 HP, move 1, elite canal drop rules, one jar, normal Bolt range and five charges per spell for the encounter. Long wick needs a live jar, not a Source charge. Once spells run dry, use a separately telegraphed ordinary approach/strike; charge exhaustion never grants a surprise fallback. Start alone in the Lab, then test in room 4 with ordinary canal foes.

**Desired scene:** he lays a lantern, you step away from its tile, and his next plan tries to push someone back onto it. Another attempt shows the long wick about to open it under you. A third lets you shove him into his own trap. The scene must leave useful counters with Seam/canal tools; access to later Erase or Draw is not required.

## 3. Recovered pages

**Decided:** intact, annotated examples; no mandatory repair; free trials of the whole spell at the Bench; field use and adaptations require ownership of its parts. Ordinary spellcraft is reproducible, the rival's personal trick is not.

**Proposed defaults:**

- Winning the encounter records the page permanently as knowledge, even if the party later wipes. It is additional to ordinary room loot and does not consume the key offer. This banking policy is a proposal, separate from the player's choice of format.
- The page shows the original wiring, the ordinary rune headlines, the author's annotation and a small ready trial. For this Lamplighter, recover **Leave a lantern**, with a note showing how the separate shove spell helps it. The long wick is clearly marked as his personal trick and is never silently included in the trial spell.
- Unowned runes, methods and solvents needed by the exact example are supplied only inside its trial. They do not become household stock or reusable borrowed components. Trying a page does not unlock a method. Adaptation and field inscription use the usual ownership, solvent-writing, ink and charge rules.
- Trials reveal witnessed fine print through the normal Bench rules, but award no combat footnote points, field proof or Glyph efficiency. A recovered example is not automatically a compiled or proven Glyph. Once owned and inscribed, the player's casts earn their own normal proof and lifetime credit.
- Observing the rival in combat still reveals witnessed lines and idioms actually performed. The rival's damage and delayed effects do not count as an apprentice's Glyph accomplishment. Ownership and lifetime credit follow the originating cast through delayed effects.
- An independently invented spell remains usable before victory. Its recovered page still supplies the author's example and story. Repeat victories retain ordinary room rewards without duplicating the page or pretending its parts are new knowledge.

## 4. Prototype acceptance and remaining work

Before authoring a roster, play the Lamplighter in the Lab and check:

- Recognisable setup, herding and remote opening; useful choices when the setup disappears.
- A moved apprentice is not followed; moving the caster or blocking the line updates the preview faithfully.
- A partial chain retains its effects without a fallback. Full failure can be answered by an avoidable, pre-shown strike. Stun and death do not turn into retaliation.
- The long wick follows only its named jar, including current drift; early opening/removal and a replacement jar cannot cause retargeting or double opening.
- The trap can hurt its owner under ordinary rules, and the fight is solvable without later-district tools.
- Phone-size intent and fallback readability, including unknown fine print and the always-visible party harm warning.
- Trial-copy isolation, no accidental component unlock, banking/repeat rewards, witness behavior and delayed-effect credit.

Remaining before implementation: a build plan with exact action priorities and movement scoring, lattice authoring and save representation, plus scenario tests for the above. Validate the proposed aim/fallback rules and page economy in the prototype. Other rivals' complete lattices and signature details are authored with their districts; this round does not decide a full roster.

## Current implementation boundary (2026-10-22)

No rival lattices, AI casting or page rewards are built. Enemy Ink already uses witnessed Kind behavior; jars and cast origins support either side. Prototype this Lamplighter in the Lab before authoring a roster (BL-30). School identities and methods are current; aspects, recipe discovery and free idiom compilation are gone. Recovered pages are BL-118. This design round changes documentation only; the proposed fight has not been played yet.
