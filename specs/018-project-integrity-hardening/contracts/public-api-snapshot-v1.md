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
the full stylesheet; automatic and forced dark selectors must agree. Internal
DTCG type/default representation changes do not override this published CSS
contract.

Previous-release baselines live at
`changes/api/baselines/<version>.json`, are committed from a protected release
tag and retain their digest. In a shallow/offline checkout the checked-in
baseline is authoritative. A missing baseline is allowed only for an explicit
first-release declaration; it never silently becomes PATCH/N/A.

Change declaration path: `changes/api/<slug>.json`.

```json
{
  "schemaVersion": 1,
  "packages": ["@kimen/elements"],
  "baselineVersion": "0.0.0",
  "baselineSha256": "<64-hex>",
  "candidateSha256": "<64-hex>",
  "release": "major",
  "reason": "Remove the deprecated legacy property after one minor cycle."
}
```

Classification:

- MAJOR: removed/renamed facet, export, module symbol, stylesheet context or
  token; narrowed type; optional→required; changed published default/effective
  CSS value; browser baseline reduction; unknown.
- MINOR: additive optional facet/export/module symbol/stylesheet context/token.
- PATCH: description or implementation-only delta.

Actual class greater than declared fails. Breaking change without a valid,
digest-bound declaration fails. Removal remains forbidden even with a MAJOR
declaration unless the baseline proves non-empty deprecation/replacement
metadata shipped for at least one intervening MINOR. First release, missing or
stale baseline/candidate digests, and stale declarations have explicit fixtures
and fail closed unless the exact first-release contract applies.
