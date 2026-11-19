# Public API snapshot and declaration v1

Canonical snapshot shape:

```json
{
  "schemaVersion": 1,
  "surface": {
    "packages": {
      "@kimen/elements": {
        "version": "0.1.0",
        "exports": {},
        "modules": {},
        "components": {},
        "rootSymbols": {
          "KiButton": {
            "deprecatedSince": "0.1.0",
            "replacement": "@kimen/elements/ki-button"
          }
        }
      },
      "@kimen/tokens": {
        "version": "0.1.0",
        "exports": {},
        "modules": {},
        "stylesheets": {
          "./css": {
            "target": "./dist/css/tokens.css",
            "contexts": { "light": {}, "dark": {} }
          }
        },
        "tokens": {}
      }
    },
    "browserBaseline": ["chromium", "firefox", "webkit"]
  },
  "surfaceSha256": "<sha256 of canonical surface only>"
}
```

All keys and set-like arrays use deterministic lexical ordering; serialization
ends in one LF. Component facets include properties, attributes, events,
methods, slots, parts and CSS custom properties with type/default/required,
`deprecatedSince` and replacement metadata. Export entries and legacy root
symbols also carry target, deprecation version and direct-subpath replacement;
every root symbol must be covered and no new one may appear. The envelope digest
covers only canonical `surface`, avoiding self-reference.

`modules` inventories the symbols and declaration signatures of every public
export. `stylesheets` inventories only exported combined CSS entrypoints and
records the normalized effective value of every public semantic/component
token in light and dark contexts. Resolution follows `var()` aliases across
the full stylesheet and takes the scheme's branch of every `light-dark()`
value; a theme stylesheet carries overrides only and is resolved over the
default stylesheet it is loaded with. The emitted grammar is closed (the
colour-scheme rules, one token rule per stylesheet, no conditional rules):
anything else fails the gate. Internal DTCG type/default representation
changes — and changes in how the stylesheets carry the same effective values —
do not override this published CSS contract.

Previous-release baselines live at
`changes/api/baselines/<version>.json`, are committed from a protected release
tag and retain their digest. In a shallow/offline checkout the checked-in
baseline is authoritative. A missing baseline is allowed only for an explicit
first-release declaration; it never silently becomes PATCH/N/A.

## Active change declarations

The founder approved additive declarations under Art. X on 2026-11-19 in
[spec 067](../../067-merge-friendly-checks/spec.md). Snapshot schema v1 and the
protected-release comparison still apply. Each public change has a declaration
at `changes/api/<slug>.json`. The gate reads every JSON declaration at that
directory level.

```json
{
  "schemaVersion": 2,
  "packages": ["@kimen/elements"],
  "baselineVersions": { "@kimen/elements": "0.0.0" },
  "baselineSha256": "<64-hex>",
  "deltas": {
    "/packages/@kimen~1elements/components/ki-button/properties/legacy": "<64-hex>"
  },
  "release": "major",
  "reason": "Remove the deprecated legacy property after one minor cycle."
}
```

Each JSON Pointer names an exact delta. Its digest covers the classified
before and after values, the package, the change kind and the minimum release
class. A newly published collection has a presence marker and fingerprints
for its members. This lets another declaration add a sibling without changing
the first declaration's digest. Each declaration's package list matches its
deltas and its package versions match the protected baseline.

Every public delta requires a matching fingerprint from a declaration whose
release class meets its minimum. The highest matching class sets the release
class for the combined candidate. A later declaration can cover an updated
value at the same path while older fingerprints at that path lose their
authority. A declaration for a path that no longer differs from the protected
baseline must be retired. Unknown unowned deltas and new frozen-root symbols
always fail.

The one-time `pre-067.json` record rehydrates the already accepted deltas
from a frozen snapshot and its archived cumulative declaration. The accepted
snapshot is immutable and has the candidate digest recorded at `4bc11b8`.
Its coverage applies only to exact deltas still present. Normal declarations
use the inline delta map. An explicit first release still requires one exact,
digest-bound v1 first-release declaration for all candidate packages.

Classification:

- MAJOR: removed/renamed facet, export, module symbol, stylesheet context or
  token; narrowed type; optional→required; changed published default/effective
  CSS value; browser baseline reduction; unknown.
- MINOR: additive optional facet/export/module symbol/stylesheet context/token.
- PATCH: description or implementation-only delta.

Removal remains forbidden even with a MAJOR declaration unless the baseline
proves non-empty deprecation/replacement metadata shipped for at least one
intervening MINOR. Missing or stale baseline/candidate digests fail closed
unless the exact first-release contract applies.
