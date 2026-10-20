/** Clone engine data graphs without making tree depth a JavaScript call-stack limit. */
export function cloneData<T>(value: T): T {
  const copies = new Map<object, object>();
  const pending: { source: object; target: object }[] = [];
  const copy = (source: unknown): unknown => {
    if (source === null || typeof source !== 'object') return source;
    const known = copies.get(source);
    if (known) return known;
    const target: object = Array.isArray(source)
      ? []
      : source instanceof Map
        ? new Map<unknown, unknown>()
        : source instanceof Set
          ? new Set<unknown>()
          : {};
    copies.set(source, target);
    pending.push({ source, target });
    return target;
  };
  const result = copy(value);
  while (pending.length) {
    const job = pending.pop();
    if (!job) continue;
    if (job.source instanceof Map && job.target instanceof Map) {
      for (const [k, v] of job.source) job.target.set(copy(k), copy(v));
    } else if (job.source instanceof Set && job.target instanceof Set) {
      for (const v of job.source) job.target.add(copy(v));
    } else {
      for (const [k, v] of Object.entries(job.source)) {
        Object.defineProperty(job.target, k, {
          value: copy(v),
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
    }
  }
  return result as T;
}
