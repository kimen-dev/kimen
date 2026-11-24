# Public API compatibility records

This directory contains the inputs to Kimen's public API SemVer gate.
The normative schema is
[`public-api-snapshot-v1.md`](../../specs/018-project-integrity-hardening/contracts/public-api-snapshot-v1.md).

## Layout

- `baselines/<version>.json` is the canonical snapshot of a protected release.
  It is authoritative in shallow and offline checkouts and must never be
  regenerated from a later worktree.
- `<feature>.json` declares one public change. It records the protected
  baseline, affected packages, release class, rationale and exact delta
  fingerprints. The gate reads every declaration at this directory level.
- `archive/` contains historical declarations. `pre-067.json` refers to the
  archived cumulative record for `4bc11b8` and its immutable snapshot in
  `accepted/`. The archive uses gzip to keep the frozen record separate from
  incoming changes to the old generated path. The gate reconstructs only
  the deltas the record approved.
- [`packages/elements/generated/public-api/`](../../packages/elements/generated/public-api)
  is the generated candidate. The gate reconstructs its canonical snapshot
  from the index and component files.

- `packages/<package>.json` is the committed API snapshot of a generative
  package: `@kimen/catalog`, `@kimen/emitter`, `@kimen/adapter-a2ui` and
  `@kimen/adapter-mcp-apps`. See
  [Snapshot a generative package](#snapshot-a-generative-package).

Snapshot and declaration files use canonical JSON: recursively sorted keys,
two-space indentation, and exactly one trailing line feed. The digest covers
only the canonical `surface` value.

## Snapshot a generative package

`pnpm check:api` also runs `scripts/gates/check-package-api.mjs`. It reads
each generative package's built `dist/index.d.ts` and records every exported
name with its kinds and printed signature. The gate fails when that differs
from the committed `packages/<package>.json`, and names each added, removed
or changed export. After a deliberate change, build, run `pnpm api:snapshot`,
review the diff and commit it with the change.

Two rules keep the snapshot complete and small. Every package-local type a
public signature reaches must be exported itself, because a signature names
its types but not their members. A data export (`catalogData`,
`SURFACE_DOCUMENT`) is recorded by name only, because its declared type is
the generated data. The package list lives in
`scripts/lib/package-api-snapshot.mjs`. Unlike the elements gate, these
snapshots carry no baseline, declaration or release class.

## Declare a public change

Regenerate the candidate from the branch's source. On a branch with one public
change, run `pnpm api:declare <slug> <patch|minor|major> "<reason>"` to capture
the deltas the active ledger does not cover yet. Review and commit the new
file. The gate matches each delta's classified before/after values to its
declaration. The release class is the highest class among matching
declarations, and each delta must meet its own release floor.

When two branches change the same public member, resolve the source and
regenerate it. Declare the resulting value if its fingerprint has changed.
When reverting an unreleased delta to the protected baseline, retire the
obsolete entry from the active declaration and archive the file if it has no
remaining deltas. Archive completed declarations when advancing the protected
release baseline.

## Migrate a cumulative declaration

Merge the updated main, keep the branch's legacy declaration at the top of
this directory, and run `pnpm regen`. In
shared-file conflicts, keep the directory-based `check:api` command and the
inventory-based tests from main. Migrate the record in place:

```sh
pnpm api:migrate changes/api/<feature>.json <pre-merge-branch-tip>
pnpm check:api
```

The commit argument defaults to `ORIG_HEAD` after a merge. Use the explicit
pre-merge branch tip after rebasing or amending. The command checks the legacy
declaration against its original sealed candidate and copies its rationale
and release class. Its output covers only missing deltas that match the
original declaration. If source conflicts changed a declared delta during
the merge, review the new behavior, retire the cumulative file to the
archive and author a fresh declaration with `pnpm api:declare`.

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

The entrypoint has no repository defaults. Pass explicit fixture paths:

```sh
node scripts/gates/check-public-api.mjs \
  --baseline /path/to/baseline.json \
  --candidate /path/to/candidate.json \
  --declarations /path/to/declarations
```

The fixture interface also accepts a single explicit v1 declaration path
with `--declaration`. Use `--baseline none` only when testing or declaring an
explicit first release. Create future baselines from protected release
artifacts.
