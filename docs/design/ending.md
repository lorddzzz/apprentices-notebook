# The ending: the Seam becomes yours

> **Status: Decided** (design round 2026-10-23; not built). Roadmap: BL-126. Plan: [ending-plan.md](../plans/ending-plan.md).
> Summary and decision log: [DESIGN.md](../../DESIGN.md) §6.7 and §11. Story set-up: [district-cartographers.md](district-cartographers.md) §0 ("The ending") and §2, [district-seam.md](district-seam.md) (the sealed door at the bottom of the lower Seam). The tenth apprentice: [party.md](party.md) §2.
> Names are placeholders until BL-40. Numbers are *tune by playing*.

**One-liner:** past the sealed door the owner, worn thin from holding the join, writes one last line and hands you the pen. They step out of the drawing and join the household. From then on the Seam is your page: at a **drawing table** you compose up to three districts of your own from everything you met in the city, and the city plays each one as a fresh, generated trip with a master you beat waiting at its heart.

## 0. Decisions (2026-10-23)

| Question | Decision | Why |
|---|---|---|
| The scene at the door | **A quiet handover.** No fight. The owner writes one last line and hands you the pen; the join holds because you hold it now. Then the credits | Warm and open-ended, as the Cartographers' round set it; the Registrar was the last fight |
| What "the Seam becomes yours" plays like | **A drawing table**: you compose a district from what you collected (a board rule, foes, pieces, a trip shape, a heart) and the city plays it as a seeded trip that differs every time | Turns everything learned into a toy, and keeps the build loop alive after the credits |
| The owner | **Joins the household** as the tenth apprentice (the parked "tenth arrival") | The story's last beat is a person, not a message |
| What drawing costs | **A pen that grows**: every element costs from a drawing budget that grows with the notebook (pages known, footnote levels, hearts cleared) | Mastery gives you more to draw with, like ink for a lattice |
| What a drawn district gives back | **Real trips**: loot, proof and footnote points like any district; a heavier drawing offers richer loot | The notebook keeps growing after the credits |
| The Seam after the ending | **It becomes your page**: the Seam stays as it is, and each district you draw is inked in below it, beside the lower floors | The join holds because you keep drawing |
| The owner on the board | **The one who held the join**: a mender whose networks reach across one empty tile; Seam and Board lean; **Pull** | Plays like what they did for years: holding pieces together |
| The palette | **Only what you've met**: rules from districts you opened, foes you fought, pieces you saw, masters you beat | The drawing is a record of your campaign |
| The heart of a drawn district | **A master you beat**, redrawn in your district's rules | A rematch with a face, chosen by you |
| Rooms | **Generated fresh each trip** from your drawing (the player's pick over remixed authored layouts) | Every trip is new |
| The generator | **Guardrails and a bot test**: boards follow the usual room rules and fair start points, foes start away from you, and a bot must win the room before it's offered; otherwise the seed is redrawn | Fresh, never broken (pillar 2: fair danger) |
| How many drawings | **Up to three pages**, each redrawn at will at home; a redraw changes the next trip, never one in progress | Room to experiment without an endless map |

## 1. Rules (*Proposal* defaults, tune by playing)

### 1.1 The handover

- The door's state follows the Seam plan: hidden until the lowest floor is reached, sealed, then **open** once the Cartographers' heart is cleared. When it is open, the Seam's map node shows **the owner's door** as a free visit, like a threshold room: no trip, no fight, no charges spent.
- The scene is a short sequence of notebook pages in the owner's hand: the join, the years of holding it, the last line written, the pen handed over. The player taps through it; nothing can be lost.
- **Credits** scroll over the notebook: the household's tokens, the districts in the order you opened them, the idioms you named, a few counts from the ledger (trips, casts, the biggest chain). Skippable, replayable from the codex.
- Back in the attic, the owner is on the household bench, and the **drawing table** is on the desk. The map draws a blank page below the Seam with a line in your hand: "*the rest is mine to draw*".

### 1.2 The owner (the tenth apprentice)

| Token | Name | HP / move | Action | Trained / gifted | Habit | Starter page |
|---|---|---|---|---|---|---|
| O | **The owner** (placeholder) | 5 / 3 | **Pull** | Seam / Board | **Mender** (lattice): on their own casts, connected networks (a cloud for Storm, brass for Conduct, oil for Fire, a state for Toll) also join across **one empty tile** between two of their tiles | `Splash → Steam → Spark` |

- They join at the handover: no preconditions, no offer, no door note. Like every apprentice they take a bench seat and never fill a slot by themselves.
- The habit follows party.md §1: it changes one rule, never adds damage, ink or a cast, is shown in the preview and has its own fine print and scenario test. Tile-by-tile networks only (bells ring by tone, so the habit does not touch them).
- HP 5 is the household's lowest: years in the margins. *Tune by playing.*

### 1.3 The drawing table

A screen at the desk, available after the handover. Three page slots; an empty page reads "*a district not yet drawn*". A drawing is:

| Element | Choices | Cost (pen) |
|---|---|---|
| **Name** | The player's own words | free |
| **Board rule** | None, or one rule you played in its district: the current, writs, boil-over, collapse, sympathetic bells, pencil and ink | 0 / 3 |
| **Foes** | 1–3 kinds you have fought (vermin, constructs, guild staff, elites; rivals and bosses only as the heart) | 1 per minion kind, 2 per elite kind |
| **Pieces** | Up to 2 kinds you have seen (lamps, writs, vents, piers, bells, pencil, grates…) | 1 each |
| **Trip shape** | Plain (free return after any room), or one shape you played: landings, terms, rising heat, span choice, a peal, free-then-no-return | 0 / 2 |
| **Length** | 3–6 encounters including the heart | 1 per encounter beyond 3 |
| **Heart** | A master or boss you beat: the Marginalia, the lamp-mother, the Lamplighter, the postmaster, the Bath-Steward, the Chief Warden, the Carillonneur, the Registrar | 2–4 by master |

- **The pen** is the drawing budget, shown like an ink pot: 1 per known rune page, 1 per footnote level reached anywhere in the household, 2 per district heart cleared. A drawing must fit the pen; every page has the whole pen (pages don't share it).
- **Compatibility is visible**: a combination that cannot work (a master whose heart needs water, drawn without the current or lanes) is greyed with the reason, like the Bench. The table never hides why.
- A drawing's **weight** (its total cost) is shown as its depth: heavier drawings play harder and offer richer loot.
- Redraw at home only. A drawing in use by a trip is locked until that trip ends.

### 1.4 Playing a drawn district

- Each drawn page appears on the map **inked in below the Seam**, beside the lower floors, in the player's hand. It is open the moment it is drawn: no hearing, no gate.
- **Rooms are generated fresh each trip** from the trip seed (deterministic, so replays and reloads match). Each room uses the drawing's rule, foes and pieces within the household's room rules: sizes about 5×6 to 7×9, at least four fair start points, foes starting at least two tiles from every start point, no unit on an unreachable tile, pieces placed where they can matter.
- **The bot test**: before a room is offered, a deterministic bot plays it with the trip's party and pages; if it cannot win within the round limit, the generator redraws the room from the next seed, up to a small number of tries, then falls back to a simpler safe board. The player never sees a rejected room.
- **The heart** is the chosen master on a generated board built around what that master needs (the lamp-mother's pool, the keystone, the Great Bell, the registry floor), with the drawing's rule added where it fits. A rival plays by its usual routine; its page is not awarded again.
- **Rewards**: ordinary loot at the drawing's depth (ink, vellum, rune and method pages you lack, the solvents of the districts you drew from); proof, footnote points and witnessed fine print as in any trip fight; a wipe loses the trip's loot as everywhere.
- The **trip shape** works as in its home district (terms block going home, heat rises, spans are chosen, great bells hang in the heart, a point of no return holds).

## 2. Still open

- The owner's real name and face (BL-40) and the handover's exact text (authored with the build).
- Exact pen values, element costs and loot depths, after playtests.
- The generator's guardrails in detail, its round limit and number of retries, and how long the bot test may take on a phone.
- Whether finished drawings can be exported as text, like Lab scenarios (a small follow-up, not part of the decision).
