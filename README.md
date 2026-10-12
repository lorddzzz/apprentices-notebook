# The Apprentice's Notebook

A turn-based rune-inscribing game: wire runes into a lattice like code, then watch the chain reactions play out. Built for the iPhone as a PWA. Personal project, work in progress.

**Play:** https://lorddzzz.github.io/apprentices-notebook/

## Install on iPhone

1. Open the link in **Safari**.
2. Tap **Share** → **Add to Home Screen**.
3. Launch it from the Home Screen. It runs full-screen and works offline. It updates itself; if a change seems missing, close and reopen it.

The build hash in the bottom-right corner tells you which commit you're playing.

## Develop

Requires Node 24 and pnpm.

```bash
pnpm install
pnpm dev      # http://localhost:5173/apprentices-notebook/ (also reachable from your phone on the same Wi-Fi)
pnpm check    # typecheck + lint + test (the gate CI runs)
pnpm build    # production build to dist/
```

See [DESIGN.md](DESIGN.md) for the game design, [TECH.md](TECH.md) for the tech decisions and [CLAUDE.md](CLAUDE.md) for the working rules.
