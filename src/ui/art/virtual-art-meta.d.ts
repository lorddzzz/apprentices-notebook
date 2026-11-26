/** Served by `artMetaPlugin` (scripts/art-check.ts) from the sidecars at build time (R26). */
declare module 'virtual:art-meta' {
  const meta: Readonly<Record<string, import('./spec').ArtMeta>>;
  export default meta;
}
