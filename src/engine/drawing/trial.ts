/**
 * P10/P11: the bot trial is the engine's own (EN-0, Pack A: `src/engine/sim/bot.ts`, lite policy,
 * deterministic operation budget). EN-S1 wraps it with the room judge (fresh HP and charges, salts
 * `7000 + 10*room + attempt`, 12 rounds and 16 at the heart); nothing here is a stub.
 */
export { botTrial } from '../sim/bot';
