# Names and voice (BL-40)

> **Status: Decided 2026-11-23** (design round with the player; names drawn from four subagent proposals, two Haiku and two Luna, plus Claude's own set, then merged by Claude under "take your lean"). **Applied to `src/` in `2257fd4`** (the phone-size browser check is still owed).
> Summary: [DESIGN.md](../../DESIGN.md) §9.4 and the §11 log. Backlog: [ROADMAP](../ROADMAP.md) BL-40, BL-41. Voice precedent: [ending-text.md](ending-text.md).

## 0. Decisions

| Question | Decision |
|---|---|
| Mood | **Cozy and wistful**: rain on the attic window, lamplight, quiet melancholy; the mystery is about a person you come to love. The owner's voice stays plain, warm, a little dry, never grand. |
| Name flavour | **Invented but pronounceable**, between a light touch and fully invented: a gently Dutch city with some Italian salt in it. District *labels* stay readable trade words beside the proper name. |
| Title | **Keep *The Apprentice's Notebook*** and add a tagline. |
| Story density | **Found and optional**: margins, letters and ledgers read by choice; short lines at thresholds and bosses only. |
| Apprentices | **Given name plus trade epithet** ("Pell, the Draughtsman"): name first in the UI, trade as the subtitle. |
| The owner | Never named in the margins; **named once, at the end** (handover or registry). They/them. |
| The Seam | Keeps its in-world name; the Cartographers' letters use a cold formal catalogue name for it. |
| The player | No named protagonist: "you", the new tenant. |

## 1. The names

| Slot | Name | Notes |
|---|---|---|
| Tagline | *The last tenant left the lamp lit.* | Loop line for store or PWA text: *Write the runes down. Watch the chain catch.* |
| The city | **Halvemeer** | "Half-lake". Nickname: **the Drawn City** (a quiet pointer at the Cartographers). |
| The Seam, formal | **Non-Conforming Join, Sheet 0** | Used only by the guild, in its letters. |
| The owner | **Marit Vos** | Revealed once, at the end; they/them. A full name because the baths' ledger and the registry carry it. |
| The attic | **the Leaning House, 9 Lantaarnsteeg** | |

**Apprentices**

| Today | Name |
|---|---|
| Draughtsman | **Pell, the Draughtsman** |
| Stoker | **Joost, the Stoker** |
| Lamp-pole runaway | **Hanneke, the Runaway** |
| Junior notary | **Floris, the Junior Notary** |
| Towel-bearer | **Mieke, the Towel-bearer** |
| Defector warden | **Willem, the Warden** |
| Tuner | **Tess, the Tuner** |
| The Copyist | **Nelle, the Copyist** |
| Erased student | **Wessel, the Unregistered** |
| The owner (tenth) | **Marit, the Mender**, shown under this name only after the handover |

**Guilds and districts** (each district is a proper name with its plain label kept beside it)

| Guild | District | Plain label |
|---|---|---|
| (none, the owner's drawing) | **the Seam**; lower floors **the Underjoin**; the open door **the Unlatched Door** | the Seam |
| the **Lamplighters** | **Lampwater** | the oil-lit canals |
| the **Notaries** | **Verloren Corner** | the ink-makers' quarter |
| the **Thermae Guild** | **the Thermae** | the bathhouses |
| the **Keystone Watch** | **the Fog Arches** | the bridges |
| the **Bellwrights** | **Klokhof** | the bell foundry |
| the **Cartographers** | **the Sestante** | the Cartographers' hall |

**Rivals**

| Today | Name |
|---|---|
| Lamplighter | **Gerrit Velt** |
| Postmaster | **Hedda Brenn** |
| Bath-Steward | **Bertus Haas** |
| Chief Warden | **Aldert Roos** |
| Carillonneur | **Lidewij Tauw** |
| Registrar | stays **the Registrar**: the one faceless office |

## 2. Judgment calls (where proposals clashed)

- **Klokhof vs Kaartenhof:** two "-hof" names would look alike on a phone, so the Cartographers' hall is **the Sestante** (a sextant: cold, exact), not Kaartenhof.
- **Tess, not Ilse, for the Tuner:** *Ilse Marr* is already a bathhouse ledger name (`bathhouses.ts`).
- **No "Sealer" or "Detuner" epithets:** both are existing foe names; the notary stays "Junior Notary".
- **Nelle, not Pim, for the Copyist:** Pim and Pell are too close.
- **Bertus, not Wendel, for the Bath-Steward:** avoids a W cluster with Willem and Wessel.
- **Lampwater / Lamplighters and Thermae / Thermae Guild** are deliberate pairs (the guild and its district share a stem), as with Bellwrights and Klokhof.
- **"the Unregistered"** (Wessel) instead of "Erased student": it carries the erasure as a status and echoes the Registrar.
- Not used, for the record: the other three sets' alternatives (e.g. Radegem, Salvera, Lieve, Iven, Ansel Marra, Campanella, Carta Morta). Recoverable from this commit's message and the chat, not kept here.

## 3. Applying it (done)

Names live in `src/data/` (apprentices, recruits, rivals, districts, enemies where a rival is named), in UI text and in tests that assert them. A rename should be one task: data + UI strings + `ending-text.md` references + tests, then `pnpm check:fast`. The owner's name goes into the handover's last page or the registry line, not into the margins. Open: where exactly the owner's name lands (BL-41's read-through decides).
