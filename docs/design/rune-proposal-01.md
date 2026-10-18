# Rune Design Proposal 01 — Discovery and Experimental Invention

> **Status: Complete proposal for comparison** (2026-10-18, ten design rounds). This is the first independent rune design proposal, developed with Codex in this conversation. It is not an adopted redesign of the game, an implementation plan or a playtested specification.
> **Working agreement (2026-10-18):** keep all decisions made in this proposal's design rounds here, and develop this same document into the complete proposal. The player will create other proposals with different systems, agents or models for comparison. Do not propagate this proposal into the existing design documents unless the player requests it.
> **Starting references:** [rune-content.md](rune-content.md), [research-and-mastery.md](research-and-mastery.md), [city-and-districts.md](city-and-districts.md), [rivals.md](rivals.md), [party.md](party.md), and [DESIGN.md](../../DESIGN.md). These provide context; implemented content and connected design decisions are open to question.

## How to read and maintain this proposal

- **Decided** means the player explicitly chose it for this proposal. The dated decision record below retains those choices; later changes should identify what they supersede.
- **Proposal** means a suggested rule or example still open for discussion. The carrier/action/binding model has not been accepted merely because it appears here.
- **Open** means a question remains unresolved. Keep unresolved questions visible as the design develops.
- §0 records confirmed decisions and ratings; §1 contains the complete proposed system; §2 preserves all ten design rounds. Future revisions should keep that distinction and note which earlier choices they supersede.
- Keep this document independent of competing proposals and of the game's canonical design documents.
- **Design process agreed 2026-10-18:** use narrated play situations and thought experiments, with the player rating them bad, good or great and answering occasional decision questions. Do not build or prototype experiments now. Continue in small rounds until the full proposal is developed; record reactions here and distinguish enthusiasm for an example from approval of every implied mechanic.

## 0. Decisions in the redesign (2026-10-18)

| Question | Decision | Why |
|---|---|---|
| What leads this redesign | **Discovery of rules, content and results.** Design from that intent; existing implemented content is not a constraint, and connected feature decisions can be questioned | This is what the player likes most in the game |
| What a newly acquired rune explains | **Clear action; discover interactions** | The player should understand the tool while still having things to learn by using it |
| What the Bench is for | **Invent a rune and/or effect through experiments** | Research should support invention, not only finding the ingredients of a predetermined answer |
| How we develop this proposal | **Discuss imagined experiments, without changing the build.** Explain what each tests; the player rates it bad, good or great. Mix in decision questions and continue toward a complete design | The player wants to judge the experience through discussion before implementation |
| When combat reveals full consequences | **On request.** An always-available consequence preview reveals the selected action's full deterministic outcome, including unfamiliar interactions, before commitment | The player chose deliberate checking over automatically revealing everything while aiming (round 2) |
| What the Bench and lattice each make | **The Bench invents reusable runes; the lattice composes complete spells.** An invented rune can be reused with different delivery, ordering and branching | The player chose this division in round 3 |
| Whether page placement matters | **Keep a freely expanding spatial page, routing and shared auras.** Arrangement can change a build; it is not merely a drawing of explicit connections | The player chose to retain the page puzzle in round 3 |
| Rune ownership | **Permanent household knowledge; inscriptions limited by ink, not copy counts.** Every apprentice can use a learned rune, and every placement pays its ink cost | Chosen in round 5 |
| Inventions as ingredients | **Allowed.** A compatible invention can be used in further experiments, with its composition inspectable | Chosen in round 5; termination and complexity rules still need design |
| Cost of curiosity | **Trials and recording valid inventions are free** once the required materials and methods are known. Ink limits the equipped build | Chosen in round 5; no research resource is consumed to register a new rune |
| Casting during an expedition | **One move and one cast per apprentice each turn; no trip spell charges.** Actions, consequences and danger limit use | Chosen in round 6; HP and room dangers still create pressure to return |
| Party ink allocation | **Each apprentice has a separate ink allowance.** Household capacity improvements benefit all three | Chosen in round 6; exact budgets remain to be proposed |
| Rewiring | **Free at home and occasional expedition safe places; fixed during battle.** The notebook can always be inspected and observations recorded | Chosen in round 7 |
| Knowledge after defeat | **Every actually learned rune, method and interaction survives immediately.** Defeat ends the trip and loses unbanked physical rewards, not learned tools | Chosen in round 7; recognising a clue is not automatically learning its unavailable method |
| Main source of advanced runes | **Find building blocks; invent most advanced runes.** The city supplies actions, materials and composition methods, with finished examples and occasional ready-made runes alongside them | Chosen in round 7 |
| Glyph efficiency | **Earn improved efficiency through field achievements.** Optional desk mastery puzzles are not the chosen route | Chosen in round 8; specific achievements and reward caps follow |
| Rune variants and footnotes | **Variants come through invention; no separate rune upgrade trees, levels or witness-point bars.** Footnotes record useful insights | Chosen in round 8 |
| Chain limits | **Large, finite chains; recast to renew them.** Releases and replays are spent; spreading or moving an effect does not refresh it; repeats cannot schedule themselves indefinitely | Chosen in round 9 |

### Recorded preferences from the walkthroughs

| Date / round | Situation | Player's rating | Design implication to explore |
|---|---|---|---|
| 2026-10-18 / 1 | Constructing a predictable recoil or pinning mark from understandable parts | **Good** | Keep intentional construction as the foundation; it is not yet the strongest source of excitement |
| 2026-10-18 / 1 | An invented ink mark unexpectedly spreads its stored action through steam, including to allies | **Great** | Prioritise transferable interactions and discoveries that can complicate a plan as well as help it |
| 2026-10-18 / 1 | A new binding makes familiar actions useful in new ways, including another apprentice activating them | **Great** | Make discoveries reopen existing tools and party combinations |
| 2026-10-18 / 2 | Ink and wax carry the same stored action but differ in spreading and vulnerability to heat | **Great** | Develop material choice as a source of different uses and counters, rather than a numerical upgrade |
| 2026-10-18 / 2 | Reproducing a rival's construction before defeating it, provided the necessary parts are already owned | **Great** | Use observation and understanding as routes to constructions; avoid a separate recipe-unlock requirement when the ingredients and technique are already available |
| 2026-10-18 / 3 | Pushing a target and then holding its new neighbours, with a different outcome when the order changes | **Good** | Retain useful spatial sequencing without treating it as the main source of discovery; target-changing runes still need shared semantics |
| 2026-10-18 / 4 | Impulse carries a push through connected brass, including to allies | **Great** | Make material transmission useful for immediate actions as well as stored effects |
| 2026-10-18 / 4 | Transfer moves a mark or seal intact, allowing enemy magic to be repurposed | **Great** | Treat existing magic as something spells can manipulate, with inspectable rules shared by allies and enemies |
| 2026-10-18 / 4 | Afterimage shares a delayed repetition rule across adjacent actions on different spell paths | **Great** | Develop auras that change behaviour; keep their effects local enough to trace |
| 2026-10-18 / 6 | An apprentice's habit lets them leave a seal on the floor for the next entrant to collect | **Great** | Make recruits open alternate uses of the shared collection through explicit personal rules |
| 2026-10-18 / 9 | A rescue Glyph earns efficiency through varied useful field accomplishments rather than repeating one easy feat | **Great** | Recognise different kinds of successful use within a Glyph's role, including setup and delayed contributions |
| 2026-10-18 / 9 | A Bench session compares an invention under different known conditions, explains incompatible parts, and permits free recording | **Great** | Make the test scene and observation part of research, without a hidden exact-recipe score |
| 2026-10-18 / 10 | First evening: prepared spells, a short discovery trip, then a personal invention and an interaction surprise | **Great** | Introduce invention early while leaving later methods mysterious |
| 2026-10-18 / 10 | Middle game: choose which principles to learn, with independently useful schools combining later | **Great** | Use branching knowledge acquisition rather than a prescribed recipe ladder |
| 2026-10-18 / 10 | Late game: move existing surfaces into future effects and let rivals disrupt those preparations | **Great** | Escalate by changing how established rules meet, rather than adding a larger damage tier |

These are confirmed reactions to the narrated experiences. The implications are our working interpretation; ratings do not settle every ingredient, timing rule, cost or limitation in the examples.

## 1. Complete design proposal

**Completed for comparison, 2026-10-18.** §0 records the player's decisions. Other rules here are **proposed defaults**, including names, prices, durations and content allocation. These complete the design without claiming that every detail was separately approved or playtested. No implementation is part of this work.

### 1.1 The experience and the information promise

The Bench invents reusable runes. The lattice composes spells. The city supplies new actions, materials and methods; the player invents most advanced runes. Every new rule should make an old spell, room, rival or apprentice worth reconsidering.

Intentional construction earned **Good**. Unexpected material interactions and discoveries that reopen old tools earned **Great**. Spatial sequencing earned **Good**. Construction and sequencing support the stronger pleasure of finding more possibilities than the player deliberately put into a spell.

A rune explains its basic action, eligible targets, parameters, duration and consumption. It need not enumerate every interaction. Material interactions work before the notebook records them; learning a fact never changes physics. The notebook keeps witnessed rules with examples and links to affected inventions.

**Decided:** full consequences are available on request before casting, including unfamiliar interactions. Ordinary aiming shows direct targets and enemy intent. The expanded preview distinguishes certain results from effects dependent on later choices, movement or terrain. It does not pretend to know a future decision.

Unknowns appear as witnessed effects, samples, unfinished notes, folios and questions linked to districts. Do not enumerate every possible invention as an empty recipe silhouette. Named mysteries and authored folios can still have silhouettes.

### 1.2 What is collected

| Knowledge | What it provides | Examples |
|---|---|---|
| Basic runes | An action, delivery or targeting rule | Shift, Hold, Heat, Line |
| Materials | A placement rune and a substance whose interactions can be investigated | Ink, wax, steam, brass, oil |
| Methods | A general transformation of compatible rules into a new rune | Bind, Conduct, Lift, Delay, Repeat, Margin |

Materials are learned knowledge, not consumables rationing experiments. A sample or lesson teaches the material once. Every learned rune is household knowledge; any apprentice may inscribe it repeatedly, paying ink for each placement.

Properties such as movement, thermal, persistent and unit-targeted explain compatibility. They are not unique aspect-pair identities. Remove the old unique-pair requirement, aspect ceiling and exact-recipe proximity score. Schools organise teaching; they do not own exclusive permission to use a verb.

### 1.3 Authored building blocks

This is the proposed early-to-late vocabulary, not an opening inventory dump. Values are build ink and are **tune-by-playing defaults**. Sources deliver a flow; they do not add automatic damage.

| Rune | Basic rule | Ink | Introduction |
|---|---|---:|---|
| Touch | Select a unit or tile within one orthogonal step | 1 | Start |
| Line | Travel up to four tiles cardinally; first unit, solid obstacle or steam tile is the impact target | 2 | Start |
| Self | Select the caster | 1 | Start |
| Strike | Deal 2 damage to a unit or destructible plate | 2 | Start |
| Shift | Move a unit one tile in a chosen cardinal direction if the destination is free | 2 | Start |
| Guard | Shield a unit against the next 2 damage, until the next party turn | 2 | Start |
| Hold | Prevent a unit changing tiles until the next party turn | 2 | Seam |
| Heat | Change susceptible materials at the target, then deal 1 damage to a unit there | 2 | Seam |
| Ink | Mark a unit or stain a free floor tile | 1 | Seam |
| Wax | Put a plain seal on a unit | 1 | Seam |
| Oil | Place oil on a floor tile | 1 | Seam/canals |
| Steam | Place a steam tile; adjacent steam forms a cloud | 2 | Seam/bathhouses |
| Brass | Coat a unit, or raise a solid conductive plate on a free tile | 2 | Seam/foundry evidence |
| Bend | Turn the written flow 90 degrees on the page | 0 | Start |
| Fork | Split into two ordered branches, initially using the same targets | 1 | Seam |
| Neighbours | Replace targets with units orthogonally beside their current positions | 2 | Bathhouses |
| If | Keep only targets satisfying a selected, learned predicate | 1 | Notaries |
| Erase | Remove one selected mark or seal without releasing it | 2 | Notaries |
| Exchange | Swap a selected unit with a unit on a chosen adjacent tile; fail if either cannot move | 3 | Bridges |
| Redraw | Exchange portable surface contents of two adjacent floor tiles, not occupants | 4 | Cartographers |

Start with prepared pages using Touch, Line, Self, Strike, Shift, Guard and Bend. Introduce materials and methods over the first expedition and return. Bend is free because it adds routing, not an effect; routes cannot form cycles.

Immediate options remain worthwhile: Strike harms, Guard protects, Shift changes position, Heat changes material. There is no single Spark rune that every setup needs to cash in.

### 1.4 Material behaviour inherited by inventions

| Material | Proposed distinctive behaviour | Implication |
|---|---|---|
| Ink | An inscription spreads to units in connected steam; a floor stain marks an entrant | A stored action travels with its mark; plain ink has no automatic damage bonus or detonation |
| Wax | Stays with its bearer; Heat melts it and destroys its stored action | Prevents diffusion, but offers thermal counterplay |
| Steam | Orthogonally connected clouds stop Line at the near edge and extinguish fire | Obscures delivery and gives ink another route |
| Brass | Solid plates block movement; touching plates and coated units form a network | Conduct can transmit force, protection or heat |
| Oil | Flammable; extends forced movement one tile in its direction, at most once per initiating push | Supports movement plans as well as fire |

Supporting states and terrain:

- **Fire:** burning oil. Heat lights it; ignition spreads once through connected fuel. Fire deals 1 damage to occupants at each hazard step while fuel remains. Spell-created oil has two environment steps of fuel; ignition preserves its remaining life, while igniting permanent environmental oil gives it two burning steps. Steam extinguishes the fire without renewing the oil. Fire creates no fresh fuel.
- **Hot brass:** Heat makes brass scald adjacent units for 1 at the next hazard step, then cool. Reheating requires another action.
- **Current:** at the environment step, carries floating oil, floor ink and unanchored occupants one tile downstream. Water is not automatically conductive.
- **Drops:** moving into one defeats a unit. Layouts and previews show the edge clearly. Hold prevents the movement before a fall.
- **Unfinished paper:** late terrain on which Redraw can move explicitly portable surface layers. It does not exchange walls, drops or occupants as though they were oil.

Duration defaults: ink and wax expire at the end of the second following party turn; stored effects inherit that lifetime. Spell-created oil and steam last through two environment steps unless transformed. Plates last for the encounter. All remaining lifetimes are inspectable.

A unit has one ink slot and one wax slot. Applying a new inscription replaces the same-material inscription without release. Transfer into an occupied same-material slot fails and leaves the original intact; Erase can deliberately make room.

Diffusion is checked when an inscription meets steam, when its bearer enters steam, or when steam reaches an existing inscription. It copies the inscription's whole stored rule to eligible living units in that connected cloud, subject to the shared spread history in §1.9. A copied mark replaces a different ink inscription as ordinary application does; there is no random choice between marks. Newly created plain ink, oil and steam may refresh their own material through a new cast; copying or moving an existing inscription does not.

Brass coatings last for the encounter. Normal damage can break a plate: give it 2 durability, with Strike able to hit solid destructible targets as well as units. Breaking a plate opens its tile and can sever a network. Guard replaces a unit's remaining shield with 2 rather than stacking unlimited shielding. These are proposed initial limits, not special exceptions for enemy versions.

Heat's material changes happen before its damage and after-hit responses. Melting a wax seal can prevent it from releasing. Guard absorbs harm but does not erase the fact of a hit.

### 1.5 A bounded experimental grammar

Select a learned method and compatible ingredients. The result follows from that method; no exact named parent pair is secretly required. A compatible invention may become an ingredient in another.

| Method | Construction | Limits that make the rule honest |
|---|---|---|
| Bind | Carrier + effect + event: store the effect until that event | Ink and wax initially support storage. A bare Source, selector or aura is not a standalone stored effect |
| Conduct | Brass transmission + immediate unit effect: deliver it to units on or beside the touched network | Does not create brass; visits each recipient once per pulse |
| Lift | Shift addresses one carried inscription instead of its bearer, producing Transfer | Adjacent recipient must have a free compatible slot; preserves contents, direction and expiry |
| Delay | Execute an immediate effect at its captured tile next party turn | Does not secretly follow the original unit |
| Repeat | Execute an immediate effect now and once next party turn at its captured tile | Replay cannot schedule itself again |
| Margin | Turn a learned timing transformation into an aura over adjacent eligible page actions | Initially supports Delay and Repeat; contacts and cost remain explicit |

Bind begins with **after-hit**. Later events include **after the bearer moves** and **after a unit enters a watched tile**. A hit means damaging contact, even when absorbed by a shield. A newly armed effect cannot react retroactively to the event that armed it.

Carrier support is explicit: ink can hold an effect on a unit or in a floor stain; wax ordinarily needs a bearer. A floor inscription bound to entry is armed when placed, consumes itself when a unit enters, and releases its action on that entrant. A floor inscription bound to a bearer event instead transfers onto the entrant and waits for a future event; pickup itself does not trigger it. The Draughtsman's habit extends floor placement to wax. A conflicting carrier slot prevents pickup, while an entry-triggered floor inscription needs no new carrier slot because it is consumed on the floor.

A stored payload can itself be a finite invented effect, including Impulse or an application of another stored rune. Conduct and timing methods initially require an effect that resolves immediately without itself storing or scheduling another rune execution. An immediate effect may still leave a status or material that interacts with the world: Guard, Hold, Heat and plain material placement qualify. Applying a stored-action mark does not qualify for Repeat. This is a visible compatibility rule, not a secret whitelist.

A Glyph is a written pattern with routing and potentially several actions, not automatically a single Bench effect. Its constituent invented runes remain valid ingredients. **Proposed simplification:** remove separate Crystallise conversion and its currency; further invention does not require sacrificing a Glyph.

| Suggested invention name | Construction | Result |
|---|---|---|
| Recoil | Bind Ink + Shift + after-hit | Consume the mark after a hit and shift the surviving bearer |
| Wax anchor | Bind Wax + Hold + after-move | Consume the seal after movement and hold its bearer |
| Impulse | Conduct Brass + Shift | Push each unit touching the network once |
| Brass shelter | Conduct Brass + Guard | Shield each unit touching the network, including enemies |
| Transfer | Lift + Shift | Move one inscription intact to an adjacent bearer |
| Counterseal | Bind Wax + Impulse + after-hit | Release a network pulse from the bearer's position, if brass is present |
| Afterimage | Margin + Repeat | Adjacent eligible actions occur now and repeat once next party turn |
| Deferred margin | Margin + Delay | Adjacent eligible actions occur next party turn instead of now |

Invalid construction and ineffective use are different: Fork cannot be stored alone because it has no board action; wax cannot conduct because it is not a network; Counterseal is valid but has no network payoff when released away from brass.

The player supplies names. A new name does not reset the same construction's history or create mechanical differences.

### 1.6 A real experiment in the finished game

At the study, construct a candidate and inspect its basic rule. Test against a subject, add known steam and another subject, then swap ink for wax and compare. The test scene can reuse encountered terrain and enemy behaviour, without unlocking their missing runes.

Provide a small adjustable scene, convenient saved situations, repeatable trials, a causal replay, and comparison with the previous trial. The player need not author a full level. Invalid combinations explain the mismatch. Every valid result can be recorded for free.

The notebook records observations and personal hypotheses. The Bench does not prescribe an optimal build. Trials earn no Glyph mastery; they are safe learning, while useful field outcomes earn progression.

### 1.7 Reading a lattice

**Decided:** use a freely expanding spatial page with meaningful routing and shared auras. Sources start spells; actions and selectors run in their written order.

Proposed shared semantics:

- A unit target follows that unit's movement. A tile target remains a tile.
- Neighbours uses positions when reached, excludes the original centres and deduplicates recipients.
- Failed ordinary effects do not implicitly stop a branch. A blocked Shift leaves the original target for subsequent actions. If can make continuation require successful movement.
- Initial If predicates concern visible allegiance, a material and whether the preceding action succeeded.
- Fork starts both branches from the same targets; the first branch resolves before the second. Each can retarget independently and the first can change the board for the second.
- Bend changes the written route, not a projectile's board direction.
- No written cycles or joins that execute the same cell twice in one cast. Invalid wiring is identified while editing.
- Dead or missing unit targets receive no further unit actions. The flow does not secretly retarget the killer. Captured tile effects remain at their tiles.
- Cast parameters, such as Shift direction, are chosen before commitment. Stored effects retain them through diffusion and Transfer.

An action uses the target's tile when it needs a location. If Line reaches its maximum range without an impact, its endpoint tile is the target. A unit-only action there has no effect if no unit is present; a material-placement action can still work. A block at a wall does not imply that a spell can create a material inside the wall.

Exchange resolves both occupants' relocation together, then emits their movement and entry events. Either unit being Held makes the whole swap fail. Redraw uses the current target tile and one adjacent destination chosen before casting. Its portable contents are oil (with any fire) and floor inscriptions, including a floor wax seal placed by a habit. Their lifetimes and stored actions travel intact. It does not move steam, brass plates, walls, water channels, drops or units. Moving a floor inscription under an existing occupant is not entry and does not itself trigger pickup; actual contact with steam can still cause diffusion.

Line → Shift → Neighbours → Hold pushes a struck unit, then holds its new neighbours. Reordering the same parts changes which neighbourhood is held. A blocked Shift still permits the later actions unless an explicit gate requires success.

### 1.8 Auras and folding a Glyph

An aura modifies eligible action runes in its four orthogonally adjacent page cells, not every later action on those paths. One placement can affect two spells. Only one timing aura may modify an action in this initial design; conflicting contacts are invalid and visible while editing.

Afterimage repeats the affected action, not its whole downstream chain. It captures distinct acted-on tiles and the action's parameters. A repeated Conduct re-evaluates the network touching its captured anchor tile next turn; the preview identifies that future dependency.

A Glyph is a named, versioned reusable pattern. Saving is free and does not require repeated casts. Initially its cost and behaviour are unchanged. Entry, exits, interior and any compatible action parameter are inspectable.

A Glyph contains at least two connected non-routing runes, including a board action; a Source or selector may be the other part. A single renamed atom is not a separate mastery track. Bend alone does not satisfy the minimum. Parameters must preserve the pattern's declared compatible interface.

**Proposed geometry default:** folding changes the display, not the physical footprint. Its card still occupies that footprint and shows the actual boundary contacts. External auras reach only the inner actions they physically touched; internal auras keep their relationships. Folding cannot make every inner action adjacent to one external aura.

Changing actions or a parameter choice creates a new behavioural version for mastery. Old versions and records remain usable. Renaming or moving a whole pattern without changing its relative rules does not erase mastery.

### 1.9 Large chains with finite consequences

**Decided:** large, finite chains; recast to renew them.

Proposed shared laws:

1. Written paths and invention definitions cannot refer back to themselves. Nested inventions have finite visible parts and pay for them.
2. Consume a stored mark before executing its payload. Each diffused copy has one release.
3. An ink inscription and all its diffused copies share expiry and spread history. That inscription may spread to each bearer once per encounter. Transfer does not erase this history or give it a fresh lifetime.
4. A Conduct pulse snapshots its connected network and eligible recipients, and affects each recipient once. Its own movement cannot make it find a recipient again.
5. A replay contains a finite captured payload with its repetition instruction already spent.
6. Expiry, replacement and destruction do not release payloads. The initial methods cannot recreate their own parent inscription.

A new cast creates fresh work. Long legal chains can clear a room; they are not silently truncated at an arbitrary event count. Shared diffusion history needs a clear explanation and trace so the limit is part of the learnable rule.

### 1.10 Combat timing

Use three apprentices and roughly a 7×9 board. Each has one move and one cast, in either order. Party order is freely chosen. No spell charges run out during the trip.

Timing language in the player examples is relative to the casting side: “next party turn” means the next turn of the side that originally cast the effect. Rivals use the same rules with their next enemy turn. Expiry and scheduled actions also resolve at the start of enemy turns when due; those pending effects are included in visible intent. Transfer preserves the original timing and casting side. A turn in a duration means a whole side's turn, not the order in which an individual apprentice acts.

Proposed sequence:

1. Start of party turn: expire due effects, then resolve scheduled work in creation order.
2. Enemies declare their aims from that board.
3. Party members move and cast in chosen order.
4. Start of enemy turn: expire its due effects and resolve its scheduled work, then enemies execute in the shown order using their declared aims. Broken prerequisites can stop their chains; no hidden re-aim or replacement attack.
5. Current moves eligible contents, then fire and hot-brass hazards resolve, then environmental lifetimes advance.

Responses resolve after the action that caused them and before the next ordinary action. Simultaneous marks use their visible application order. Lifetime expiry at the end of a party turn occurs before enemy execution when that is the duration's stated endpoint.

For multi-target actions, determine the recipient set when that action begins, then resolve in the shown order: nearest to the action's anchor first, ties in board reading order. Do not rescan after each recipient moves. A unit-targeted effect follows an already selected recipient to its current position; a dead recipient is skipped. Current movement resolves from downstream to upstream; blocked destinations remain blocked and competing moves to the same destination fail together. Its movement and material arrivals trigger the same visible reactions as other completed movement.

Marks and queued effects already placed remain when their caster is defeated, until released, destroyed or expired. All temporary battle effects clear when the encounter ends. A room cannot be stalled to bank additional achievements from the same milestone, and recovery comes at home rather than from an unlimited healing loop.

Hold prevents voluntary movement, Shift and drift. It does not prevent an inscription being Transferred off the bearer. Redraw moves eligible surfaces, not held occupants. Current movement counts as movement and entry; a failed push does neither.

Large sequences can be stepped through. Full predictions remain on request. Effects depending on an unchosen future action are shown as conditional.

### 1.11 Ink and field mastery

**Decided:** each apprentice has a separate allowance; household improvements benefit all. Proposed capacity: 16 ink initially, reaching about 24 through a few banked upgrades. Numbers are tuning defaults.

Price the complete behaviour:

- Basic prices are in §1.3.
- Bind adds carrier placement cost + 1 for the event + 1 for storage to the payload's full cost.
- Conduct adds 2. Lift adds 1 to Shift.
- Delay adds 1. Repeat pays the immediate effect again, plus 2 overhead.
- A shared Delay aura costs 1. A shared Repeat aura costs 2 plus the full cost of each exposed action it repeats; those actions also pay their ordinary placement costs.
- Nesting and folding retain expanded costs. Sharing an aura saves transformation overhead, not the work of several actions.

Illustrations: Recoil 5; Wax anchor 5; Impulse 4; Transfer 3; Counterseal 7. Line → Recoil costs 7. An invention can be recorded even when too expensive to equip.

**Decided:** Glyphs become more efficient through field achievements. **Proposed thresholds:** 3 different useful achievements earn −1 ink; 6 earn −2. Total reduction cannot exceed half that version's base cost, rounded down. This lets a simple Touch → Shift rescue pattern earn a useful discount while preserving a meaningful price. The saving is permanent for that version and takes effect when next editing.

| Role | Examples of evidence |
|---|---|
| Defence | Prevent a declared hit; rescue from a current-driven hazard; absorb an enemy attack |
| Control | Break a declared movement-dependent spell; displace a foe into a hazard; hold a foe at a position prepared by an ally |
| Material use | Obtain a useful payoff through diffusion; change a result by altering a network; extinguish an enemy hazard |
| Manipulation | Transfer an enemy seal and obtain a useful release; erase a hostile stored action; relocate a surface to interrupt a threat |
| Timing/teamwork | A delayed action pays off after the board changes; one apprentice supplies an effect another activates |
| Harm | Defeat several foes through a reaction; defeat a dangerous foe through terrain; overcome protection by changing the board |

Recognise realised outcomes, not unused setup. Credit a setup or delayed Glyph when its descendant effect pays off, with the event chain shown. Do not call an ally rescued from an attack that was never due to occur. Player-created friendly hazards do not qualify as rescue achievements.

A category-and-mechanism milestone counts once per version. Show relevant opportunities without requiring a support specialist to deal damage. The catalogue must offer enough milestones within each role; six is a tuning hypothesis, not a reason to invent busywork.

Within a support role, distinguish realised circumstances: preventing an ordinary attack, preventing a lethal attack, surviving environmental harm, protecting multiple allies with one action, successful delayed protection and an ally-enabled release. A single resolution can record several observations but contributes at most one new mastery milestone; the remaining milestone can be earned in a later meaningful situation. The trip page shows the exact event and why it qualified. Trivial patterns may naturally support fewer achievements, but no required milestone should demand an unrelated damage function merely to complete a tier.

Nested Glyphs receive the better of an outer discount or their contained discounts, never both on the same contents. Discounts cannot make an action's ink contribution zero. Reverting to an earlier version restores that version and its own record. No efficiency tier is lost because a subsequent cast was ineffective.

No separate rune XP, witness bars or upgrade trees. Footnotes are observations and examples; new rule variants come through Bench methods.

### 1.12 Apprentices and the trip

Choose three apprentices from a growing household. Everyone can use all knowledge. A member has a school lean, one explicit habit, a body and a personal basic action.

Proposed school lean: discount one matching method overhead on the page by 1 ink, never the action itself. It applies once per member's page, not to every duplicate. School identity encourages a style without making outside experimentation prohibitive.

Illustrative initial trio; these particular habits are proposed, not all individually approved:

| Apprentice | Habit | Body and basic action |
|---|---|---|
| Draughtsman | Can leave a seal on a free floor tile for the next entrant; pickup does not trigger the newly armed seal | 10 HP, move 3; Shove an adjacent unit |
| Stoker | When their Heat melts a seal they authored, may choose to release it before melting | 12 HP, move 2; Tend adjacent oil, lighting or extinguishing it |
| Courier | May split movement before and after casting | 8 HP, move 4; Swap with an adjacent willing ally |

Basic actions spend the cast action. Habits are explicit exceptions shown in relevant readouts; they do not silently rewrite the notebook's universal rule. The Draughtsman's placed seal remains a carrier with its existing lifetime and thermal vulnerability.

**Decided:** rewire at home and occasional safe places, not during battle. Inspecting rules and recording observations are always possible. **Proposed detail:** full Bench research is at home; safe places let the party rewire already learned runes, recorded inventions and Glyphs.

HP persists through rooms; home restores the party. No unlimited healing action is included in the initial rune set. Unbanked capacity finds provide a reason to return. Defeat ends the trip and loses unbanked physical rewards, but every actually learned rune, method and interaction remains. A clue is not automatically a learned method.

### 1.13 Districts and progression

Retain the seven-district setting as a working frame: Seam, canals, four middle guilds in any order, then Cartographers. Exact teaching allocation is proposed. Each middle guild must work with Seam and canals alone.

| District | Knowledge and context | What it changes about familiar tools |
|---|---|---|
| Seam | Basic actions; ink, wax, Heat, Hold; Bind after-hit; steam and brass traces | The first action becomes a stored rule; materials can carry that rule |
| Lamplighter canals | Delay, Repeat, Margin; oil and current | A fixed tile and a moving bearer have different futures |
| Notary ink quarter | Lift, Erase, If; after-move and watched-entry methods | Existing magic can be redirected, stripped or activated by another actor |
| Bathhouses | Neighbours and shaped applications; practical diffusion discoveries | One inscription reaches several recipients, including allies |
| Bell foundry | Conduct; brass placement and network manipulation | Force, protection and heat can use the same structure |
| Bridge-wardens | Exchange; Hold and stability applications; another way to learn Brass placement | Occupied positions can be exchanged, while anchoring can prevent either half of a swap |
| Cartographers | Redraw and unfinished paper | A prepared surface can change position without moving its occupant |

Some prerequisites have several routes. Bridges cannot require a foundry visit; bathhouses can use the early Bind. An optional folio may demonstrate another guild's method without making it necessary to progress.

Rewards mainly teach actions, materials, methods or useful examples. Apprentices, clues and occasional capacity finds add variety. Guild idioms describe recognisable approaches, not exact mandatory recipes.

A threshold room states an outcome and accepts any construction satisfying it. It does not check whether the player brought a prescribed rune. Returning home to investigate a clue and then solving the threshold is an intended loop.

### 1.14 Rivals and folios

Rivals have short inspectable lattices and use ordinary shared rules. A counter can sever a network, melt a carrier, move a bearer or disrupt a future footprint. Telegraphed prerequisites make the chain breakable.

A known combination can be reconstructed before defeating its user. There is no exact-recipe permission flag. An unavailable component or method remains something to acquire; observing its effect supplies a lead, not the whole missing tool.

As a working setting default, a rival may have one explicit signature trick. It cannot be a hidden exemption from material rules, and any part the player cannot reproduce is clearly identified.

Rewards can be annotated lattices, methods, folios and refinements. A player who independently invented the rival's spell should receive a meaningful example, alternate use or story, rather than a duplicate masquerading as new knowledge.

Owner and rival folios retain constrained scraps and a growing set of tests, all of which must pass together. Different valid repairs are allowed. Supplied unfamiliar parts provide a preview of later knowledge. Rewards include story, learned techniques or a ready pattern. They do not replace field achievements as the route to personal Glyph efficiency.

The Cartographers' drawing of the city, the owner's impossible Seam and the notebook's inherited notes support the same theme: understanding a rule lets the player write something the world must obey.

### 1.15 The player journey

The first-evening, middle-game and late-game situations each earned **Great** in round 10. Their detailed allocation below remains a proposed implementation of that approved experience.

**First evening:** begin with prepared short pages demonstrating harm, movement and protection. In the Seam, encounter a stored effect and find the early ink/wax/Bind knowledge. Return and make Recoil. Test it against a subject, then add known steam and another subject. Discover the diffusion of the stored push. Write a delivery spell and take it back out. The opening aims for one personal invention and one useful surprise, without requiring the exact tutorial build.

**Canals:** current changes which occupant or surface will be at a fixed future tile. Learn timing methods and make Afterimage. One aura changes two spells on the page, while the board makes their replays worth preparing for. The original Recoil remains useful.

**Middle districts:** follow a rumour or observed technique. Foundry Conduct enables Impulse and Brass shelter. Notary Lift enables Transfer. Either works with early knowledge. When both are eventually known, Counterseal and relocated effects create another round of invention. Their combination is a bonus, not an access requirement.

**Return and mastery:** a rescue or setup Glyph earns efficiency through different useful field accomplishments. A small discount opens room for another rule. A recruit's habit changes how an old invention can be used. Earlier rooms and folios offer new solutions.

**Late game:** move an oil film or inscription-bearing floor stain with Redraw. A fixed-tile Afterimage, a current and a moved surface can now interact. Rivals can interrupt the same preparations. The culmination asks the player to combine learned rules, not assemble one prescribed ultimate rune.

### 1.16 Changes from the earlier design

| Earlier feature | Treatment here |
|---|---|
| Copy-count inventory | Permanent household knowledge; per-placement ink |
| Exact Bench recipes, unique aspect pairs, resonance score | Compatible methods, descriptive properties and observable experiments |
| Consumable invention registration | Remove; materials and methods are learned |
| Separate rune mastery trees | Remove; footnotes are insights and variants are inventions |
| Crystallise conversion and Mercury | Proposed removal; inventions already re-enter research |
| Repeated-cast proof, harm-only Glyph rankings | Free pattern saving; varied field-achievement efficiency |
| External aura reaches all Glyph contents | Preserve physical contacts and footprint |
| Trip spell charges | Remove by decision; actions, HP and build commitment retain pressure |
| Fixed member-shaped pages | Keep removed; retain spatial routing and shared auras |

### 1.17 Design bets and tuning boundaries

The proposal is complete enough to compare against other rune designs. Its strongest distinction is that inventions inherit the world's material behaviour, and new knowledge changes the value of existing tools. The following remain explicit design bets, not claims of tested balance:

- **Invention versus assembly:** six explicit methods make the grammar learnable, but may feel too procedural if their material consequences do not provide enough surprises. The rounds rated the consequences more highly than construction alone.
- **Readable finite chains:** one-use effects and shared diffusion history prevent perpetual work; the notebook and causal replay must explain these limits without becoming bookkeeping.
- **Collection breadth:** the authored vocabulary is deliberately small. Districts need to introduce genuine new possibilities rather than only rename familiar recipes.
- **Glyph convenience:** retaining footprint and aura contacts protects the spatial puzzle but gives up magical space compression. Naming, reuse, parameters, versions and earned efficiency must carry its value.
- **Mastery fairness:** support and setup must receive clear credit for realised outcomes. Achievement examples and thresholds need tuning without turning play into a checklist or friendly-fire farming.
- **Budget pressure:** the proposed 16–24 ink allowances, costs and limited discounts must leave several viable spells and an interesting reason to pick three apprentices.
- **Content quality:** the initial roster habits, bridge Exchange and Cartographer Redraw are concrete defaults for this proposal, not separately confirmed choices. They can be compared or revised without reopening the confirmed principles.

Numeric balance, exact encounter boards, the complete enemy/recruit roster and interface polish remain later work. This document defines the rune system and how connected features support it; it does not claim to replace every district's full encounter design. No build or prototype was performed or requested.

## 2. Design rounds

### Round 1 — Construction, surprise and returning to old tools

**Status: answered 2026-10-18.** Ratings, in order: **Good, Great, Great**. The construction is a useful foundation; the stronger enthusiasm is for unexpected transferable interactions and discoveries that reopen old tools. All mechanics in these situations remain proposals unless separately decided. Ratings do not approve unstated balance, timing or interface rules.

1. **Construct something you intended.** At the Bench, combine a mark on a unit, a one-tile push, and a binding that releases after the bearer is hit. The result is the recoil mark. Swap Push for Hold and it instead pins the bearer after a hit. Both are valid results derived from the parts, without searching for an exact recipe. **Tests:** whether constructing a predictable rule feels like satisfying invention or like filling in an obvious form.
2. **Discover something you did not intend.** Imagine ink marks can spread through connected steam, carrying any action stored in them. You put a recoil mark on one enemy in a cloud and observe the mark spreading to other occupants, allies included. Each copy still waits for its own bearer to be hit. Later you try a Hold-bearing ink mark in the same situation. **Tests:** whether transferable material interactions provide the desired surprise, including consequences that can complicate your plan. Ink spreading, carrying stored actions, and including allies are candidate rules, not accepted facts.
3. **A find changes old inventions.** Later, a guild teaches a binding that releases a mark's action after its bearer next changes tiles, through walking or forced movement. Your existing Push and Hold now offer new constructions: a second step after movement, or a pin at the destination. An ally can push a marked enemy into position and trigger the pin. The mark is consumed before releasing its stored action, so the second step cannot trigger that same mark again. **Tests:** whether a new way to combine familiar parts is an exciting discovery reward and supports the party's shared setups.

### Round 2 — Materials, learning from rivals and seeing consequences

**Status: answered 2026-10-18.** Material tradeoffs: **Great**. Reproducing a rival by understanding it: **Great**. Preview decision: **reveal full consequences when asked**. Exact material rules remain working examples; deliberate access to the full preview is decided.

1. **The material changes the invention.** The same action and binding can be carried by an ink mark or a wax seal. In this candidate model, ink spreads through steam and can reach unintended recipients; wax stays on its bearer, but heat melts the seal and destroys the stored action without releasing it. Neither is a numerical upgrade. A steam-filled room makes ink useful for mass application, while wax keeps an ally's intended effect isolated; an enemy with heat can erase wax. **Tests:** whether choosing the physical carrier is a meaningful part of invention and counterplay. The proposed wax behaviour is new, not an existing world rule.
2. **Understanding can precede a reward.** A rival walks, releases a pulse, and shoves everyone beside it. Its telegraph makes the danger readable. If the player already owns the necessary parts and binding, they can reproduce that construction at the Bench before beating the rival; there is no additional recipe-unlock flag. The rival's page remains useful as an explained example or a more elaborate arrangement, and genuinely new components still have to be acquired. **Tests:** whether discovery by observation should permit early access to a construction rather than requiring its formal reward. The means of saving an enemy example for later study remains open.
3. **How much the combat preview reveals by default.** A recoil mark is aimed into steam and will spread to an ally. **Chosen:** the aim view shows direct targeting and enemy intent; an explicit, always-available consequence preview shows the full deterministic result, including unfamiliar interactions, before committing. No discovery gate hides information from that preview. **Tested:** whether checking a hypothesis should be a deliberate action or an automatic part of aiming. This affects how discovery is presented, not whether the game changes its rules according to knowledge.

### Round 3 — What goes on the lattice

**Status: answered 2026-10-18.** The Bench invents runes and the lattice composes spells: **chosen**. Spatial sequencing: **Good**. Spatial page and shared auras: **chosen**. Target selection and exact aura behaviour remain open.

1. **What the Bench makes. Chosen:** the Bench creates a reusable rune such as Recoil; the lattice combines ordinary and invented runes into complete spells. One spell delivers Recoil to a distant unit, another applies it to units around the caster, and another pushes a unit first and then marks it. Inventing Recoil does not fix its delivery or its place in a sequence. The final grammar must clarify where carrier binding ends and flow control begins.
2. **A spell changes where it acts as it unfolds.** Select an enemy, push it one tile, then apply Hold to every unit orthogonally adjacent to its new position. If an ally stands there, they are held too. Reordering the spell to hold neighbours before pushing affects the old neighbourhood instead. This candidate introduces a targeting rune, Neighbours, which replaces the current target with units beside it at that point in the sequence. **Tests:** whether spatial composition and order create interesting discoveries beyond stacking effects on the first target. Blocked movement, target death and multiple targets need explicit common rules later.
3. **Does page placement have a job? Chosen:** keep a freely expanding grid with meaningful routing and shared auras, without a member-specific outline. Placing paths beside the same aura lets several spells share its modification, so rearranging the page can improve a build even without finding a new rune. This choice does not automatically dictate the trajectory on the combat board.

### Round 4 — Inventions beyond waiting marks

**Status: answered 2026-10-18.** Impulse: **Great**. Transfer: **Great**. Afterimage: **Great**. Develop all three as representative behaviours in the working design. Names, construction methods and exact limits remain provisional; rating the effect does not settle how it is invented.

1. **Impulse — a material carries an immediate action.** Combine the idea of pushing with transmission through connected brass. The invented rune sends a pulse through the brass network touched by the spell and pushes every unit on or orthogonally beside that network one tile in the cast's chosen direction. Each unit is pushed at most once per pulse, allies included; blocked movement simply fails. A distant brass rail becomes a way to move several enemies, but a gap breaks its reach. There is no waiting mark and the network carries force rather than only heat or electricity. **Tests:** whether material behaviour can transform ordinary immediate actions enough to make a new rune exciting. Which materials transmit which actions must later follow a small learnable grammar; this is not permission for an arbitrary special recipe.
2. **Transfer — move existing magic.** Move one chosen mark or seal from a unit onto another adjacent unit. Its stored action, direction, remaining duration and release condition travel intact; nothing refreshes or duplicates. An enemy has given your ally a seal that pins its bearer after moving. Transfer it onto an enemy, then shove that enemy to trigger the pin at its destination. The same tool could relocate your own unused protection. In this example, the recipient has no conflicting seal; coexistence rules remain open. **Tests:** whether manipulating an existing invention, including an opponent's, feels like a valuable verb and source of discovery. The transferred rule remains inspectable.
3. **Afterimage — placement changes several spells.** An aura beside an eligible immediate action on the page makes that action happen now and repeat once at the start of your next turn, on the same board tile and with the same direction. It repeats that action only, not the downstream chain, and the replay does not schedule another replay. Put it beside Push in one spell and Heat in another: each gets a delayed repetition when cast. A push's second use might rescue an ally who later moves onto that tile, while the repeated heat can punish a foe who moves into its footprint. Moving the aura changes which spells receive this behaviour. The extra capability costs build ink; the price is not decided. **Tests:** whether a shared aura that changes timing is more interesting than a numerical bonus, and whether fixed-tile delayed consequences appeal. How aura modifications apply to invented runes, area targets and Glyph interiors remains open.

### Round 5 — Ownership, further invention and the cost of curiosity

**Status: answered 2026-10-18.** Chosen: **permanent knowledge, inscriptions limited only by ink; inventions can enter further experiments; trials and recording are free.** The notebook grows through learning. Equipped ink and acquisition of unfamiliar ingredients or methods supply constraints; exact combat and progression rules follow separately.

1. **Knowledge or copies. Chosen:** learning a rune adds its rule permanently to the household notebook. Any apprentice can inscribe it, including more than once, while paying the normal ink cost for every placement. Copies are not loot and are not used up. A new material or method remains a discovery worth finding because it opens constructions. Battle charges and other expedition limits are separate questions.
2. **Can an invention become an ingredient? Chosen:** yes, when its behaviour fits the new composition method. Put the invented Impulse inside a wax seal that releases after its bearer is hit: when triggered, it sends the push through brass touching the bearer, if any. The seal is spent once; the network pulse visits each eligible unit once. It costs more ink than a plain stored push, and the full composition remains inspectable. Allowing this does not approve unlimited depth, free copying or self-reproducing effects; termination and complexity limits still need a consistent rule.
3. **What does a Bench experiment cost? Chosen:** testing and recording a valid new invention are free once its needed materials and methods have been learned. The meaningful cost comes when it occupies ink in a build. Loot opens unfamiliar materials, methods and other opportunities; it does not ration attempts to understand them. Resource sources and sinks will follow this model, not be retained merely because another feature once used them.

### Round 6 — Casting, party budgets and apprentice identity

**Status: answered 2026-10-18.** Casting: **actions and danger, no trip charges**. Ink: **separate allowance per apprentice**. Floor-seal habit: **Great**. These choices revise connected systems only within this independent proposal.

1. **Casting limit. Chosen:** each apprentice can move and cast once per turn; spells do not have a pool of charges that runs out during the expedition. Trying a new interaction spends the action and exposes the party to the resulting board state. HP and room dangers still create push-or-return pressure. This does not authorise free rewiring during combat.
2. **Ink allocation. Chosen:** each apprentice has their own ink allowance, so the trio consists of three viable spellbooks. Household capacity improvements raise each allowance; identity can affect what a member does with it. Exact capacity and any discounts remain open.
3. **A habit gives the same invention another use.** One apprentice can put a seal on an empty floor tile instead of directly onto a unit; the next unit to enter picks it up intact. That lets them prepare a rescue seal for an ally or a trap that an enemy might collect first. Another apprentice's ordinary seal placement still attaches directly to a bearer. In this candidate, the pickup itself does not count as the future event that triggers the newly armed seal. The invention's basic stored action remains the same and the habit is explicit. **Tests:** whether a small personal rule that extends where an invention can be used makes recruitment interesting. Exact habits, later methods for achieving similar effects, and the rest of this apprentice's kit are not decided by this example.

### Round 7 — Expedition pacing and what a discovery gives you

**Status: answered 2026-10-18.** Chosen: **rewire at home and occasional safe places; learned rules and tools always survive; find building blocks and invent most advanced runes.**

1. **When can the page be rewritten? Chosen:** freely at home and at occasional safe places during an expedition; keep it fixed during battles. This makes preparation and improvising with the current trio matter while giving some chances to use a new idea before returning. Inspecting the notebook and recording observations remain available at any time. Full Bench research at safe places was not decided by this answer.
2. **What survives defeat? Chosen:** every learned rune, learned method and recorded interaction remains in the notebook, even when learned during the failed trip. Defeat ends the expedition and loses unbanked material rewards such as ink-capacity finds, but never makes the player relearn an understood rule. A clue about a method is not the same as having learned that method.
3. **What does the city primarily give you? Chosen:** new basic actions, material knowledge and composition methods; invent most advanced runes yourself. Found finished runes and rival pages still provide examples, clues and occasional ready-made tools.

### Round 8 — Glyphs, mastery and the value of understanding

**Status: answered 2026-10-18.** Glyphs: **improve efficiency through field achievements**. Rune variants: **invention, with no separate rune upgrade trees**. Desk mastery puzzles were not selected; existing story folios still have a different purpose.

1. **What should a Glyph reward? Chosen:** improve efficiency through field achievements. The proposed desk mastery-puzzle route was not chosen. Free initial saving, exact achievement criteria, reward size, versioning and aura preservation are working defaults to make coherent, not separately decided by this answer.
2. **Does each rune also need its own upgrade tree? Chosen:** no separate rune levels or witness-point tree. Learning new materials and methods provides new variants through experiments; footnotes are useful recorded insights and examples. Ordinary rune interactions do not become rules that only apply after an unlock.

**Related simplification proposed for the working design:** remove Crystallise as a separate conversion and currency system. Invented runes already re-enter experiments; saving a lattice as a Glyph already preserves a pattern. If later composition rules need a reusable pattern as input, define what its interface permits rather than requiring an irreversible research currency transaction by default. This simplification is not yet a player decision.

### Round 9 — Field evidence, an actual Bench session and chain limits

**Status: answered 2026-10-18.** Varied field accomplishments: **Great**. Bench session with adjustable known conditions: **Great**. Chain limits: **large, finite chains; recast to renew them**.

1. **A rescue Glyph earns its place.** A Glyph that pushes an ally out of danger earns an expedition achievement for preventing a telegraphed hit. Later it moves an ally clear of a current-driven hazard; another time its delayed push moves an ally after a different apprentice has placed them. Different successful uses earn evidence toward a small permanent ink saving, while repeating the same easy rescue adds no more of that evidence. Offensive and setup Glyphs have achievements appropriate to their actions; the player does not need to turn a rescue spell into a damage spell. **Tests:** whether varied field accomplishments are the right form of progression. The exact number required, causal attribution and anti-grind rules remain proposed details, not an invitation to manufacture friendly danger for points.
2. **A Bench session tests a hypothesis.** Choose known components and a learned method, such as holding Push in an ink mark until a hit. The basic rule is inspectable. Run it against a test subject, then add steam and a second subject: observe the mark spreading. Swap ink for wax and compare. The test scene can reuse terrain and enemy behaviours already encountered; an unknown material or unavailable method cannot simply be summoned from the test palette. Invalid combinations explain what cannot be bound rather than returning a score toward a secret recipe. Saving the valid rune is free. **Tests:** whether changing the experiment's circumstances is an appealing part of research, versus using the Bench mainly as a construction form. Exact scene controls should stay lightweight.
3. **Long chains or perpetual machines? Chosen:** allow large chains, but every stored release and replay has a finite number of uses; spreading or transferring an effect does not refresh its duration or spent uses, and a repeat cannot schedule itself again. Future casts can set up new chains. Do not silently truncate a long legal chain after an arbitrary number of visible events. Finite-chain design must specify copying and nested effects consistently rather than relying only on each local trigger being one-use.

### Completion record

Completed 2026-10-18 after ten rounds. §1 contains the complete independent proposal: invention grammar, authored vocabulary, lattice, materials, finite chains, timing, ink, mastery, party, expeditions, districts and the player journey. §0 preserves confirmed decisions and ratings; unasked mechanical choices are labelled proposed defaults. The original design documents remain unchanged. No implementation, prototype or playtest was performed.

### Round 10 — Judge the whole journey

**Status: answered 2026-10-18.** First evening: **Great**. Middle game: **Great**. Late game: **Great**. These ratings endorse the described progression; they do not turn every mechanical default or number in §1 into a separately confirmed decision.

1. **First evening.** Begin with a few prepared spells showing damage, movement and protection. During the first short trip, encounter a rival's stored effect and obtain ink, wax and a binding method. Back home, invent Recoil, compare it in a plain scene and in steam, then write a spell around the result and return to the city. Aim for one personal invention and one useful surprise in the first evening; later methods are still visible mysteries. **Tests:** whether the opening introduces invention soon enough while leaving discoveries ahead.
2. **Middle game.** Choose the foundry to investigate force travelling through brass, or the Notaries to investigate moving existing magic. Either route yields useful inventions with the early collection. Taking the other route later lets the methods combine, while recruits and new terrain reopen older tools. **Tests:** whether choosing which principles to learn gives enough direction and variety without a fixed middle-game recipe ladder.
3. **Late game.** An Afterimage is waiting to Heat a tile next turn. Redraw moves an existing oil film into that footprint, potentially bringing a connected blaze into reach. Elsewhere a rival tries to melt or relocate the party's preparation. The final school changes where existing surfaces are, combining earlier rules rather than adding a bigger damage tier. **Tests:** whether this is a satisfying escalation, and whether the Cartographers' initial portable-surface scope sounds sufficiently powerful and strange.
