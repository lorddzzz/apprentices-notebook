# The Apprentice's Notebook --- Rune System Proposal

**Version:** The Board Is the Spell\
**Status:** Proposal for playtesting, grounded in the supplied Rune
Design Brief\
**Design intent:** Make the lattice a spatial program: it chooses
*where* effects happen, while schools introduce distinct verbs rather
than piles of states.

------------------------------------------------------------------------

## 1. Thesis

**The Board Is the Spell:** each path rune transforms the spell's
*current target set*, not merely the same original footprint.\
This attacks **P3** hardest, while new payoffs and board-watching
triggers address P2 and P4.\
Materials remain shared terrain; guilds teach verbs that act on any
terrain.\
The Seam teaches a small, complete grammar; each middle school adds a
self-contained tactical plan.\
The biggest design bet: **Fork splits battlefield targets, and the
flow's path is a sequence of target-set transformations.**

## 2. Stances on Q1--Q9

1.  **Scope --- keep the five materials; redesign runes.** Ink, Oil,
    Steam, Spark/Fire and Brass are already a strong systemic substrate;
    district terrain adds enough new rules.
2.  **Payoffs --- build a web of displacement, fall/crush, state
    consumption, delayed arrival, spread and copying.** Spark remains
    useful, but is no longer the universal final step.
3.  **Triggers --- use both pre-cast board conditions and explicit event
    triggers, but make them different rune verbs.** Board conditions are
    evaluated against a snapshot taken when the trigger is reached;
    event triggers can only react to named events that occur after
    arming.
4.  **Shape --- Fork splits the current target set; Bend routes the
    lattice flow and also shifts the board target one tile in its arrow
    direction.** This creates spatial consequences without making every
    rune hard to read.
5.  **Bench --- Bench creates rule-bending verbs, not compressed
    sequences.** Use aspect-keyed recipe families plus the existing
    resonance trial; Compile remains the compression system.
6.  **Members --- affinity becomes school lean.** A habit should bend
    one readable rule, such as "Fork gives the first branch one extra
    target"; do not give apprentices bespoke rune dictionaries.
7.  **The swap --- keep the five Seam materials and core Source, but
    replace most Shapes, Triggers, Auras and all redundant Bench sums.**
    Preserve familiar nouns where their new rules are distinct.
8.  **Grammar --- keep eight aspects, retag them, and treat schools as a
    separate content/progression label.** Eight aspects already support
    28 unique pairs; schools should not become recipe ingredients
    because school order is partly open.
9.  **Count --- 6 Seam runes plus 3 Timing, 4 Contracts, 4 Areas, 4
    Structure, 3 Resonance and 3 Cartographers = 27.** This is one over
    the soft target because each school needs at least one payoff and
    one setup/condition; Bench discoveries replace rather than inflate
    the core pool.

**Global rules assumed for this proposal** - A Source chooses an initial
target set using its delivery rule. Each path rune transforms the
*current set* and passes the resulting set onward. - Target sets are
ordered deterministically by board reading order (top-to-bottom, then
left-to-right); branches resolve depth-first, left branch first. -
Unless a rune says otherwise, a rune affects each target tile/unit in
the current set and then passes the same set onward. - A board-targeted
rune may affect empty tiles as well as units; event logs record each
tile/unit effect separately. - Magnitude is a rune parameter, not a
hidden random roll. "+1 magnitude" increases damage/shield by one,
footprint radius by one ring, or count/range by one as specified. -
Proposed numbers are initial tuning values, not balance claims. Every
effect resolves immediately and deterministically. - Source charges
refresh at home. A trip's carried HP and charges remain attritional as
in the brief.

## 3. Rune set

### Seam --- the owner's basics

The Seam should teach **mark, ignite, route, split, and react to the
board**. Start with Bolt, Ink, Spark, Bend, Fork and one trigger. Oil,
Steam, Brass and Ward are early loot so the opening notebook is not too
crowded.

  --------------------------------------------------------------------------------------------
  Name         School       Family     Ink Rule (one          Aspects   Where   Rival-use &
                                           sentence)                    found   counter
  ------------ -------- ---------- ------- ------------------ --------- ------- --------------
  **Bolt**     Seam         Source       2 Fires a line up to Reach +   Start   Telegraph a
  *(keep,                                  4 tiles, hitting   Charge            line; break it
  retune)*                                 the first unit for                   with a
                                           2 damage, and its                    blocker,
                                           target set is that                   displacement
                                           unit's tile.                         or Steam.

  **Ink**      Seam       Material       1 Marks every unit   Mark +    Start   Move the
  *(keep)*                                 in the current     Return            threatened
                                           target set for 2                     unit away or
                                           rounds, and marked                   make another
                                           units take +1 from                   effect consume
                                           the next damaging                    the mark
                                           event before the                     first.
                                           mark is consumed.                    

  **Spark**    Seam       Material       1 Deals 1 damage to  Heat +    Start   Block the
  *(keep,                                  each unit in the   Charge            delivery or
  retune)*                                 current set and                      alter the
                                           resolves the                         connected
                                           existing                             material
                                           Spark/Fire,                          network before
                                           Steam-arc,                           it resolves.
                                           Brass-conduction                     
                                           and ink-detonation                   
                                           reactions.                           

  **Bend**     Seam          Shape       1 Turns lattice flow Reach +   Start   The shifted
  *(keep, add                              90° and shifts     Return            destination is
  spatial                                  every current                        telegraphed;
  shift)*                                  board target one                     move away or
                                           tile in the arrow                    occupy a
                                           direction,                           useful blocker
                                           dropping targets                     tile.
                                           that leave the                       
                                           board.                               

  **Fork**     Seam          Shape       1 Splits the current Reach +   Start   Spread units
  *(keep, make                             target set into    Hold              across the
  spatial)*                                two ordered                          split or move
                                           halves, sending                      the high-value
                                           the first half                       target into
                                           down the left                        the less
                                           branch and the                       dangerous
                                           remainder down the                   branch.
                                           right branch.                        

  **When       Seam        Trigger       2 Continue only if   Mark +    Start   Shield the
  Exposed**                                at least one unit  Hold              target or step
  *(new;                                   in the current set                   onto Brass; it
  replaces                                 has no shield and                    tests the
  OnInked as                               is not standing on                   board, not the
  starter                                  Brass.                               cast's own
  trigger)*                                                                     earlier setup.

  **Oil**      Seam       Material       1 Coats the current  Slick +   Early   Leave the oily
  *(keep)*                                 target tiles with  Heat      loot    lane or use
                                           Oil, preserving                      Steam to deny
                                           existing fire,                       ignition.
                                           slide and stain                      
                                           interactions.                        

  **Steam**    Seam       Material       1 Fills the current  Vapor +   Early   Re-route
  *(keep)*                                 target tiles with  Hold      loot    around the
                                           Steam, preserving                    cloud or use
                                           projectile                           it to disrupt
                                           blocking, fire                       the rival's
                                           extinguishing,                       line.
                                           Spark arcs and Ink                   
                                           diffusion.                           

  **Brass**    Seam       Material       1 Raises temporary   Hold +    Early   Shove units
  *(keep)*                                 Brass plates on    Charge    loot    off the
                                           the current target                   planned line
                                           tiles that block                     or exploit the
                                           movement and                         new barrier as
                                           projectiles,                         cover.
                                           conduct Spark, and                   
                                           crumble after 3                      
                                           rounds.                              

  **Ward**     Seam         Source       2 Grants 2 shield to Hold +    Early   Force the
  *(keep,                                  the caster or one  Mark      loot    caster to
  simplify)*                               adjacent ally and                    spend the
                                           sets the target                      action
                                           set to that                          defensively or
                                           protected unit's                     attack from
                                           tile.                                another angle.
  --------------------------------------------------------------------------------------------

### Timing --- Lamplighters (oil-lit canals)

**School verb: defer.** Timing should make a spell arrive later, split
an event across turns, or arm a fuse; it works with Seam basics and
canal currents, but never requires another guild's runes.

  ------------------------------------------------------------------------------------------
  Name             School      Family      Ink Rule (one     Aspects   Where    Rival-use &
                                               sentence)               found    counter
  ---------------- -------- --------- -------- ------------- --------- -------- ------------
  **Fuse** *(new)* Timing     Trigger        2 Arm the       Heat +    Canals   Move off the
                                               current       Return             marked tiles
                                               target tiles                     before the
                                               and repeat                       fuse
                                               the remaining                    resolves.
                                               flow from                        
                                               those tiles                      
                                               at the start                     
                                               of the next                      
                                               party turn if                    
                                               a unit still                     
                                               occupies one.                    

  **Delay**        Timing     Trigger        2 Store the     Vapor +   Canals   Move targets
  *(new)*                                      remaining     Return             or put a
                                               flow as a                        blocker into
                                               visible                          the
                                               one-turn echo                    projected
                                               that resolves                    line before
                                               from the                         the echo.
                                               current                          
                                               target set at                    
                                               the start of                     
                                               the next                         
                                               party turn.                      

  **Slipstream**   Timing       Shape        1 Move each     Slick +   Canals   Leave the
  *(new)*                                      unit in the   Reach              current lane
                                               current set                      or block the
                                               one tile                         downstream
                                               along the                        tile.
                                               district's                       
                                               current                          
                                               direction if                     
                                               that                             
                                               destination                      
                                               is passable,                     
                                               then pass the                    
                                               units' new                       
                                               tiles onward.                    
  ------------------------------------------------------------------------------------------

### Contracts --- Notaries (ink-makers' quarter)

**School verb: condition and collect.** Contracts reward reading the
board and sequencing allies' casts; they are not simply "Ink, then
damage."

  --------------------------------------------------------------------------------------------
  Name           School          Family     Ink Rule (one   Aspects   Where      Rival-use &
                                                sentence)             found      counter
  -------------- ----------- ---------- ------- ----------- --------- ---------- -------------
  **Reap**       Contracts      Trigger       2 Continue    Mark +    Notaries   Avoid
  *(new;                                        from the    Return               consuming
  replaces                                      tile of the                      marks during
  OnKill)*                                      first unit                       the
                                                whose Ink                        telegraphed
                                                mark is                          chain or move
                                                consumed by                      the marked
                                                an event                         unit away.
                                                later in                         
                                                this cast,                       
                                                and stop if                      
                                                no mark is                       
                                                consumed.                        

  **When Ally    Contracts      Trigger       2 Arm the     Hold +    Notaries   Prevent the
  Struck**                                      current     Return               hit, move the
  *(new)*                                       target set                       threatened
                                                and                              ally, or
                                                continue                         interrupt the
                                                from it                          attack
                                                only if an                       source.
                                                ally takes                       
                                                damage                           
                                                before the                       
                                                next party                       
                                                turn.                            

  **Levy**       Contracts     Material       1 Consume one Mark +    Notaries   Keep units
  *(new)*                                       Ink mark    Hold                 unmarked or
                                                from each                        force the
                                                marked unit                      caster to
                                                in the                           spend the
                                                current set                      cast before
                                                to grant                         marks are
                                                the caster                       applied.
                                                1 shield                         
                                                per mark                         
                                                consumed.                        

  **Sentence**   Contracts     Material       1 Push each   Mark +    Notaries   Break
  *(new)*                                       marked unit Reach                line-up,
                                                in the                           remove the
                                                current set                      mark, or
                                                one tile                         stand where
                                                directly                         the forced
                                                away from                        destination
                                                the caster,                      is blocked.
                                                consuming                        
                                                its Ink                          
                                                mark                             
                                                whether or                       
                                                not the                          
                                                push                             
                                                succeeds.                        
  --------------------------------------------------------------------------------------------

### Areas --- Bathhouses

**School verb: fill and spread.** Area runes change the footprint and
adjacency graph, letting Steam, Ink, Oil and even empty floor become
meaningful without requiring another district.

  ----------------------------------------------------------------------------------------------
  Name           School       Family     Ink Rule (one       Aspects   Where found  Rival-use &
                                             sentence)                              counter
  -------------- -------- ---------- ------- --------------- --------- ------------ ------------
  **Seep**       Areas         Shape       1 Expand the      Vapor +   Bathhouses   Break the
  *(new)*                                    current target  Slick                  connected
                                             set to include                         patch or
                                             every                                  remove the
                                             orthogonally                           material
                                             adjacent tile                          that links
                                             that contains                          it.
                                             the same                               
                                             material as any                        
                                             current tile,                          
                                             stopping after                         
                                             one expansion.                         

  **Bloom**      Areas         Shape       1 Expand the      Reach +   Bathhouses   Spread units
  *(new)*                                    current target  Vapor                  out or force
                                             set by one                             the
                                             orthogonal ring                        footprint to
                                             around each                            include
                                             target tile,                           low-value
                                             deduplicating                          tiles.
                                             overlaps in                            
                                             reading order.                         

  **Condense**   Areas      Material       1 Remove Steam    Vapor +   Bathhouses   Avoid
  *(new)*                                    from every      Mark                   clustering
                                             target tile and                        in the cloud
                                             leave one Ink                          or use the
                                             mark on each                           Steam to
                                             unit that was                          block the
                                             in that Steam                          spell before
                                             cloud.                                 it
                                                                                    condenses.

  **Douse**      Areas      Material       1 Remove Fire and Vapor +   Bathhouses   Move allies
  *(new)*                                    Oil from every  Hold                   out of the
                                             target tile and                        advertised
                                             grant 1 shield                         footprint or
                                             to each ally                           use Brass
                                             there.                                 cover to
                                                                                    deny access.
  ----------------------------------------------------------------------------------------------

### Structure --- bridge-wardens

**School verb: brace, displace and make height matter.** The school's
payoff is movement into bad positions, crushing against constructed
barriers, and falls at district drops; none depends on Brass being
present.

  --------------------------------------------------------------------------------------------
  Name          School          Family     Ink Rule (one    Aspects   Where     Rival-use &
                                               sentence)              found     counter
  ------------- ----------- ---------- ------- ------------ --------- --------- --------------
  **Bulwark**   Structure       Source       2 Grants 2     Hold +    Bridges   Break the
  *(new                                        shield to an Reach               adjacent setup
  Source)*                                     adjacent                         with
                                               ally and                         displacement
                                               raises a                         or attack from
                                               temporary                        another lane.
                                               Brass plate                      
                                               on that                          
                                               ally's tile                      
                                               that                             
                                               crumbles                         
                                               after 3                          
                                               rounds.                          

  **Shunt**     Structure     Material       1 Push each    Reach +   Bridges   Keep the
  *(new)*                                      unit in the  Charge              destination
                                               current set                      lane open or
                                               one tile in                      move away from
                                               the lattice                      the push line.
                                               arrow                            
                                               direction,                       
                                               dealing 1                        
                                               damage if it                     
                                               collides                         
                                               with a wall,                     
                                               unit or                          
                                               Brass plate.                     

  **Anchor**    Structure     Material       1 Prevent each Hold +    Bridges   Attack around
  *(new)*                                      unit in the  Return              the anchored
                                               current set                      unit or wait
                                               from being                       until the hold
                                               displaced                        expires.
                                               until the                        
                                               end of the                       
                                               next enemy                       
                                               phase.                           

  **Drop**      Structure      Trigger       2 Continue     Reach +   Bridges   Move away from
  *(new)*                                      only from    Slick               the edge or
                                               units in the                     occupy the
                                               current set                      pull
                                               that are                         destination.
                                               adjacent to                      
                                               a district                       
                                               edge or                          
                                               marked drop,                     
                                               then pull                        
                                               each                             
                                               qualifying                       
                                               unit one                         
                                               tile toward                      
                                               that hazard.                     
  --------------------------------------------------------------------------------------------

### Resonance --- Bell Foundry

**School verb: propagate through connections.** Resonance uses connected
components as a target-selection rule, not merely as a Spark bonus; its
runes are strongest when the player deliberately builds or exploits a
network.

  ---------------------------------------------------------------------------------------------
  Name         School          Family     Ink Rule (one    Aspects    Where     Rival-use &
                                              sentence)               found     counter
  ------------ ----------- ---------- ------- ------------ ---------- --------- ---------------
  **Chime**    Resonance       Source       2 Deals 1      Charge +   Foundry   Break the
  *(new                                       damage to    Vapor                network with
  Source)*                                    every unit                        Steam/terrain
                                              connected to                      placement or
                                              the target                        leave the
                                              tile by a                         connected
                                              continuous                        component.
                                              path of                           
                                              Brass or                          
                                              Steam, and                        
                                              sets that                         
                                              connected                         
                                              component as                      
                                              the target                        
                                              set.                              

  **Coil**     Resonance         Aura       3 Adjacent     Charge +   Foundry   Re-route the
  *(new Aura)*                                path runes   Return               path away from
                                              that target                       the aura or
                                              connected                         break the
                                              materials                         connected
                                              follow that                       material chain.
                                              material's                        
                                              connected                         
                                              component                         
                                              one                               
                                              additional                        
                                              hop before                        
                                              resolving.                        

  **Rattle**   Resonance     Material       1 Deal 1       Charge +   Foundry   Avoid Brass
  *(new)*                                     damage to    Hold                 adjacency or
                                              each unit                         use the plate
                                              adjacent to                       as cover from a
                                              a Brass                           different
                                              plate in the                      angle.
                                              current set                       
                                              and cool any                      
                                              Hot Brass                         
                                              tile hit by                       
                                              the effect.                       
  ---------------------------------------------------------------------------------------------

### Cartographers --- Cartographers' Hall

**School verb: edit the board.** These are late-game rule-breakers that
alter positions and terrain itself, but each remains deterministic and
telegraphed.

  ----------------------------------------------------------------------------------------------------------
  Name           School              Family    Ink Rule (one       Aspects    Where found      Rival-use &
                                                   sentence)                                   counter
  -------------- --------------- ---------- ------ --------------- ---------- ---------------- -------------
  **Exchange**   Cartographers     Material      1 Swap the        Return +   Cartographers'   Separate the
  *(new)*                                          positions of    Reach      Hall             intended pair
                                                   the first two                               or move one
                                                   units in the                                unit out of
                                                   current target                              the
                                                   set, doing                                  footprint.
                                                   nothing if                                  
                                                   fewer than two                              
                                                   units are                                   
                                                   targeted.                                   

  **Redraw**     Cartographers        Shape      1 Shift every     Return +   Cartographers'   Occupy the
  *(new)*                                          empty target    Vapor      Hall             destination
                                                   tile one tile                               or leave the
                                                   in the lattice                              threatened
                                                   arrow direction                             tiles before
                                                   and move any                                the cast.
                                                   unit on a                                   
                                                   shifted tile                                
                                                   only if the                                 
                                                   destination is                              
                                                   empty and                                   
                                                   passable.                                   

  **Erase**      Cartographers     Material      1 Remove one      Return +   Cartographers'   Force the
  *(new)*                                          non-permanent   Hold       Hall             spell to
                                                   terrain feature                             target
                                                   from each                                   permanent
                                                   target tile,                                terrain or
                                                   prioritising                                make the
                                                   Fire, then Oil,                             removable
                                                   Steam, Ink, and                             feature
                                                   temporary Brass                             expendable.
                                                   in that order.                              
  ----------------------------------------------------------------------------------------------------------

### Magnitude and delivery

-   **Sources:** Bolt is 2 damage, range 4, 5 charges; Ward is 2 shield,
    3 charges; Bulwark is 2 shield, 3 charges; Chime is 1 damage, 3
    charges. Tune charges and range in playtests.
-   **Footprints:** Bloom expands by one orthogonal ring; Seep expands
    by one connected-material hop; these are not the old "magnitude =
    3×3/5×5" footprint rule.
-   **Damage and shield:** Amplification should be a Bench unlock, not a
    universal early Aura; where introduced, +1 means +1 damage or shield
    and never silently increases a target set.
-   **Sources should set the initial target set; all subsequent path
    runes operate on the current set.** This is the central semantic
    change needed to make the lattice spatial.

## 4. Interaction web

The payoff web should reward different setups and avoid "apply state,
then Spark" as the default idiom.

  -----------------------------------------------------------------------
  Setup / board state     Payoff                  What it buys
  ----------------------- ----------------------- -----------------------
  Ink mark on a unit      **Sentence**            Displacement; can break
                                                  enemy telegraphs or
                                                  shove into hazards.

  Ink mark consumed by    **Reap**                A second launch point
  any later event                                 for the rest of a cast.

  Enemy in a narrow lane  **Shunt**               Collision damage or
                                                  forced repositioning
                                                  without Spark.

  Enemy adjacent to a     **Drop**                Hazard displacement;
  drop                                            potentially a fall
                                                  payoff in bridge
                                                  districts.

  Brass/Steam connected   **Chime**               Multi-target damage
  component                                       through network
                                                  topology.

  Connected Oil or Steam  **Seep → Douse /        Spread utility or
  patch                   Spark**                 ignite at multiple
                                                  tiles; Douse converts a
                                                  dangerous area into
                                                  ally protection.

  Unit standing on a      **Slipstream**          Forced movement changes
  canal current                                   attack alignment and
                                                  can carry a setup to
                                                  another caster's
                                                  target.

  Enemy group occupying   **Bloom → Sentence /    Geometry creates
  an area                 Shunt**                 multiple displacement
                                                  targets, not just a
                                                  larger damage
                                                  footprint.

  Fire/Oil under an ally  **Douse**               Consumes dangerous
                                                  terrain for a defensive
                                                  payoff.

  Two units in one target **Exchange**            Swap to break a
  set                                             telegraph, rescue an
                                                  ally or put an enemy
                                                  into a hazard.

  A Brass plate beside    **Rattle**              Positional damage; the
  enemies                                         plate itself becomes a
                                                  tactical asset.

  Enemy on a marked tile  **Fuse / Delay**        Deferred pressure that
  next turn                                       can be dodged, baited
                                                  or interrupted.
  -----------------------------------------------------------------------

**At least six non-Spark payoff verbs:** push/collision (Shunt), hazard
pull/fall (Drop), mark-to-displacement (Sentence), mark-to-shield
(Levy), delayed repeat (Fuse/Delay), terrain removal into protection
(Douse/Erase), unit swap (Exchange), and network damage (Chime/Rattle).

## 5. Shape & geometry

### Rules

-   **Bend:** keeps the lattice path turning; additionally shifts the
    current board target set one tile in the arrow direction, so a bend
    is both a wiring choice and a targeting decision.
-   **Fork:** splits the current target set into two ordered halves; it
    no longer merely changes resolution order. Empty halves stop without
    effect.
-   **Aura:** the starter set has no Aura. Auras remain off-path and
    modify adjacent path runes; the first new Aura is Coil, which
    extends connected-material targeting by one hop. This makes aura
    placement change network reach rather than simply add magnitude.
-   **Board target sets:** are visible in the cast preview after each
    rune, including tiles that become empty; all movement destinations
    and delayed effects are telegraphed.

### Worked lattice: route a mark into displacement

``` text
[Ink]   .       .
  .   [Bolt>] [Fork]
  .     .     [Sentence>]
```

Read from Bolt to the right: Bolt hits the first enemy in its line; Fork
splits the current target set into two branches; the left branch stops
at an empty socket, while the right branch routes to Sentence. In this
compact example, Fork alone cannot create a second target from one
target, so the useful board pattern is to place Bloom or a Source with
multiple targets before Fork.

A more representative spatial version:

``` text
[Bloom]   .        .
   .    [Splash>] [Fork]
   .      .       [Bendv]
   .      .       [Shunt>]
```

Initial board: three enemies occupy the Splash footprint, one beside a
Brass plate. Splash targets those units; Fork sends the first half
through the left branch and the remainder down the right branch; Bend
shifts the right branch's targets down one tile; Shunt pushes those
units to the right, damaging any that collide. The lattice's branch
placement changes *which enemies* are displaced and in which direction.

**Source footprint note:** To make this work consistently, add a retuned
**Sweep** Source as an optional early replacement for Splash if testing
shows Bolt's single target set makes Fork too situational: Sweep targets
the three tiles in a straight line and deals no damage itself, with 4
charges. Do not add it to the initial core set until the 27-rune budget
is playtested.

## 6. Triggers

All triggers are starvable by board changes or by interrupting their
qualifying event. Trigger checks are deliberately not "confirm what my
previous rune just did" unless the trigger explicitly listens for a
future event.

  -----------------------------------------------------------------------
  Trigger          Check timing     What makes it    How a rival/ally can
                                    fail             starve it
  ---------------- ---------------- ---------------- --------------------
  **When Exposed** Snapshot when    Every target is  Ally grants shield;
                   reached          shielded or on   unit steps onto
                                    Brass            Brass; unit leaves
                                                     the target set.

  **Fuse**         Arms now; checks No unit remains  Move the unit away,
                   at next party    on an armed tile shove it, or occupy
                   turn                              the tile with a
                                                     blocker if legal.

  **Delay**        Always repeats   No valid target  Move the target, put
                   next party turn  remains or the   Steam/Brass into the
                   from saved       saved path is    line, or force a new
                   target set,      blocked          board state.
                   unless blocked                    
                   by a changed                      
                   route                             

  **Reap**         Listens only     No Ink mark is   Remove the mark
                   after it is      consumed later   before the caster
                   reached          in this cast     reaches Reap; avoid
                                                     damaging/consuming
                                                     that marked unit
                                                     until after the
                                                     chain.

  **When Ally      Arms now;        No ally takes    Evade, shield, shove
  Struck**         listens until    damage during    the attacker, or
                   next party turn  the window       break its line.

  **Drop**         Snapshot when    No target is     Pull/shove the unit
                   reached          adjacent to a    away first or occupy
                                    drop/edge, or    the destination.
                                    destination is   
                                    blocked          
  -----------------------------------------------------------------------

**Same-cast trigger rule:** triggers do not inspect arbitrary earlier
effects as a generic "current state." A snapshot trigger checks the
board when reached; an event trigger listens for named events only after
arming; a delayed trigger stores a visible future instruction. This
removes the automatic `Ink → OnInked` pass-through while still allowing
deliberately constructed chains such as `Ink → Reap → Spark` when Spark
consumes the mark *after* Reap has armed.

## 7. Bench

### Philosophy

The Bench should discover **new verbs**, not combine two existing
effects into one rune. A recipe's parents explain the *family of
problem* the result addresses; the solvent determines the specific
transformation. Keep the 3×3 real-reaction trial and total resonance
score, but add a one-line "the result seems to..." margin clue after the
first trial.

**Fair deduction rule (proposal):** 1. Keep eight aspects and the
solvent-as-result-aspect rule. 2. Each parent shares at least one aspect
with the result, but that overlap means "the ingredients are
conceptually relevant," not "their effects are summed." 3. Recipe
families are grouped by solvent aspect and result family; silhouettes
reveal family, two result aspects, ink cost and parent families as in
the brief. 4. A trial score remains out of six, but a correct solvent
with two plausible parents should receive a qualitative margin clue
("the solvent fits; the parents do not explain the verb") rather than a
hidden per-slot score. 5. Keep unordered parent-pair + solvent unique;
no two recipes collide. 6. Tier-2 aspect-keyed wildcard recipes unlock
only after the player has crystallised a Glyph, so they expand the
grammar after the basic deduction loop is learned.

### Example recipes

These are example recipe *families*; the parents are thematic hints, not
component effects.

  -----------------------------------------------------------------------
  Recipe                  New verb                Why it is not a sum
  ----------------------- ----------------------- -----------------------
  **Bolt + Ward + Chalk → Trigger: the next       Creates a counter-rule
  Parry**                 projectile crossing the neither parent
                          target tile is          performs.
                          redirected to its       
                          caster.                 

  **Ink + Brass + Rivet → Material: prevent the   Changes reaction
  Seal**                  next terrain reaction   permissions rather than
                          on the target tile      adding Ink and Brass.
                          until the end of the    
                          next enemy phase.       

  **Spark + Steam + Fog   Material: stores one    Introduces storage and
  jar → Thunderhead**     Spark event in a Steam  deferred release.
                          cloud and releases it   
                          at the start of the     
                          next party turn.        

  **Oil + Bolt + Wax →    Shape: after the        Introduces conditional
  Ricochet**              current set hits Brass, redirection.
                          redirect the rest of    
                          the flow toward the     
                          nearest unit in reading 
                          order.                  

  **Ink + Steam + Gallnut Trigger: continue only  Adds a board-count
  → Witness**             if at least two enemy   condition.
                          units are in the        
                          current connected Steam 
                          cloud.                  

  **Brass + Fork +        Shape: copy the current Creates a new spatial
  Quicksilver → Relay**   target set to the       copy/relay verb.
                          farthest connected      
                          Brass tile, then        
                          continue the right      
                          branch from there.      

  **Oil + Steam + Pitch → Material: remove Oil    Repositions terrain
  Siphon**                from target tiles and   instead of layering
                          move each removed Oil   states.
                          tile one step along the 
                          current direction.      

  **Ink + Ward + Wax →    Aura: adjacent path     Alters trigger
  Covenant**              triggers can also       timing/range rather
                          listen for ally events  than combining shield
                          during the next enemy   and mark.
                          phase.                  
  -----------------------------------------------------------------------

**Important grammar caveat:** these recipes are not yet a fully
validated 28-pair assignment; before implementation, allocate the
eight-aspect pairs across every core and Bench rune and reject
duplicates. The examples demonstrate the intended *deduction contract*,
not a claim that every pair is already collision-free.

**Compile relationship:** Compile still compresses proven wiring
patterns and parameterised holes; Bench makes new atoms that change what
wiring can express. Bench must never be the best way to save a socket or
ink compared with a Glyph.

## 8. Aspects / grammar

Keep the eight aspects, retagging them to match the broader verbs:

  Aspect       Meaning in the new grammar
  ------------ --------------------------------------------------------
  **Reach**    Target selection, displacement, spatial relation
  **Mark**     Identity, eligibility, persistent claims
  **Slick**    Motion, flow, surface propagation
  **Heat**     Damage, ignition, delayed combustion
  **Charge**   Energy, conduction, connected systems
  **Vapor**    Clouds, diffusion, delayed or distributed effects
  **Hold**     Protection, barriers, anchoring, suppression
  **Return**   Repetition, consumption, triggers, deferred resolution

Schools remain a separate tag, not an aspect. This lets the player
discover cross-school combinations and preserves the "middle districts
in any order" constraint.

**Pair audit required before shipping:** there are 28 possible pairs,
but the 27 core runes plus Bench discoveries can exceed that space
quickly. Therefore keep the two-aspect display for all runes, but amend
the uniqueness rule for Bench: **core runes must have unique pairs;
Bench results may reuse a pair only if their recipe tier and family
differ and the result is explicitly shown as a variant in the
silhouette.** This is a deliberate change to the original rule, because
a permanently unique pair cannot support open-ended new-verb discoveries
without exhausting the grammar. If strict uniqueness is non-negotiable,
use a ninth aspect and audit all pairs before launch.

## 9. Worked examples

### Example A --- Seam basics: ignite a prepared lane

Lattice:

``` text
[Bolt>] [Oil] [Spark]
```

Board: an Oil Rat stands on an oil tile, with another oil tile directly
behind it and no Steam in the connected patch.

Events: Bolt targets the rat; Oil coats the target tile and the adjacent
connected oil only if its current target set includes those tiles; Spark
hits the rat, detonates any Ink mark if present, and ignites the Oil
tiles reached by the spell. Fire spreads through connected Oil and
damages the rat, with the oil-soaked bonus. The important constraint is
that Oil does not magically widen the target set: add Seep/Bloom if the
player wants a broader ignition.

### Example B --- Contracts: mark becomes displacement

Lattice:

``` text
[Bolt>] [Ink] [Sentence>]
```

Board: a 3-HP sentry is in Bolt's line, and a Brass plate sits directly
behind it; the caster stands to its left.

Events: Bolt hits the sentry; Ink marks it; Sentence consumes the mark
and pushes the sentry away from the caster. If the Brass plate blocks
the destination, Sentence deals 1 collision damage. The chain works
because Sentence is a payoff for an existing mark, not a generic damage
amplifier.

### Example C --- Cross-apprentice combo in one turn

Apprentice A lattice:

``` text
[Bolt>] [Ink]
```

Apprentice B lattice:

``` text
[Ward>] [Sentence>]
```

Board: an enemy stands one tile from a ledge; A acts before B; the enemy
survives A's 2 damage.

Events: A's Bolt hits and Ink marks the enemy; B's Ward is not the right
Source for Sentence in the current implementation, so this example
exposes a delivery gap rather than a valid combo. **Recommended
correction for the playtest build:** Sentence should be usable after any
Source with a target set, and Ward should not overwrite that set when
used as a path rune. Since Sources start flows, make a dedicated
low-cost **Lash** Source available as an early Bench result or replace
Ward's Source role with a normal defensive action. With Lash targeting
the enemy, B's Sentence consumes the mark and pushes the enemy over the
ledge. This is the desired party-feed behavior, but the Source/follow-on
semantics must be resolved before the example is treated as final.

### Example D --- Timing: visible fuse, fair counterplay

Lattice:

``` text
[Bolt>] [Oil] [Fuse]
```

Board: an Oil Rat occupies a tile on the canal current; its next move is
telegraphed away from the tile.

Events: Bolt targets the rat; Oil coats the tile; Fuse arms the tile and
displays a one-turn marker. The rat moves away during the enemy phase,
so the fuse fails next party turn and logs "Fuse fizzles: no unit
remains on the marked tile." If the player first blocks the rat's exit,
the delayed continuation becomes reliable.

### Example E --- Rival telegraph and counter

Rival lattice:

``` text
[Chime>] [Coil]
```

Board: the rival's preview highlights a connected Brass network
containing an ally and two party members; Coil extends the network reach
by one hop.

Counter: before the rival acts, move one threatened party member off the
connected component and place Steam between two Brass segments if the
board rules allow the connection to be interrupted. On resolution, Chime
damages only the units still in the connected target set; the log
identifies the broken link and omitted targets. This is readable,
deterministic counterplay rather than a surprise proc.

### Example F --- Cartographers: rescue by exchange

Lattice:

``` text
[Bolt>] [Exchange]
```

Board: the current target set contains two units, an ally on a burning
tile and an enemy on safe ground.

Events: Exchange swaps the first two targeted units in reading order;
the ally leaves the Fire tile and the enemy occupies it. If the Source
only targets one unit, Exchange does nothing, so this is a candidate for
a multi-target Source or a Bench Source that selects a small area. This
example demonstrates why target-set semantics and source delivery must
be designed together.

## 10. Idioms

  -----------------------------------------------------------------------
  School            Idiom             Shape / verb      Notebook fragment
  ----------------- ----------------- ----------------- -----------------
  Seam              **The First       Source → Ink →    "A mark is not a
                    Sentence**        Sentence          wound; it is
                                                        permission to
                                                        choose the wound
                                                        later."

  Seam              **Borrowed        Oil → Spark       "Fire is the
                    Flame**                             simplest answer,
                                                        which is why the
                                                        guilds keep
                                                        asking better
                                                        questions."

  Timing            **Missed          Source → Fuse →   "A threat that
                    Appointment**     delayed           arrives on time
                                      continuation      is only a threat;
                                                        a threat that
                                                        waits is a plan."

  Timing            **Undertow**      Source →          "The canal has
                                      Slipstream →      already chosen
                                      Shunt             where your enemy
                                                        will stand."

  Contracts         **Debt            Source → Ink →    "The debt is
                    Collector**       Reap → Sentence   collected at the
                                                        moment someone
                                                        tries to erase
                                                        it."

  Contracts         **Witness List**  Source → Witness  "A condition is a
                                      (Bench) → payoff  witness; the
                                                        board is the
                                                        testimony."

  Areas             **Bathhouse       Source → Bloom →  "Fill a room with
                    Bloom**           Condense          weather, then ask
                                                        what the weather
                                                        remembers."

  Areas             **Clean Room**    Source → Seep →   "A spreading
                                      Douse             problem can be
                                                        solved by
                                                        spreading its
                                                        opposite."

  Structure         **Bridge Tax**    Source → Ink →    "The bridge is
                                      Sentence/Shunt    not the weapon;
                                      toward drop       the destination
                                                        is."

  Structure         **Last Brace**    Bulwark → Anchor  "A wall buys a
                                                        turn; a brace
                                                        buys a decision."

  Resonance         **Static Cling**  Chime → Coil →    "A connection is
                                      Spark             a road that
                                                        cannot be seen
                                                        until something
                                                        travels it."

  Resonance         **Chain Gang**    Source → Fork →   "One bell rings;
                                      network payoff    the rest of the
                                                        foundry answers."

  Cartographers     **The Exchange    multi-target      "Every rescue
                    Rate**            Source → Exchange changes the map
                                                        of who is in
                                                        danger."

  Cartographers     **Blank Street**  Source → Redraw → "The city is a
                                      Erase             draft; its
                                                        citizens are the
                                                        corrections."
  -----------------------------------------------------------------------

## 11. Risks & degenerate combos

1.  **"All roads lead to Spark" returns.** Spark remains highly flexible
    because it interacts with four terrain states; guard by keeping
    Spark's base damage low and ensuring Sentence, Shunt, Reap, Chime,
    Exchange and Douse produce wins without Spark.
2.  **Area expansion becomes mandatory.** If Bloom/Seep improve every
    Source too efficiently, the optimal flow is always Source → area →
    payoff; cap each expansion at one hop per rune and deduplicate
    target tiles.
3.  **Fork is useless on one target.** This is intentional for simple
    Sources, but the set needs at least one early multi-target Source;
    test a three-tile Sweep Source before increasing Fork's power.
4.  **Displacement kills dominate.** Falls and collision damage can
    bypass HP tuning; give enemies clear "braced" or "too heavy" traits
    only where telegraphed, and make the destination visible.
5.  **Delayed effects feel weak because enemies move.** This is
    counterplay, not failure, but fuse effects should threaten zones or
    block routes rather than merely chase one unit.
6.  **Chime/Coil clears whole encounters.** Limit Chime to 1 damage and
    require a continuous connected component; Coil adds one hop only and
    does not chain recursively.
7.  **Target-set rules become hard to predict.** Show each rune's
    before/after target set in the preview and log every add, remove,
    shift and fizzle event.
8.  **Bench examples exceed the aspect budget.** Run an automated pair
    audit before adding content; if unique pairs are mandatory,
    introduce a ninth aspect rather than quietly duplicating pairs.
9.  **Sources and path runes conflict.** Ward and Bulwark are defensive
    Sources while the brief says the party action casts a Source;
    clarify whether a Source can be a path rune before implementation.
    Default: Sources start a cast and cannot appear mid-flow.
10. **Bench recipe rules are too permissive.** Keep recipes
    deterministic and tiered; do not add arbitrary exceptions to make a
    favorite rune fit.

## 12. Migration sketch

-   **Keep/retune:** Bolt, Ink, Oil, Spark, Steam, Brass, Ward, Bend,
    Fork; change Bolt to a 4-tile line and Ink to a 2-round,
    one-consumption mark.
-   **Replace:** OnInked → When Exposed; OnKill → Reap; OnIgnite → Fuse
    or a later Heat trigger; Amplify/Echo/Thrift retire from the core
    pool.
-   **Retire/convert Bench sums:** Torch, Fog, Mist, Quill, Kiln, Brand,
    Scald, Smear and Etch become recipe clues or legacy folio
    components, not standalone runes.
-   **Preserve terrain rules:** oil fire, Steam
    blocking/extinguishing/arcing/diffusion, Brass conduction/heating,
    Ink stains, and canal currents remain.
-   **Port Glyphs by intent:** preserve their shape and named idiom,
    then replace retired cells with the nearest verb; mark any changed
    outcome as a folio revision rather than pretending it is identical.
-   **Retest every folio:** trigger snapshot semantics and target-set
    transformations change puzzle solutions.
-   **Enemy migration:** retain enemy identities and telegraphs; give
    each guild one school verb and one short signature chain.
-   **Loot migration:** Seam basics are common; each school's runes and
    solvent drop in its district; Bench unlocks are discoveries, not
    compression rewards.

## 13. Next round of questions for the player

These are the three choices most likely to change the entire design;
numbers can wait for playtests.

1.  **What should the lattice's geometry mean?**\
    **Recommended: spatial target-set transformations** --- a Fork
    divides targets, a Bend shifts targets, and area runes expand them;
    this most directly fixes P3.\
    Alternative: keep board targeting on Sources and let the lattice
    only change order/conditions, for a more code-like but less spatial
    game.

2.  **What should the Bench feel like?**\
    **Recommended: discover new verbs from aspect clues** --- parents
    hint at the problem-space and solvent chooses the transformation;
    this gives the Bench its own identity beside Compile.\
    Alternative: retain the stricter "parents explain the result"
    grammar and accept that most recipes will be variants of existing
    effects.

3.  **How dangerous should displacement be?**\
    **Recommended: falls and collisions are high-value but telegraphed
    payoffs** --- they reward positioning and enemy counterplay, but
    should not replace ordinary damage everywhere.\
    Alternative: displacement mostly repositions and interrupts, with
    instant falls rare or reserved for bosses and explicit puzzle rooms.

------------------------------------------------------------------------

**Single biggest bet:** the lattice should transform a visible set of
board targets step by step; if that feels intuitive in play, it solves
the sameness of the current set, and if it does not, adding more rune
content will not solve the underlying problem.
