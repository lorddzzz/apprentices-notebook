# Narrative audit and first draft pass (BL-40 follow-up)

> **Status: Draft 2026-11-23**, for the player's review. Nothing here is in `src/` yet except the names ([names-and-voice.md](names-and-voice.md), applied in `2257fd4`). On approval, the text below is built as data the way the handover was (EN-12: draft, approve, build).
> Voice: cozy and wistful; the owner's hand plain, warm, a little dry, never grand; found and optional (margins, letters, ledgers, short lines at thresholds and bosses). Rules for the owner: they/them, never named before the handover's signature.
> Method: a scan of `src/data/` (text files, blurbs), the screens' static copy (`src/ui/screens/`) and the lore docs. It is a sample, not a line-by-line read; the full continuity read-through (BL-41's remainder) is §3.

## 1. What exists

| Area | State |
|---|---|
| The owner's thread | Rich: margins and answers (`codex.ts`, [seam-answers.md](footnotes-content/seam-answers.md)), per-district footnote pages (~35k words in [footnotes-content/](footnotes-content/)), letters and ledgers per district, the six-page handover and credits. |
| Apprentices | One blurb each (9 + the owner). No temperament beyond mechanics. |
| Foes | One blurb each (9 enemies, 1 per rival). |
| Districts | A `line` (what the owner says about it) and `barred` per district; trip, threshold and loot copy are functional. |
| Screens | Functional copy: *The party is wiped out.* (Wiped), *The stair ends here.* (Cleared), *You are deeper than the lamplight reaches.* (Crossroads), *A quiet doorway* (Study). |

## 2. Gaps (found by the scan) and drafts

| # | Gap | Evidence | Draft below |
|---|---|---|---|
| G1 | **No opening.** A new notebook goes straight to the Study; nothing says where you are, whose notebook it is, or what the city is called. Halvemeer appears nowhere in the game. | no prologue/first-open copy in `src/ui`, `src/app` | §2.1, §2.2 |
| G2 | **Wipe and clear screens are bare.** | `Wiped.svelte`, `Cleared.svelte` | §2.3 |
| G3 | **Apprentices have bodies and rules but no temper.** | `apprentices.ts`, `recruits.ts` blurbs | §2.4 |
| G4 | **Guilds have no voice.** Only the Cartographers' letters and the Notaries' dead letters speak; the Lamplighters, Thermae Guild, Keystone Watch and Bellwrights have none beyond foe names. | district data, footnotes-content | §2.5 |
| G5 | **Named rivals have a name and nothing to say.** | `rivals/*.ts` `blurb` only | §2.6 |
| G6 | **The Seam's formal name is unused.** It has no home yet. | new | §2.7 |

### 2.1 First evening (shown once, on a new notebook, before the Study)

> *9 Lantaarnsteeg, Halvemeer. The Leaning House, fourth floor, under the roof.*
> *The last tenant left the lamp lit.*
> *There is a notebook on the desk, open halfway, in a hand that is not yours. Pell has found the kettle. Joost has found the stove, which is worse.*

### 2.2 The map

Heading: *The owner's map of Halvemeer* (was: *The owner's map*). Nickname *the Drawn City* is held back for the Cartographers' letters.

### 2.3 After a wipe, and at the bottom of the stair

Wipe (three, rotated by trip number; replace *The party is wiped out.*):

- *Somebody carries you home. The lamp is still lit.*
- *The stairs are longer going up. You make it, mostly.*
- *The notebook is open on the desk, exactly as you left it. It does not say I told you so.*

Cleared (replace the second line only; the first stays): *Take it all home. The kettle will be cold, but it is there.*

### 2.4 One line of temper each (appended to the existing blurb)

| Who | Line |
|---|---|
| Pell, the Draughtsman | Measures twice and still apologises for the third line. |
| Joost, the Stoker | Never met a fire he did not want to see through. |
| Hanneke, the Runaway | Slept under a lamp-pole for a month and counts it as lodging. |
| Floris, the Junior Notary | Writes the date on everything, including the soup. |
| Mieke, the Towel-bearer | Calm in a room where everyone else is boiling. |
| Willem, the Warden | Still walks on the inside of every bridge. |
| Tess, the Tuner | Hums the note a room is out by. |
| Nelle, the Copyist | Copies faithfully, and adds one small mistake of her own. |
| Wessel, the Unregistered | Is not on any list, and has opinions about all of them. |

### 2.5 How each guild speaks (a tone key for writers; one sample line each)

| Guild | Manner | Sample |
|---|---|---|
| Lamplighters | Terse, hospitable only by custom | *Mind the pole. It has bitten before.* |
| Notaries | "Per our records", every kindness itemised | *Your inconvenience has been noted and filed.* |
| Thermae Guild | Soothing, never hurried | *Take your time. The water will wait. It always has.* |
| Keystone Watch | Load-bearing words, no decoration | *Every span stands on one thing. Find it.* |
| Bellwrights | Weight, tone, and what carries | *A bell is only ever as honest as its note.* |
| Cartographers | Passive voice; nothing is anyone's decision | *It was determined that the matter be closed.* Heading of their letters: *Re: Non-Conforming Join, Sheet 0.* |

### 2.6 One line from each named rival (as they step in; not the log)

| Rival | Line |
|---|---|
| Gerrit Velt, Lamplighter | *The lamps are lit. You may stay while they are.* |
| Hedda Brenn, Postmaster | *Undeliverable, I am afraid. Both of you.* |
| Bertus Haas, Bath-Steward | *Towels are provided. Tempers are not.* |
| Aldert Roos, Chief Warden | *I keep the middle of the bridge. Come and stand in it.* |
| Lidewij Tauw, Carillonneur | *Listen. That is the tune. Now try to play it back.* |
| the Registrar | *Your name is not on the roll.* (no personal name) |

### 2.7 The Seam's formal name

Used only in the Cartographers' voice: letters and the hall's recovered pages head the Seam as *Non-Conforming Join, Sheet 0*; the owner and the player keep saying *the Seam*.

## 3. The BL-41 read-through (remainder)

A continuity read of the existing thread against the names and voice: name leaks (the owner before the signature), pronouns, "the city" vs Halvemeer, a guild's voice breaking, contradictions between districts' letters and the handover. Findings go to [narrative-readthrough.md](narrative-readthrough.md).

## 4. Order of work after approval

1. §2.1–2.3 and §2.7 first: they change screens and need a phone-size browser check (not possible in the session that wrote this).
2. §2.4 and §2.6: data strings only (`blurb` additions, rival `opening` lines and the sheet/header that shows them).
3. §2.5 as a style key used when new text is written; no ship step of its own.
