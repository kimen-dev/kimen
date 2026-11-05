/**
 * The catalog schema version compatibility policy (spec 035 FR-002, D8),
 * shared by every version gate — the guarded renderer, the stream, the live
 * surface and `createCatalog`'s `extend` base — so they can never drift
 * apart (Art. I). Internal module — not part of the package's public surface.
 *
 * A declared version is compatible when it is a plain `MAJOR.MINOR.PATCH`
 * with the supported major and a minor not newer than the supported minor:
 * format changes within a major are additive (a newer renderer still
 * validates what an older spec may say), while a spec written against a
 * newer minor may use fields this renderer does not know and is rejected
 * fail-closed — it must never be validated under a laxer schema (028 FR-012).
 * Anything that is not plain SemVer (pre-release tags, a `v` prefix, missing
 * parts, leading zeros) is rejected.
 */
const PLAIN_SEMVER = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u;

function parse(version: string): readonly [number, number] | null {
  const match = PLAIN_SEMVER.exec(version);
  if (match === null) {
    return null;
  }
  return [Number(match[1]), Number(match[2])];
}

export function isCompatibleSchemaVersion(declared: string, supported: string): boolean {
  const wanted = parse(declared);
  const own = parse(supported);
  if (wanted === null || own === null) {
    return false;
  }
  return wanted[0] === own[0] && wanted[1] <= own[1];
}

/** The human description of what a gate supporting `supported` accepts. */
export function compatibleRange(supported: string): string {
  const own = parse(supported);
  return own === null
    ? `"${supported}"`
    : `"${supported}" (major ${String(own[0])}, minor up to ${String(own[1])})`;
}
