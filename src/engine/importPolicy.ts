/** External-input safeguards only. Live paper and ink are not constrained by these numbers. */
export const IMPORT_POLICY = {
  maxBytes: 8 * 1024 * 1024,
  maxDepth: 64,
  maxCollectionEntries: 32_768,
  maxTotalEntries: 100_000,
  maxTokens: 100_000,
  maxWork: 1_000_000,
} as const;

export type ImportResource = 'bytes' | 'depth' | 'collection' | 'entries' | 'tokens' | 'work';

/** Supported but too expensive to import. Callers must retain the original save/text. */
export class ResourceLimitError extends Error {
  readonly kind = 'resource-limit';

  constructor(
    public readonly resource: ImportResource,
    public readonly limit: number,
  ) {
    super(
      `This notebook is too large to import (${resource} limit: ${limit}). The original is unchanged.`,
    );
    this.name = 'ResourceLimitError';
  }
}

/** UTF-8 byte count without allocating an encoded copy; unpaired surrogates encode as U+FFFD. */
export function assertImportText(text: string, maxBytes = IMPORT_POLICY.maxBytes): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) bytes++;
    else if (c < 0x800) bytes += 2;
    else if (
      c >= 0xd800 &&
      c <= 0xdbff &&
      text.charCodeAt(i + 1) >= 0xdc00 &&
      text.charCodeAt(i + 1) <= 0xdfff
    ) {
      bytes += 4;
      i++;
    } else bytes += 3;
    if (bytes > maxBytes) throw new ResourceLimitError('bytes', maxBytes);
  }
  return bytes;
}

export interface ImportBudget {
  /** Count UTF-8 across every text field in one import, without concatenating it. */
  text(text: string): void;
  /** Consume aggregate slots/tokens or algorithm operations before doing the work. */
  spend(resource: 'entries' | 'tokens' | 'work', amount?: number): void;
  collection(length: number): void;
}

export function importBudget(): ImportBudget {
  const used = { entries: 0, tokens: 0, work: 0 };
  let bytes = 0;
  const limits = {
    entries: IMPORT_POLICY.maxTotalEntries,
    tokens: IMPORT_POLICY.maxTokens,
    work: IMPORT_POLICY.maxWork,
  };
  return {
    text(text) {
      try {
        bytes += assertImportText(text, IMPORT_POLICY.maxBytes - bytes);
      } catch (error) {
        if (error instanceof ResourceLimitError && error.resource === 'bytes') {
          throw new ResourceLimitError('bytes', IMPORT_POLICY.maxBytes);
        }
        throw error;
      }
    },
    spend(resource, amount = 1) {
      if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('Invalid import work count');
      if (amount > limits[resource] - used[resource]) {
        throw new ResourceLimitError(resource, limits[resource]);
      }
      used[resource] += amount;
    },
    collection(length) {
      if (!Number.isSafeInteger(length) || length < 0) throw new Error('Invalid collection length');
      if (length > IMPORT_POLICY.maxCollectionEntries) {
        throw new ResourceLimitError('collection', IMPORT_POLICY.maxCollectionEntries);
      }
    },
  };
}

/** Iterative preflight before semantic decoding. Counts all array slots and own object fields. */
export function assertImportStructure(root: unknown, budget = importBudget()): void {
  const pending: { value: unknown; depth: number }[] = [{ value: root, depth: 0 }];
  while (pending.length) {
    const current = pending.pop();
    if (!current) continue;
    if (typeof current.value === 'string') budget.text(current.value);
    if (current.value === null || typeof current.value !== 'object') continue;
    if (current.depth > IMPORT_POLICY.maxDepth) {
      throw new ResourceLimitError('depth', IMPORT_POLICY.maxDepth);
    }
    if (Array.isArray(current.value)) budget.collection(current.value.length);
    let length = 0;
    for (const k in current.value) {
      if (!Object.hasOwn(current.value, k)) continue;
      budget.text(k);
      length++;
      budget.collection(length);
      budget.spend('entries');
      const value = (current.value as Record<string, unknown>)[k];
      pending.push({ value, depth: current.depth + 1 });
    }
  }
}

/** Stable growing-text grammar. Dense ASCII stays fixed and has no header. */
export const SPARSE_LATTICE_HEADER = '@lattice 1 growing';
