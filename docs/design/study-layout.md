# The Study layout (room for the page)

> **Status: Exploring** (direction chosen 2026-11-23; unbuilt). Summary: [DESIGN.md](../../DESIGN.md) §11 (2026-11-23). Sketches: the *Home-screen-redesign* whiteboard. Roadmap: BL-134. Supersedes the screen layout in DESIGN.md §9.3 (v0 study screen); the sense of place stays, at a smaller size.

## Problem

At 375×812 the lattice gets about 15% of the screen: fewer than three rows at the 60 px editing pitch. The rest goes to the scene header (≈12%), the household seat cards *and* the page bookmarks (the same people shown twice), a row of its own for Fit / Edit scale, the shelf (≈20%) and the door (≈8%). The household grows to three seats, which makes this worse.

## 0. Decisions

| Question | Decision | Why |
|---|---|---|
| Which direction | **A, the full-page notebook** (player, 2026-11-23), over a desk-first screen with a separate full-screen editor, a side-rail shelf, or a picker on the page | The same parts on one screen, with their height given back to the page |
| The household bench's name | **Rename the household bench to "At home"** (Claude's proposal, player agreed). The research Bench keeps its name | "Bench" meant two different things on one screen |
| Where ink shows | **On the page**, as a floating pot (Claude's proposal, player agreed), even though the allowance is one household number | You watch it go down while wiring |

## 1. Layout (*Proposal*: tune by playing at 375×812)

Top to bottom:

1. **Title bar:** "The Study" with a thin strip of the scene (window, lamp), and icons for the research Bench, the footnote Desk, the Codex and the menu. Bench and Desk show only once unlocked.
2. **Seat tabs:** the three trip seats are the page tabs (token, name, HP · move); the open one joins the page like a bookmark. This merges today's seat cards and bookmarks. A small **"+N"** button at the end opens the household sheet. Opening the page of someone at home adds a fourth, dashed tab until you switch away.
3. **The page** (≈52% of the height): ink pot top left; Fair copy and Fit top right, floating on the paper. No separate controls row.
4. **The strip:** the focused spell in words (Spell 1 of N), or the rune in hand with its cost and headline, as today.
5. **The rune drawer:** at rest, one row that scrolls sideways through Erase and every role; tabs for Runes, Inventions and Glyphs. Swipe up (or tap ▲) for the whole shelf by role; picking a rune drops it back to one row with the rune in hand. The door hides while the drawer is up. Fair copy uses the same drawer for its panel.
6. **The door:** "Out into the city", with its blocker caption.

**Household sheet** (from "+N", or by holding a seat tab): the three seats as portrait cards, then everyone **At home**. Tap a card for lean, action, habit and *Open page*; tap or drag onto a seat to bring someone; drag a seat down to send them home. Locked while a trip is out, as today.

## 2. States the layout must hold

- Trip out: seats locked (tabs still switch pages).
- Quiet doorway: no Bench, Desk or Fair copy; *Done* replaces the door; the field header replaces the title bar.
- One or two seats filled; up to nine in the household.
- Seven rune roles plus Erase, Inventions and Glyphs in the drawer.
- Rare overlays keep their place: the rumour line, the first evening, the note under the door, toasts.
