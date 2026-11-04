# Margin answers: the Seam's pages

> **State: Approved 2026-11-04 by the orchestrator in place of G3 (the player reviews at the end).** Task SM-13 of [seam-grows-plan.md](../../plans/seam-grows-plan.md), rules P12 and P13. Mechanism: `src/engine/margins.ts` (SM-12), shape `answer: { when, text }` on a codex entry. First notes: `src/data/codex.ts` and `src/data/idioms.ts`. Design: [district-seam.md](../district-seam.md) ("The margins answer").
>
> 27 pages: 13 Seam runes, 3 canal runes, 3 methods, 4 solvents, 4 idioms. Bind, Lift and every other district page are written with that district's lore (P13). Compound and burst pages never answer (P12).

## 0. Voice rules

- **Same hand as the first note.** Short, dry, plain words; the owner's habits stay (asides about himself, small trade jokes, "my teacher"). No exclamation marks, no archaisms.
- **An answer replies to its first note.** It picks up the note's own phrase or image and turns it ("Mind what stands in the way" becomes who stands in the way now).
- **It speaks to you.** First notes were written for anyone; answers notice what *you* did (you proved it, mastered it, performed it). The eeriness is that someone saw.
- **The owner is still in the drawing, but never says so.** Hints only: "in here", "down here", a light left on, notes that sank, something being held. Nothing names the owner, the Seam's join, the door or the Cartographers; nothing explains.
- **One or two sentences**, about the length of the first notes. No game terms beyond what the first note already used (rune and Stoker names are fine).
- **Warm, not menacing.** The owner is pleased, a little wistful, and lonely. A few answers ask something small of you; none commands.
- **No two answers share a turn of phrase**; the "down here" motif is used sparingly so it stays strange.

## 1. Seam runes (`when: 'proof'`)

The answer comes once a proven cluster in any household lattice holds the rune.

| Page | First note | Answer |
|---|---|---|
| `rune:bolt` | Straight and honest. Mind what stands in the way. | You minded it. I am what stands in the way now, and you keep missing me. |
| `rune:splash` | Do not stand near the one who casts it. I learned this twice. | You stood near anyway, and kept your feet. Once was enough for you, then. |
| `rune:touch` | Put your own hand on it. The only one you can trust. | You trusted yours, and it held. Mine is busy holding something else. |
| `rune:strike` | Two to the face. Nothing clever, nothing lost. | You found something clever to do with it anyway. I would have lost a bet on that. |
| `rune:shove` | Pushing is cheap. Where the thing lands is never cheap. | You chose where it landed, every time. That is the expensive part, and you can afford it now. |
| `rune:guard` | A shield is not armour, my teacher said. It still stops a blow. | Now I am the one saying it, and you the one proving it. My teacher would have liked you. |
| `rune:ink` | What I mark, the next rune finds. Ask the Draughtsman. | What you mark, I find too. You need not ask anyone now. |
| `rune:oil` | Never in a room with a Stoker. Always in a room with a Stoker. | You kept a Stoker in the room and the room is still standing. I never managed both. |
| `rune:steam` | Hides a man. Hides a rat. Does not hide from a spark. | It does not hide you from me either. Do not take that as a complaint. |
| `rune:brass` | Cold to the touch until the spark finds it. | The spark found it in your hands. I felt it go warm from here. |
| `rune:spark` | Small, quick, and everywhere the right things touch. | You taught it where the right things are. I only ever taught it to hurry. |
| `rune:fork` | Left first. Always left first. Remember it. | You remembered, and built on it. Some nights I forget which side is left in here. |
| `rune:bend` | The page turns; so does the flow. | And you turned with it. Keep turning; there are pages under this one. |

## 2. Canal runes (`when: 'mastery'`)

Guild-school pages: the answer comes at footnote level II on that rune.

| Page | First note | Answer |
|---|---|---|
| `rune:jar` | Seal the rest and walk away. Someone always steps in it. | Someone always does, and lately it is the right someone. You have learned who walks where. |
| `rune:fuse` | Light it and be far enough off when it goes. | You know the distance to the tile and the round to the moment. I used to count on my fingers. |
| `rune:afterglow` | The light stays on a while after you leave the room. | I left a room once, and the light is still on. You found it, I see. |

## 3. Methods (`when: 'proof'`)

The answer comes once an invention using the method has fired in enough recorded casts.

| Page | First note | Answer |
|---|---|---|
| `method:conduct` | Brass is a good conductor of anything, including bad news. | You sent good news down it for once. It reached me, all the way down. |
| `method:repeat` | Say it twice. The second time it lands harder. | I heard it both times. The second time, I wrote back. |
| `method:margin` | The echo of an echo is still an echo. | And a margin of a margin is where I keep now. Mind the echoes; some of them are mine. |

## 4. Solvents (`when: 'proof'`)

The answer comes once an invention bent by the solvent has fired in enough recorded casts.

| Page | First note | Answer |
|---|---|---|
| `solvent:gallnut` | It stains everything it touches, including the man who mixed it. | It has stained you now as well. The stain is how I knew it was you. |
| `solvent:cinder` | Keep it out of the oil. The oil is impatient. | You put it in the oil and made the impatience work for you. I should have thought of that years ago. |
| `solvent:pitch` | It floats, which is more than I can say for my notes. | My notes did sink, in the end. You have been fishing them out, one page at a time. |
| `solvent:wick` | Give it a round to think about it. | You gave it the round, and it used the round well. So few things in this notebook are patient. |

## 5. Idioms (`when: 'proof'`)

The answer comes once the idiom has been performed (named).

| Page | First note | Answer |
|---|---|---|
| `idiom:cashingIn` | Mark it, then collect. Patience is the only interest the ink pays. | You were patient, and it paid. I have been waiting longer than you; I expect a fortune. |
| `idiom:bonfire` | Wide, then wet, then lit. In that order or not at all. | In that order, and all of it. The smoke came down here too; it smelled like a kitchen I knew. |
| `idiom:theWall` | The floor does the pushing. The wall does the rest. | Most of the walls here are mine. That one held well. |
| `idiom:lanternWalk` | Set it on the water and let the canal deliver it. | It delivered. One of these nights, send a lantern down to me. |
