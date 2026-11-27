/** UH-8. The tab after `current`, or null on the last (the Codex's "Next page ›"). */
export function nextTab<T extends string>(tabs: readonly T[], current: T): T | null {
  const at = tabs.indexOf(current);
  return at >= 0 && at < tabs.length - 1 ? (tabs[at + 1] ?? null) : null;
}
