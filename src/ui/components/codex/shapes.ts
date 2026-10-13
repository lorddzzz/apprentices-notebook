import { ASPECTS, type IdiomDef, type RuneFamily } from '$data';

const FAMILY_NAMES: Record<RuneFamily, string> = {
  source: 'Source',
  material: 'Material',
  shape: 'Shape',
  trigger: 'Trigger',
  aura: 'Aura',
};

export function familyName(f: RuneFamily): string {
  return FAMILY_NAMES[f];
}

/** "Source → Trigger reading Mark → Heat or Charge": an idiom's steps as words. */
export function idiomShape(idiom: IdiomDef): string {
  return idiom.steps
    .map((step) => {
      const aspects = step.aspects?.map((a) => ASPECTS[a].name).join(' or ');
      if (step.family && aspects) return `${familyName(step.family)} reading ${aspects}`;
      if (step.family) return familyName(step.family);
      return aspects ?? '';
    })
    .join(' → ');
}
