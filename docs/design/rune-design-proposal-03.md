# The Apprentice's Notebook — Rune System Design Document
*A Unified Spatial & Deterministic System for Lattice Spellcraft*

---

## 1. Thesis

The lattice must be a spatial blueprint, not a damage-stacking pipe: **every rune is a kinetic or structural vector on the board, and every trigger watches the board's history rather than its own cast.** 

This system eliminates the Spark monopoly by turning the board's physical terrain into lethal collision and contract payoffs (Kinetic Crushing, Foreclosure, Steam Quenching, and Brass Resonance). It translates 2D lattice geometry directly into 2D board offsets, while the **Pre-Cast Snapshot Rule** prevents triggers from validating self-applied states, transforming combat from solitary burst sequences into tight, multi-apprentice tactical relays.

---

## 2. Settled Stances on Core Mechanics (Q1–Q9 + Decisions)

1. **Q1 (Scope — Terrain & Materials):** Keep the 5 foundational materials (Ink, Oil, Steam, Spark/Fire, Brass) and district terrain features (currents, chasms, drops). Redesign the runes to act as active spatial verbs rather than passive state stackers.
2. **Q2 (Payoffs — The Interaction Web):** Spark is dethroned as the sole payoff. Six distinct non-Spark payoffs govern the combat loop: Kinetic Crush (sliding into obstructions), Abyssal Drop (shoving off bridges/into canals), Foreclosure (cashing in ink debt to cancel intents), Pressure Pop (thermal quenching of fire/steam), Resonant Stagger (ringing brass networks), and Transposition (spatial swaps).
3. **Q3 (Triggers — Pre-Cast Snapshot Rule):** Triggers evaluate the state of units and tiles *as they existed when the cast began*. A single spell flow cannot validate its own trigger (`Ink → Indebted` fails). Triggers can always be starved by player or enemy displacement prior to cast.
4. **Q4 (Shape — Lattice Geometry on the Board):** Lattice coordinates translate directly to board coordinates relative to the firing vector. `Fork` splits payloads to hit lateral flanking tiles; `Bend` rotates the spell's terminal impact vector 90° across the grid.
5. **Q5 (Bench — Catalytic Rule-Benders):** Bench distillation produces unique operational rule-benders (tethers, phase inversions, siphons) rather than additive sums ("A, then B"). Compression belongs exclusively to Compile and Glyphs.
6. **Q6 (Apprentices — Bodies & Affinities):** Apprentices do not level. Each carries a school affinity (ink cost discount) and a unique basic displacement action (Pull, Shunt, Vault) replacing universal Shove to set up spatial combos.
7. **Q7 (The Migration):** Retain the 5 foundational materials and core delivery, replacing and redistributing the remaining runes across the 7 guild schools to create 28 unique, self-contained atoms.
8. **Q8 (Grammar — The Ninth Aspect):** Introduce **⌖ Axis (Space/Displacement)**, expanding unique unordered aspect pairs from 28 to 36. This gives movement and geometry formal representation while leaving 8 open aspect slots for late-game districts.
9. **Q9 (Rune Count & Distribution):** 28 runes total: 5 Seam basics + 3 to 4 runes per guild school. Every rune fits in one plain sentence, resolves deterministically, and logs clear events.
10. **Bridge Fall Resolution:** Small minions shoved into chasms/currents suffer instant elimination. Elite and Boss enemies suffer 4 flat collision damage and lose their telegraphed action while climbing back onto the grid.
11. **Mobile UI Spatial Visualization:** Lateral Fork branches project clear, glowing ghost silhouettes with split directional arrows on the 7×9 board during lattice hovering, guaranteeing immediate readability on portrait mobile displays.
12. **Enemy Telegraph Integrity:** Enemy telegraphs remain strictly locked and deterministic. If terrain changes under an enemy, its telegraphed target coordinates stay immutable, ensuring combat remains a solvable tactical puzzle.

---

## 3. The 28-Rune Specification

### Scaling & Mechanics Standards
- **Damage/Shield:** Scales linearly (+1 magnitude = +1 damage or +1 shield).
- **Displacement:** Scales linearly (+1 magnitude = +1 tile displaced).
- **Footprint:** Magnitude 1 = Single Tile; Magnitude 2 = Cardinal Cross; Magnitude 3 = 3×3 Area.
- **Charges:** Sources carry 3 to 5 charges per expedition trip, replenished only upon returning home.

| Name | School | Family | Ink | Rule (ONE sentence) | Aspects | Where Found | Rival-Use & Counter |
|---|---|---|---|---|---|---|---|
| **Bolt** | The Seam | Source | 2 | Fires a projectile up to 4 tiles in a cardinal line, dealing 2 damage to the first unit hit. *(5 charges, Mag 2)* | ☍ ◈ | Starter (Seam) | Rival snipes backline; step behind brass plate or ally to body-block. |
| **Ward** | The Seam | Source | 2 | Grants 2 shield to self or an adjacent ally until the start of your next turn. *(4 charges, Mag 2)* | ▣ ☍ | Starter (Seam) | Rival shields priority target; hit with Foreclose to bypass shield or displace. |
| **Spark** | The Seam | Material | 1 | Deals 1 damage, ignites oil, detonates marks, and conducts through brass. | ♨ ϟ | Starter (Seam) | Rival detonates environmental puddles; extinguish oil with steam. |
| **Shunt** | The Seam | Shape | 1 | Pushes the target 1 tile along the flow's current board direction, dealing 1 collision damage if blocked. | ≋ ⌖ | Seam Loot | Rival shoves inscriber into hazard; anchor with Brass plate or Ward. |
| **Bend** | The Seam | Shape | 1 | Diverts the flow 90° clockwise and rotates the spell's terminal board delivery vector 90°. | ☍ ≋ | Starter (Seam) | Rival curves around cover; reposition outside the angled line of fire. |
| **Oil** | Lamplighters | Material | 1 | Coats the target tile in slick oil that ignites from heat and causes shoved units to slide until dry ground. | ≋ ♨ | Canals Archive | Rival creates slide-lanes; burn early or wash away with steam. |
| **Fuse** | Lamplighters | Shape | 1 | Delays all subsequent runes in this flow to resolve at the end of the combat round. | ⟳ ♨ | Canals Boss | Rival sets delayed board wipe; kill caster or displace target before round end. |
| **At Dawn** | Lamplighters | Trigger | 2 | Continues the flow only if the target unit is telegraphing an action for the upcoming round. | ⟳ ☁ | Canals Elite | Rival punishes aggressive telegraphs; stun or shove rival to cancel trigger. |
| **Ink** | Notaries | Material | 1 | Marks the target unit (+1 damage from all subsequent hits) and pools ink on unoccupied ground. | ◈ ≋ | Notaries Archive | Rival marks your frontliner; step into steam cloud to diffuse and cleanse mark. |
| **Foreclose** | Notaries | Material | 2 | Consumes an ink mark on the target to deal 2 direct damage and cancel its telegraphed action. | ◈ ⌖ | Notaries Boss | Rival cancels your apprentice's turn; shove marked ally out of rival's line of sight. |
| **Indebted** | Notaries | Trigger | 2 | Continues the flow only if the target possessed an ink mark before this cast began. | ◈ ⟳ | Notaries Elite | Rival executes your marked units; use basic action to cleanse or swap marked ally. |
| **Seal** | Notaries | Aura | 3 | Whenever an orthogonally adjacent path trigger succeeds, refund 1 charge to that flow's Source. | ◈ ▣ | Notaries Master | Rival sustains infinite spell loops; starve adjacent trigger condition to halt refund. |
| **Steam** | Bathhouses | Material | 1 | Deploys a 3×3 vapor cloud that blocks vision, extinguishes fire, and diffuses ink and charge. | ☁ ▣ | Bathhouses Archive | Rival blocks sightlines; dispel cloud by detonating with Spark or boiling off. |
| **Spill** | Bathhouses | Shape | 1 | Duplicates subsequent flow effects to all unoccupied tiles connected by shared fluid or steam. | ☁ ⌖ | Bathhouses Elite | Rival blankets entire canal lane; break fluid continuity by dropping a brass plate. |
| **Quench** | Bathhouses | Material | 2 | Consumes steam or fire on the target tile to deal 2 damage and push all adjacent units 1 tile outward. | ☁ ♨ | Bathhouses Boss | Rival detonates vapor clouds; pull units away from cloud perimeter before cast. |
| **Muffle** | Bathhouses | Aura | 3 | Path runes adjacent to this aura generate zero threat and grant 1 shield to any ally in their footprint. | ☁ ϟ | Bathhouses Master | Rival casts safely from fog; blind-fire Splash into the cloud to disrupt lattice. |
| **Splash** | Bridges | Source | 2 | Targets a 3×3 footprint within range 3, dealing 1 damage to all units inside. *(3 charges, Mag 1)* | ☍ ☁ | Bridges Archive | Rival blankets party with wide splash; scatter units or construct brass cover. |
| **Brass** | Bridges | Material | 1 | Raises a temporary brass plate that blocks movement, absorbs line spells, and conducts charge. | ▣ ϟ | Bridges Archive | Rival fortifies lane with cover; shatter plate with Kinetic Crush or conduct through it. |
| **Pierce** | Bridges | Shape | 1 | Passes through the first obstacle or unit hit to deliver the flow to the tile directly behind it. | ☍ ϟ | Bridges Elite | Rival shoots through your tank; stagger apprentices diagonally rather than in lines. |
| **On Edge** | Bridges | Trigger | 2 | Continues the flow only if the target is standing adjacent to an open drop, chasm, or water canal. | ▣ ⌖ | Bridges Boss | Rival fishes for instant drop-kills; move away from edges into the board center. |
| **Bulwark** | Bridges | Source | 2 | Shields target ally for 3 and erects a crumbling brass plate in an adjacent empty tile. *(3 charges, Mag 3)* | ▣ ⟳ | Bridges Master | Rival walls off advance; melt plate with heat or vault over using movement skills. |
| **Clang** | Foundry | Source | 2 | Strikes an adjacent tile for 2 kinetic damage, ringing 1 shock damage to all units touching connected brass. *(4 charges, Mag 2)* | ϟ ≋ | Foundry Archive | Rival pulses damage through the whole room; step off brass plates immediately. |
| **Fork** | Foundry | Shape | 1 | Splits the flow: left branch hits 1 tile left of the target; right branch hits 1 tile right. | ⌖ ⟳ | Foundry Elite | Rival targets dual flanks; stand in the central blind spot directly ahead of caster. |
| **Echo** | Foundry | Aura | 3 | Next turn, adjacent Source casts its first payload rune again for free at the start of the round. | ϟ ⟳ | Foundry Boss | Rival primes repeated artillery; shove rival off alignment before next round begins. |
| **On Conduct** | Foundry | Trigger | 2 | Continues the flow only if charge or resonance traveled through the target tile earlier this round. | ϟ ◈ | Foundry Master | Rival chains lightning off brass; disconnect brass network using Shunt. |
| **Transpose** | Cartographers | Shape | 2 | Swaps the board positions of the caster and the targeted unit. | ⌖ ☍ | Cartographers Elite | Rival swaps squishy inscriber into front line; surround the predicted swap tile. |
| **Redraw** | Cartographers | Material | 1 | Clears all terrain, puddles, and plates from target footprint, reverting tiles to plain dry stone. | ⌖ ♨ | Cartographers Archive | Rival erases your setup puddles; stagger setups so payoff lands in the same turn. |
| **Amplify** | Cartographers | Aura | 3 | Increases magnitude of orthogonally adjacent path runes by +1 (or footprint area by 1 ring). | ⌖ ϟ | Cartographers Master | Rival overcharges payload damage; displace inscriber away from their anchor aura. |

---

## 4. The Interaction Web (Non-Spark Payoffs)

Combat revolves around a multi-path kinetic and chemical web:

```
[Oil] --------+---> (Kinetic Slide) + [Shunt] -------> SMASH (Collision Damage)
              |
              +---> (Combustion) + [Spark] ----------> FIRE (Area Denial / Damage)
                                                          |
[Steam] ------+---> (Vapor Diffuse) + [Ink] -----------> CLOUD MARK (Diffuse Debuff)
              |                                           |
              +---> (Pressure Pop) + [Quench] -------> CONCUSSION (Blast + Knockback)
                                                          |
[Ink] --------+---> (Debt Collection) + [Foreclose] -> FORECLOSURE (Intent Cancel)
              |
[Brass] ------+---> (Resonance Ring) + [Clang] ------> STAGGER (Full-Network Shock)
              |
              +---> (Conduction Chain) + [Spark] ----> LETHAL ARC (Multi-Unit Arc)
```

### Detailed Payoff Mechanics
1. **Kinetic Smash (Oil + Shunt + Obstruction):** Shoving a unit onto oil slides it until it meets dry ground or an obstacle. Impacting an obstruction deals **1 base damage + 1 damage per tile slid** to both the moving unit and the obstruction.
2. **Abyssal Drop (Shunt / Transpose + Drop / Canal):** Displacing a unit into a chasm or water current results in:
   - **Minions:** Instant elimination.
   - **Elites / Bosses:** 4 direct damage, action cancelled, and displacement downstream/climbing back.
3. **Foreclosure (Ink Mark + Foreclose):** Consumes the Ink mark established by an earlier action, dealing **2 direct damage** and **cancelling the target's telegraphed action**.
4. **Pressure Pop (Fire + Steam + Quench):** Quenching a tile where fire and steam collide detonates the vapor pocket, dealing **2 damage** to units on the tile and shoving all adjacent units **1 tile outward**.
5. **Resonance Ring (Brass Network + Clang):** Striking brass acoustic plates propagates kinetic shock through all contiguous plates, dealing **1 shock damage and applying Stagger** (-2 move next turn) to all units touching the network.
6. **Diffuse Marking (Steam + Ink + Spill):** Introducing Ink into a steam cloud diffuses across the entire vapor body, marking every occupant without requiring individual line of sight.

---

## 5. Shape & Geometry Engine

Lattice energy pathways map physically to board vectors.

- **Bend:** Rotates the flow 90° clockwise in the lattice and turns the terminal delivery vector 90° clockwise on the board.
- **Fork:** Diverges energy laterally. Branch A executes 1 tile left of the primary impact point; Branch B executes 1 tile right.
- **Mobile Screen Visualization:** Hovering a Fork rune renders glowing ghost silhouettes with split directional arrows on the targeted board coordinates.

### Worked Lattice & Board Alignment

#### Lattice Wiring
```
[ . ]       [ . ]      [Amplify]    [ . ]
[BOLT >] -> [Pierce] -> [Fork] --^-> [Shunt]   (Branch A: Left Flank)
[ . ]       [ . ]         |
                          +------v-> [Ink]     (Branch B: Right Flank)
```

#### Board State (7×9 Grid)
- Caster **(A)** at `(3, 1)` facing North.
- Vanguard **(V)** at `(3, 4)`.
- Flanking Archer **(L)** at `(2, 5)` (Left flank).
- Flanking Shaman **(R)** at `(4, 5)` (Right flank).

```
Y
7 [ . ] [ . ] [ . ] [ . ] [ . ]
6 [ . ] [ . ] [ . ] [ . ] [ . ]
5 [ . ] [ L ] [ . ] [ R ] [ . ]  <- Fork Flanks Land Here!
4 [ . ] [ . ] [ V ] [ . ] [ . ]  <- Pierced by Bolt!
3 [ . ] [ . ] [ . ] [ . ] [ . ]
2 [ . ] [ . ] [ . ] [ . ] [ . ]
1 [ . ] [ . ] [ A ] [ . ] [ . ]
    1     2     3     4     5   X
```

#### Event Sequence
1. `BOLT` fires North along Column 3, striking `V` at `(3, 4)` for **2 damage**.
2. `Pierce` penetrates `V`, carrying the payload vector to `(3, 5)`.
3. `Fork` (amplified by `Amplify`) branches laterally:
   - **Branch A (Left):** Hits `L` at `(2, 5)`. Executes `Shunt` (Mag 2), shoving `L` 2 tiles North to `(2, 7)`.
   - **Branch B (Right):** Hits `R` at `(4, 5)`. Executes `Ink`, applying the Inked mark and pooling ink on the floor.

---

## 6. Triggers & Starvation Mechanics

Under the **Pre-Cast Snapshot Rule**, triggers evaluate the board state recorded at the exact moment the cast button was pressed.

| Trigger | Condition Evaluated | Failure State | Starvation Counter-Play |
|---|---|---|---|
| **Indebted** | Target entered this turn with an active Ink mark. | Target has no Ink mark, or was inked during this cast. | Cleanse mark with Steam, or shove marked unit out of line of fire. |
| **At Dawn** | Target is telegraphing an action for the end of the round. | Target is stunned, intent cancelled, or acting early. | Shove enemy or hit with Foreclose to break its intent prior to trigger. |
| **On Edge** | Target is orthogonally adjacent to a chasm, drop, or canal. | Target is standing safely in interior terrain. | Reposition target into the board interior using basic displacement. |
| **On Conduct** | Target tile or unit was electrified or resonated earlier this turn. | No charge or resonance touched the tile during preceding actions. | Disconnect brass plate network using Shunt before caster acts. |

---

## 7. The Bench (Distillation)

### Bench Mechanics vs. Compile
- **Compile / Glyphs:** Handles syntactic compression (shrinking multi-socket flows into single-socket Glyphs).
- **The Bench:** Catalyzes **New Operational Verbs** (rule-benders, state transformations, tethers) that cannot be constructed via ordinary wiring.

### Semantic Role Blending
Deduction is fair and explainable:
- **Parents** provide the Subject and the Medium (e.g., velocity, structure, charge).
- **Solvents** act as the Operational Catalyst:
  - *Chalk (Reach):* Vector extension.
  - *Gallnut (Mark):* Binding condition / debt.
  - *Pitch (Slick):* Kinetic momentum / friction removal.
  - *Cinder (Heat):* Thermal inversion / state destruction.
  - *Quicksilver (Charge):* Instant transmission / transfer.
  - *Fog Jar (Vapor):* Volumetric suppression / atmospheric change.
  - *Rivet (Hold):* Structural stasis / physical locking.
  - *Wax (Return):* Temporal memory / recurrence.

### Six Unique Distillation Recipes

1. **Tether** *(Rule-Bender: Binds two units; damage and displacement suffered by one are mirrored on the other)*
   - `Indebted` (◈ ⟳) + `Shunt` (≋ ⌖) + **Rivet** (Hold / ▣) → **Tether** (◈ ▣)
2. **Inversion** *(Rule-Bender: Inverts target tile: Fire becomes Steam, Steam becomes Water, Brass becomes Void)*
   - `Redraw` (⌖ ♨) + `Quench` (☁ ♨) + **Cinder** (Heat / ♨) → **Inversion** (⌖ ♨)
3. **Siphon** *(Payoff: Steals 2 shield or 1 charge from target and transfers it to caster)*
   - `Pierce` (☍ ϟ) + `Ward` (▣ ☍) + **Gallnut** (Mark / ◈) → **Siphon** (ϟ ◈)
4. **Vortex** *(Shape: Pulls all units within a 3×3 perimeter 1 tile inward toward the center)*
   - `Splash` (☍ ☁) + `Bend` (☍ ≋) + **Pitch** (Slick / ≋) → **Vortex** (⌖ ≋)
5. **Condense** *(Material: Pressurizes a 3×3 steam cloud into a single deep-water puddle)*
   - `Steam` (☁ ▣) + `Bulwark` (▣ ⟳) + **Fog Jar** (Vapor / ☁) → **Condense** (☁ ▣)
6. **Rebound** *(Shape: Reflects a projectile 180° back toward the caster if it strikes an obstacle)*
   - `Pierce` (☍ ϟ) + `At Dawn` (⟳ ☁) + **Wax** (Return / ⟳) → **Rebound** (☍ ⟳)

---

## 8. Aspects & Grammar System

The grammar features 9 aspects: 8 foundational aspects plus **⌖ Axis (Space/Displacement)**. Total possible pairs = 36. Exactly 28 are utilized, leaving 8 for future expansions.

### Aspect Semantics
- **☍ Reach:** Trajectory, cardinal projection, linear distance.
- **◈ Mark:** Identification, conditional contracts, debts.
- **≋ Slick:** Fluidity, momentum, zero friction, sliding.
- **♨ Heat:** Thermal energy, combustion, dissolution.
- **ϟ Charge:** Electrical conduction, acoustic resonance, shock.
- **☁ Vapor:** Volumetric density, diffusion, visual obstruction.
- **▣ Hold:** Physical obstruction, structural barriers, anchor.
- **⟳ Return:** Temporal delay, fuses, round-end resolution.
- **⌖ Axis:** Spatial coordinates, displacement, lateral flanks.

### The 28 Tagged Runes
- `Bolt {☍, ◈}` | `Ward {▣, ☍}` | `Spark {♨, ϟ}` | `Shunt {≋, ⌖}` | `Bend {☍, ≋}`
- `Oil {≋, ♨}` | `Fuse {⟳, ♨}` | `At Dawn {⟳, ☁}` | `Ink {◈, ≋}` | `Foreclose {◈, ⌖}`
- `Indebted {◈, ⟳}` | `Seal {◈, ▣}` | `Steam {☁, ▣}` | `Spill {☁, ⌖}` | `Quench {☁, ♨}`
- `Muffle {☁, ϟ}` | `Splash {☍, ☁}` | `Brass {▣, ϟ}` | `Pierce {☍, ϟ}` | `On Edge {▣, ⌖}`
- `Bulwark {▣, ⟳}` | `Clang {ϟ, ≋}` | `Fork {⌖, ⟳}` | `Echo {ϟ, ⟳}` | `On Conduct {ϟ, ◈}`
- `Transpose {⌖, ☍}` | `Redraw {⌖, ♨}` | `Amplify {⌖, ϟ}`

---

## 9. Worked Combat Examples

### Example 1: The Kinetic Slide & Smash
- **Lattice:** `[BOLT >] -> [Pierce] -> [Shunt] -> [Shunt]`
- **Board:** Apprentice at `(3, 1)` North; Rat (3 HP) at `(3, 3)`; Oil on `(3, 4)` and `(3, 5)`; Wall at `(3, 6)`.
- **Log:**
  1. `EVENT: CAST_SOURCE | Bolt | Target: Rat at (3, 3) | 2 Damage dealt (HP: 1)`
  2. `EVENT: FLOW_STEP | Pierce penetrates (3, 3)`
  3. `EVENT: FLOW_STEP | Shunt pushes Rat into (3, 4)`
  4. `EVENT: TERRAIN_TRIGGER | Oil initiates slide from (3, 4) to (3, 5)`
  5. `EVENT: FLOW_STEP | Second Shunt adds momentum`
  6. `EVENT: COLLISION | Rat impacts Wall at (3, 6)`
  7. `EVENT: DAMAGE_COLLISION | 1 Base + 2 Slide Tiles = 3 Damage dealt`
  8. `EVENT: UNIT_DEATH | Rat destroyed`

### Example 2: Cross-Apprentice Relay in One Turn
- **Lattices:**
  - Apprentice 1 (Notary): `[BOLT >] -> [Ink] -> [Bend v] -> [Oil]`
  - Apprentice 2 (Bounty): `[BOLT >] -> [Indebted] -> [Foreclose]`
- **Board:** Boss at `(3, 5)` telegraphing line attack; App 1 at `(3, 2)` North; App 2 at `(1, 5)` East.
- **Log:**
  1. `EVENT: CAST_SOURCE | App 1 casts Bolt at Boss | 2 Damage | Inked applied`
  2. `EVENT: FLOW_STEP | Bend v redirects East | Oil placed at (4, 5)`
  3. `EVENT: TURN_HANDOFF | Active Caster: App 2`
  4. `EVENT: CAST_SOURCE | App 2 casts Bolt at Boss | 3 Damage (2 Base + 1 Inked bonus)`
  5. `EVENT: EVAL_TRIGGER | Indebted checks pre-cast snapshot: Boss was Inked before cast! PASS`
  6. `EVENT: EXECUTE_PAYOFF | Foreclose consumes Ink mark | 2 Damage dealt`
  7. `EVENT: CANCEL_INTENT | Boss telegraphed attack stripped from timeline`

### Example 3: Breaking a Rival's Telegraphed Chain
- **Rival Intent:** `[SPLASH >] -> [Steam] -> [Quench]` targeting `(3, 4)` 3×3 zone containing player inscriber.
- **Player Counter-Action:**
  1. Inscriber uses **Vault** basic action to hop West out of the blast footprint to `(2, 3)`.
  2. Inscriber casts `[BOLT >] -> [Shunt]` hitting Rival at `(3, 1)`, pushing Rival South to `(3, 0)`.
- **Log:**
  1. `EVENT: ENEMY_PHASE | Rival attempts Splash at (3, 4)`
  2. `EVENT: RECALCULATE_RANGE | Origin is now (3, 0); target (3, 4) distance = 4 tiles (Max Range: 3)`
  3. `EVENT: CAST_FIZZLE | Target out of range due to displacement`
  4. `EVENT: THREAT_NEUTRALIZED | Rival combo extinguished`

### Example 4: Bell Foundry Brass Resonator
- **Lattice:** `[CLANG >] (Echo adjacent) -> [Brass] -> [Fork] (Branch A: [Shunt] / Branch B: [Shunt])`
- **Board:** Apprentice at `(2, 2)` East; Brass Plate A at `(3, 2)` connected to Plate B at `(3, 3)`. Tick 1 on Plate A; Tick 2 on Plate B.
- **Log:**
  1. `EVENT: CAST_SOURCE | Clang strikes Plate A at (3, 2)`
  2. `EVENT: RESONANCE_PROPAGATION | Shock travels through connected Plates A and B`
  3. `EVENT: DAMAGE_RESONANCE | Tick 1 takes 1 Shock; Tick 2 takes 1 Shock`
  4. `EVENT: FLOW_STEP | Fork executes lateral Shunts on adjacent tiles`
  5. `EVENT: AURA_REGISTER | Echo schedules automated Clang recast at next round dawn`

---

## 10. Guild Idioms

- **The Seam — "The Pioneer's Wedge":** `Source → Pierce → Shunt`
  *"When the alleyway narrows, do not seek around them; drive the wedge straight through the center and let the walls do your work."*
- **The Lamplighters — "The Slow Match":** `Source → Oil → Fuse → Spark`
  *"A fool sets fire to where the enemy is standing; an inscriber lays a fire where the enemy will be forced to retreat at dusk."*
- **The Notaries — "The Final Audit":** `Source → Indebted → Foreclose → Seal`
  *"Let them take their strides, let them raise their blades; their debt was sealed three turns ago, and now we collect the balance."*
- **The Bathhouses — "The Steam Hammer":** `Source → Steam → Quench → Spill`
  *"Mist hides the apprentice, but mist under pressure crushes stone. Quench the vapor and let the shockwave clear the floor."*
- **The Bridge-Wardens — "The Long Drop":** `Source → On Edge → Shunt → Shunt`
  *"The river below does not care how thick their breastplate is. Move them two paces West and let gravity complete the sentence."*
- **The Bell Foundry — "The Carillon":** `Clang → Brass → Echo → On Conduct`
  *"Do not aim at the flesh. Aim at the brass under their boots. Strike the gong once, and let the lattice sing in their bones."*
- **The Cartographers — "The False Border":** `Source → Transpose → Redraw → Shunt`
  *"They thought the street was stone. We redrew the margins, traded places, and left them standing on nothing."*

---

## 11. Systemic Guards Against Degenerate Play

1. **Anti-Perma-Lock:** `Foreclose` completely consumes the Ink mark, and the Pre-Cast Snapshot Rule prevents same-cast re-inking. Bosses gain **Calloused Skin**: after being foreclosed, they cannot receive an Ink mark until the subsequent turn.
2. **Anti-Pinball Depletion:** Sliding a unit over an oil tile depletes the slick layer, turning it into a dry, high-friction stain that halts subsequent slides that round.
3. **Starvation Fallbacks:** If a rival's telegraphed trigger is starved, the rival executes an un-starvable basic action (1 point of raw retaliatory physical strike to the nearest target), ensuring enemies never freeze or become trivial punching bags.

---

## 12. Migration Table

```
[Old 26 Runes]                  [New 28 Runes]
Bolt, Ward, Spark, Ink, Steam -> KEEP directly (standardized magnitude & aspects)
Oil, Brass, Pierce, Echo      -> KEEP directly (re-tuned footprints & aspects)
Bend, Fork, Amplify           -> RETUNE into spatial grid-offset operators
OnInked                       -> RENAME to Indebted (enforces Pre-Cast Snapshot)
OnIgnite, OnKill, Thrift      -> RETIRE (subsumed by On Edge, At Dawn, Seal)
Bench Duplicates (8)          -> RETIRE (Torch, Fog, Mist, Kiln, Brand, Scald,
                                 Smear, Etch purged; actions handled by wiring/Compile)
Quill (Bench Source)          -> MERGE into Bolt + Ink Glyph
9 New Operational Verbs Added -> Shunt, Foreclose, Quench, Clang, Bulwark,
                                 Fuse, Spill, Transpose, Redraw
```

---

## 13. Concrete Implementation Decisions

1. **Bridge Fall Resolution Decided:** Small minions pushed into canals or chasms die instantly. Elites and Bosses take 4 flat collision damage and lose their telegraphed turn as they climb back onto the grid ledge.
2. **Mobile UI Decided:** Fork branches project glowing ghost silhouettes with directional split arrows on the 7×9 board while hovering runes in the lattice.
3. **Telegraph Puzzle Integrity Decided:** Rival telegraphs remain strictly locked and deterministic. If terrain or distance changes under an enemy, its telegraphed target coordinates stay immutable, ensuring combat remains a clear, solvable tactical puzzle.
