# Public API compatibility records

This directory contains the immutable inputs to Kimen's public-API SemVer gate.
The normative schema is
[`public-api-snapshot-v1.md`](../../specs/018-project-integrity-hardening/contracts/public-api-snapshot-v1.md).

## Layout

- `baselines/<version>.json` is the canonical snapshot of a protected release.
  It is authoritative in shallow and offline checkouts and must never be
  regenerated from a later worktree.
- `<feature>.json` is a declaration bound to the exact baseline and candidate
  `surfaceSha256` values. It records the affected packages, declared release
  class, and rationale.
- `packages/elements/generated/public-api.json` is the candidate snapshot. It
  is generated only after all public deltas for a feature have landed.

Snapshot and declaration files use canonical JSON: recursively sorted keys,
two-space indentation, and exactly one trailing line feed. The digest covers
only the canonical `surface` value.

## Bootstrap baseline 0.0.0

[`baselines/0.0.0.json`](baselines/0.0.0.json) was derived exclusively from Git
object `bbe86e13efadb0b437444af78d059c33f492b662`, the pre-018 `HEAD`, rather
than from the changing feature worktree. It records both package export maps,
20 Custom Elements Manifest component contracts, the frozen root surface (20
runtime values and 12 named/type-star-derived types), all 22 declaration-derived
module surfaces, 939 published semantic or component token leaves, the
effective light/dark values of those leaves in both exported combined
stylesheets, and the Chromium/Firefox/WebKit baseline. Its surface digest is
`b5cf9427802783f74a2b3467a3f02bb3207a7064be984e086fa2dcbccbfb71c7`.

The normalization is part of the baseline contract: conditional package
exports use their runtime `import` target; component facets come from the
historical CEM, with property descriptions matched onto attributes and
requiredness read from Stencil `docs.json`; type-star root exports are expanded
to their named declarations; and token keys are public semantic/component CSS
names whose defaults are resolved in the onmars-light composition. Missing
historical descriptions remain `null` rather than being backfilled. Candidate
generation must apply the same rules before comparison.

The module and stylesheet facets are schema backfills derived from the same
historical object, not from the feature worktree: the historical source was
built with the repository's pinned Stencil version, and the two exported CSS
files were read byte-for-byte with `git show`. CSS aliases are resolved against
the full declaration map before retaining only the 939 public token names;
unit-zero, linear-easing and omitted-zero-shadow-spread equivalents are
canonicalized. The automatic and forced dark contexts must resolve identically.

The v1 grammar requires every frozen root symbol to carry deprecation and
direct-subpath replacement metadata, while the historical source predates
those annotations. The bootstrap snapshot therefore overlays
`deprecatedSince: "0.0.0"` and each symbol's observed direct component
subpath. This is fail-closed: baseline version `0.0.0` is not one minor newer
than the overlay, so it cannot authorize a removal. The source annotations and
the final candidate remain separate, later tasks; this baseline does not claim
that a public minor already shipped the deprecation.

## Explicit fixture invocation

The entrypoint has no repository defaults. All three inputs must be named, and
`none` is accepted only for an intentionally absent baseline or declaration:

```sh
node scripts/gates/check-public-api.mjs \
  --baseline /path/to/baseline.json \
  --candidate /path/to/candidate.json \
  --declaration /path/to/declaration.json
```

During T058-T059, `pnpm run check:api` runs the S10 fixture suite only. It does
not read or seal the changing repository candidate. The real candidate and
feature declaration are generated and wired only after token migration and
root deprecation are complete.

Never edit a released baseline to make a candidate pass. Create the next
baseline from the protected release artifact; create or update the feature
declaration for the new candidate digest; and let the gate reject stale
digests, under-declared changes, frozen-root growth, and removals without the
required deprecation history.
