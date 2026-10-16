# The City and its Districts

> **Status: Decided** (two design rounds of 2026-10-16, §0: the map and gates, then the canals). Nothing built yet. Plan: [city-and-canals-plan.md](../plans/city-and-canals-plan.md). Feeds [BL-22](../ROADMAP.md) (the map and the gates) and [BL-21](../ROADMAP.md) (the canals).
> Summary and decision log: [DESIGN.md](../../DESIGN.md) §6.7 and §11. The Seam, the first district: DESIGN.md §9.2. Trip rules: DESIGN.md §6.4.
> **Out of scope on purpose:** aspects, recipes, loot tables, solvents and rune content. They wait for a rune-content rework once every core feature exists. Until then a new district reuses the current loot and runes.
> Numbers and conditions are drafts, *tune by playing*.

## 0. Decided in the design round (2026-10-16)

| Question | Decision | Why |
|---|---|---|
| What the door opens on | **The owner's sketch map**: a page torn from the owner's notebook with the Seam in the middle and districts inked around it | The codex is already the owner's notebook. The map grows with it |
| How districts appear | **Only once you hear of them.** Unheard districts are blank paper | The player picked surprise over a full map of `???` from day one |
| How you hear | **The owner draws it in** (a discovery or a torn page makes their hand ink a new district with a cryptic line) and **rumours at home** (a line at the attic window after a trip) | Both, so hearing happens through play and also turns up steadily |
| What opens a district (its gate) | **A key** and **a spell** pull hardest. **A discovery** is the gate for the first few districts and turns up now and then later | A mix of gate types per district, set in data |
| Spell gate | **A threshold room**: one short hand-made board at the district's door, solved with whatever you've wired. It stays open once solved | A puzzle, not a checklist. Any build that can do the thing gets in |
| Key gate | **A tempting loot pick** deep in another district, taken instead of a rune and **lost on a wipe** | It sharpens push or return |
| District flavor | **All four layers**: a material lean, one board rule, a guild that owns it, and its own trip shape | Each district should feel like a place, not a reskin |
| Second district | **The oil-lit canals** | Oil and Spark is the most readable combo, so the board rule shows clearly |
| Canal board rule | **The current**: water lanes carry what floats one tile downstream each round | Burning oil floats into enemies, so you plan a turn ahead |
| Canal trip shape | **Landings only**: you can go home only at a landing | Pushing on sometimes commits you to two fights |
| How the canals open | **Hear, then the lock**: fire running along oil in the Seam makes the owner draw the canals in, then a threshold room (the canal lock) opens them | It teaches the current before you're in |

**Defaults filled in by Claude** (*Proposal*, 2026-10-16, tune by playing):

| Topic | Default | Why |
|---|---|---|
| District states | **Unheard → heard → open → heart cleared.** Open districts stay replayable forever | A plain ladder the map can draw |
| The map with only the Seam | Always shown: the Seam alone in the middle with blank paper around it | The empty paper says there's more |
| Hearing on a wipe | **Kept.** A district you heard of mid-trip stays drawn | Like codex finds, what was learned stays learned |
| Threshold room cost | **Free** and played from the map: full charges, no HP carried, retry as often as you like, doesn't count as a trip | It's a door, not a trip. Failing should only cost a minute |
| Key offers | A key offer shows up only **after its district is heard**, only in its source district's deep loot, and never again once banked | You know what you're tempted by |
| Canals' guild | **The Lamplighters** (placeholder name) | They keep the oil lamps along the water |
| Canals hearing trigger | Fire spreads across **3+ connected oil tiles** in one cast, in the Seam | Happens early, but you have to set it up |
| Canals trip length | **5 rooms**, landings after rooms **1, 3 and 5** (the heart) | Two commitments of two rooms each |

### Canals round (2026-10-16, BL-21)

| Question | Decision | Why |
|---|---|---|
| The canal eel | **A water-bound lurker**: lives only in the lanes, swims fast along them, lunges at the quay beside its lane | You can see where it will be, so you plan around it |
| The Lamplighters' warden | **The Snuffer**: puts out fire around it, and **leaves nothing** (the fire and its oil are gone) | A clear counter to fire builds: kill it first or work around it. The player passed on the walking lamp-post and on steam left behind |
| Other foes | **Lamp-moths** (drawn to fire, burst into flame) and **oil-rats again**, now swimming | A fuse you didn't place, and a familiar face that ties the districts together |
| The heart | **A first boss: the lamp-mother**, a great lantern on the water that calls moths out of the dark and snuffs the fire near her | The player wanted something big, not a harder room |
| Rooms | **Wetter as you go**: one lane by a long quay at first, crossing lanes later, mostly water with islands at the heart | The current grows on you |
| The canal lock | **One lit gate**: get burning oil to the wooden gate on the current. No enemies | It teaches the drift in one board, and several solutions work |

**Defaults filled in by Claude** (*Proposal*, 2026-10-16, tune by playing; full rules in §5.4–§5.6):

| Topic | Default | Why |
|---|---|---|
| How to hurt the lamp-mother | She snuffs fire in her 3×3 at round end, but fire **on her own tile** burns her during your turn first. She floats on water, so the way in is oil floated under her on the current, then lit | The boss tests the district's own rule |
| Her pattern | Every round she calls one moth at a lit lamp; every third round she **flares** and every moth on the board bursts at once | Two telegraphs, one readable rhythm |
| The lock's trick | The gate sits at the downstream end of a lane, behind brass plates, so nothing you cast reaches it directly. Only what floats does | Forces the current without forcing one lattice |
| Bosses in general | One tile, lots of HP, telegraphed like everyone else | No new engine work for multi-tile units |

## 1. The sketch map (BL-22)

The door ("Set out into the city") opens a page torn from the owner's notebook. It replaces the straight-to-the-Seam door.

```
      ~ blank paper ~
         ┌───────────┐
         │  canals ≋ │   heard: smudged, with the owner's line
         │  "a lock  │   and how the way is barred
         │  bars it" │
         └─────┬─────┘
       ┌───────┴───────┐
       │   THE SEAM    │   open: inked properly, tap to set out
       │   ✦ heart     │   ✦ = heart cleared
       └───────────────┘
      ~ blank paper ~
```

- **Unheard:** not drawn. The paper is blank where it will be.
- **Heard:** a smudged sketch with one line: the owner's hint, or the rumour that named it. Below it, how the way is barred, said in the world's terms ("a lock bars the way", "the bridge-wardens want a pass", "the owner wrote: *only those who have seen the black water climb*"). Tap to read it, or to try its threshold room.
- **Open:** inked. Tap to set out (the existing "Set out?" sheet).
- **Heart cleared:** a small mark. The district stays playable.
- The map shows each district's material and guild once it's heard. That tells you what kind of build it favours before you go.

## 2. Hearing of a district

A district is **heard** when one of its hearing conditions is met. Conditions live in data, one or more per district:

- **The owner draws it in.** A discovery (an interaction, a pattern proven, a draft solved) or a torn page found as loot. A short moment back home: the owner's hand inks the district on the map, with their line.
- **A rumour at home.** After a trip that meets a condition (a heart cleared, a number of trips, a district visited), a line at the attic window: a passer-by, a note under the door, a bell from the canal. It names the place, and the district is drawn.

What you hear about mid-trip shows up when you get home, even after a wipe.

## 3. Gates: opening a heard district

Each district has **one gate**, set in data:

| Gate | How it opens | When to use it |
|---|---|---|
| **Discovery** | Hearing it opens it | The first few districts, and now and then later for a quick win |
| **Threshold room** (spell) | Solve one hand-made board at its door | When a district has a mechanic worth teaching (the canal lock teaches the current) |
| **Key** | Bring a key home from a trip | When a district should pull you deep into another one |

### 3.1 Threshold rooms

- One fixed board (no seed). Its goal is not "kill everything" but **a mark to reach**: light the lock gate, put a spark through the bell, ink the warden's seal.
- You play it with your current lattices, full charges, from the map. There are no enemies, or only harmless ones that block or drift.
- Fail and you just retry. Solve it once and the district is open for good. The room gets a codex entry.
- The room teaches the district's board rule. A build that can't solve it yet is a reason to go back to the desk.

### 3.2 Keys

- A key is a loot offer ("the lockkeeper's pass") deep in a named source district, alongside the runes. Taking it costs that pick.
- It's trip loot: **lost on a wipe**, banked when you get home. Once banked, the district is open and the offer never comes back.
- It only shows up once its district is heard. The map's line under the district hints where to look ("the bridge-wardens' pass is carried far down the canal").

## 4. What makes a district a place

Every district is one data entry with these layers:

| Layer | What it is | The Seam (today) | The canals |
|---|---|---|---|
| **Material lean** | More of its material on boards, enemies with its trait | Mixed, all five | **Oil** |
| **Board rule** | One rule only this district has | None (the baseline) | **The current** (§5.1) |
| **Guild** | Who holds it; its wardens and constructs form one faction | None (a borderland) | **The Lamplighters** |
| **Trip shape** | Length, and a twist on push or return | 4 rooms, return after any room | **5 rooms, landings only** (§5.2) |
| **Enemies** | 2–3 types of its own | Oil-rat, brass sentry, ink familiar | Canal eel, Snuffer, lamp-moth, plus swimming oil-rats (§5.4) |
| **Rooms** | 3 hand-placed layouts per depth, named, and a heart | Done | Wetter as you go (§5.5) |
| **Heart** | The last fight | A harder room | **A boss: the lamp-mother** (§5.6) |
| **Uncanny touch** | How the city is wrong there | Streets overlap | **The canal runs uphill** |
| **Hearing + gate** | §2, §3 | Open from the start | Fire along 3+ oil in the Seam → the lock |

## 5. The oil-lit canals (BL-21)

Black water between slick quays, lamps on poles, barges that drift on their own. The Lamplighters keep the lamps lit and don't like strangers. Somewhere the canal climbs a hill it shouldn't.

### 5.1 The current

- Boards have **water lanes**: rows or columns of water tiles, each with a downstream direction (drawn as faint arrows).
- At **round end** (after the enemies act), everything floating moves **one tile downstream**: oil, fire on oil, ink puddles and stains. Units standing in water drift one tile too, if the tile is free. Anything that flows off the board is gone.
- So you lay oil upstream this turn and it arrives under the eel next turn. Burning oil is a slow fireball.
- *Open:* does water conduct Spark? Default **no**: water is only a carrier, and that keeps the matrix small. Does fire on water go out once it leaves the oil? Default **yes**.

### 5.2 Landings

- The Crossroads after a non-landing room shows **Push on** only. "Return home" is greyed out with the reason ("No landing here. The next is after the drowned arcade").
- Landings come after rooms 1, 3 and 5 (the heart). Push on from a landing and you commit to two fights.

### 5.3 How they open

1. **Hear:** fire spreads across 3+ connected oil tiles in one cast, in the Seam. Back home, the owner's hand draws the canals: *"the black water climbs when lit."*
2. **Enter:** the threshold room **the canal lock**. Oil goes in upstream, the current carries it to the lock gate, a spark lights it, and the gate burns open. It's the current in one board.

**The lock board** (draft, the exact board is drawn in the plan):

```
. . ≈ . D .     ≈ = water lane, flowing down
. . ≈ . . .     D S = the party, on the quay
. . ≈ . S .     = = brass plates: nothing cast
= = ≈ = = =         gets through to the gate
. = ≈ = . .     G = the wooden gate, at the lane's end
. = G = . .
```

- No enemies, full charges, free retries. You win when fire touches the gate.
- Plates block every line from the quay, so the gate can be reached only by what floats down the lane. A Bolt aimed straight down the lane is the one leak. The plan closes it (for example, the gate opens only to fire, and the lane tile above it is a sluice that oil passes but casts can't target), and a solver test proves no direct cast opens it.
- Several solutions: oil upstream then spark it as it passes the quay, light it first and let it burn down the lane (fire on oil drifts too), or Splash oil wide so it drifts as a slick.

### 5.4 Enemies (*Proposal* numbers, tune by playing)

| Enemy | Token | HP | Moves | Attack | Traits |
|---|---|---|---|---|---|
| **Canal eel** (vermin) | `e` | 3 | 4, **water tiles only**; it swims, so the current doesn't move it | **Lunge**: 2 to a unit orthogonally beside its tile | Wet: never oil-soaked, and fire can't burn on its tile unless oil floats there. Ink works |
| **Snuffer** (Lamplighter warden) | `n` | 4 | 1 | **Pole**: 1 to an adjacent unit | At round end, puts out every fire in its 3×3. The fire **and its oil** are gone. A waxed coat: not oil-soaked |
| **Lamp-moth** (vermin) | `m` | 1 | 3, flies (over water, ignores the current) | **Burst**, telegraphed on an adjacent member: it dies and leaves fire on its tile (lighting any oil there) and 1 to each unit next to it | Moves toward the nearest fire, else the nearest member. Killed by fire or Spark, it bursts too, so it's a fuse |
| **Oil-rat** (Seam) | `r` | as now | as now; in water it drifts with the current | as now | Its oil trail on water floats away downstream |

### 5.5 Rooms

Five rooms, three named layouts each (the trip seed draws one), as in the Seam.

| Room | Water | Foes | Layout names (*Proposal*) |
|---|---|---|---|
| 1 · landing after | One lane by a long quay | Eel + rats | The towpath, The coal wharf, The lamplit quay |
| 2 | One lane, wider | + moths | The drowned arcade, The eel steps, The lock cottage |
| 3 · landing after | Two lanes crossing, a bridge | + a Snuffer | The sluice, The crossing, The tanners' cut |
| 4 | Two lanes, little quay | All four | The uphill reach, The lamp market, The siphon |
| 5 · heart | Mostly water, islands | The lamp-mother, a Snuffer, moths | The lamp-mother's pool (three variants, same name) |

Room 4's uphill reach is where the canal climbs: its lane flows *up* the screen.

### 5.6 The heart: the lamp-mother

A great lantern floating mid-pool, far bigger than the lamps on the quays. The moths come out of the dark toward her.

- **One tile, 14 HP**, anchored on a water tile. She doesn't move and the current doesn't move her.
- **Every round**, telegraphed: she calls one moth at one of the lit lamps around the pool (the lamp glows the round before).
- **Every third round**, telegraphed: she **flares**, and every moth on the board bursts at once.
- **At round end** she snuffs every fire in her 3×3, like a Snuffer.
- **How to hurt her:** Bolt and Spark work as usual. Fire burns her only **on her own tile**: oil floated under her on the current, then lit in your turn, burns her before she snuffs it. Moths bursting next to her hurt her too, so herding them is a tactic.
- One boss tile with lots of HP, and telegraphed like everyone else. Multi-tile bosses wait until a district needs one.

## 6. Later districts (sketch, not decided)

Each gets its own design round when its turn comes. Where they might sit in the gate mix:

| District | Material | Likely gate | Note |
|---|---|---|---|
| Ink-makers' quarter | Ink | Key from the canals | Triggers-heavy |
| The bathhouses | Steam | Rumour, then a threshold room | Rooms bigger inside |
| Brass bridges | Brass | Key | Bridges to places that aren't there |
| Rooftops | — | Discovery | A quick win now and then |
| A guild archive | — | Threshold room, late | Rival inscribers (BL-30)? |

## 7. Hypotheses to test by playing

- The blank paper pulls you as much as a `???` would.
- A free threshold room feels like a puzzle you're proud of, not a chore at the door.
- A key you might lose makes push or return tense without feeling punishing.
- The current is readable on a phone at 6×8 when you know where things will be next round.
- Landings make the canals feel different from the Seam without making them a slog.
