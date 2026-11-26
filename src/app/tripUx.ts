import type { LootItem, Profile } from '$engine';

function unbankedFind(profile: Profile, item: LootItem): string | null {
  switch (item.kind) {
    case 'rune':
      return profile.known.includes(item.rune) ? null : `rune:${item.rune}`;
    case 'method':
      return profile.methods.includes(item.method) ? null : `method:${item.method}`;
    case 'solvent':
      return profile.solventsFound.includes(item.solvent) ? null : `solvent:${item.solvent}`;
    case 'recruit':
      return profile.household.members.includes(item.apprentice)
        ? null
        : `recruit:${item.apprentice}`;
    default:
      return null;
  }
}

export function offerNovelty(profile: Profile, item: LootItem): 'new' | null {
  return unbankedFind(profile, item) === null ? null : 'new';
}

export function carriedHome(
  profile: Profile,
  loot: readonly LootItem[],
): { item: LootItem; first: boolean }[] {
  const seen = new Set<string>();
  const firsts = [];
  const rest = [];
  for (const item of loot) {
    const find = unbankedFind(profile, item);
    if (find !== null && !seen.has(find)) {
      seen.add(find);
      firsts.push({ item, first: true });
    } else {
      rest.push({ item, first: false });
    }
  }
  return [...firsts, ...rest];
}
