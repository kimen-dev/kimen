# Data Model: Consumer catalog registration (spec 032)

## Entities

### Catalog (public, NEW as a named type)

The immutable catalog value every boundary resolves. The built-in generated
catalog satisfies it structurally; `createCatalog` produces deep-frozen
instances of it.

| Field | Type | Rules |
|---|---|---|
| `catalogSchemaVersion` | `string` | Always the package's `CATALOG_SCHEMA_VERSION` for created catalogs; skew referent for S15 |
| `components` | `Readonly<Record<tag, CatalogEntry>>` | Keyed by tag; key MUST equal `entry.tag` |
| `elementsVersion` | `string \| undefined` | Present on the built-in catalog (derivation metadata); absent on standalone consumer catalogs; preserved through extend mode |

### CatalogEntry (public, EXISTING — unchanged, now shared by both origins)

`{ tag, description, whenToUse, whenNotToUse, props: Record<name,
CatalogPropConstraint>, slots: Record<name, string>, events: Record<name,
string> }` — see `validate.ts:23-42`. Registered entries satisfy the exact
same interface after validation.

### CatalogPropConstraint (public, EXISTING — unchanged)

`type: 'boolean' | 'enum' | 'number' | 'string'`; `values` present exactly
when `type === 'enum'` (non-empty); optional `documentedValues` (open string
unions), `default` (scalar), `description` (required string, may be empty
for props but not for guidance fields).

### CatalogDefinition (public, NEW)

The consumer-authored JSON facade; untrusted input.

| Field | Type | Rules |
|---|---|---|
| `components` | `Record<tag, CatalogEntryInput>` | ≥1 entry (S-empty rejected); keys are tags; duplicate keys are impossible in parsed JSON but key≠entry.tag mismatch is `malformed-definition` |

`CatalogEntryInput` = `CatalogEntry` authored as plain data. Validation
rules (registration-time, all named on rejection):

- `tag`: matches `^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$` (conservative ASCII
  custom-element name, hyphen mandatory) AND not an SVG/MathML reserved name
  (`annotation-xml`, `color-profile`, `font-face`, `font-face-src`,
  `font-face-format`, `font-face-name`, `font-face-uri`, `missing-glyph`)
  → else `invalid-tag` (S5)
- `description`, `whenToUse`, `whenNotToUse`: non-blank strings →
  else `missing-guidance` (S6)
- `props`: record of valid constraints; `enum` requires non-empty `values`
  of strings; `default` must satisfy its own constraint; unknown constraint
  `type` → `malformed-constraint` (S7)
- `slots` / `events`: records of string descriptions (`""` key = default
  slot, mirroring generated entries)
- Unknown keys anywhere → `malformed-definition` (strict schemas end-to-end)
- Whole definition crosses the purity wall first: forbidden keys (S8),
  non-data values (S9), accessors, cycles, byte/depth budgets

### RegistrationIssue (public, NEW)

`{ code, path, message, value? }` — the `ValidationIssue` diagnostic idiom
with registration codes:
`collision | invalid-tag | missing-guidance | malformed-constraint |
malformed-definition | empty-definition | forbidden-key | size-budget |
depth-budget`.

### CatalogCreationResult (public, NEW)

Discriminated result, never a throw:
`{ ok: true, catalog: Catalog, issues: [] } | { ok: false, issues:
readonly RegistrationIssue[] }`.

## Relationships & state transitions

```text
CatalogDefinition --createCatalog--> [purity wall] --> [strict schema]
    --> [tag rules + collision check vs options.extend]
    --> snapshot + deep-freeze --> Catalog (ok)
any failure --> { ok: false, issues } (no partial catalog ever escapes)

Catalog --validateUiSpec({catalog})--> ValidationReport   (S1,S2,S11,S12)
Catalog --renderUiSpec({catalog})----> RenderResult        (S13,S14,S15)
Catalog --createStreamingRenderer({catalog})--> StreamingRenderer (S16)
absent catalog option --> built-in generated catalog       (S3, SC-003)
```

There are no other state transitions: a `Catalog` is a frozen value from
birth; "modification" is creating a new one (D1/D4).

## Validation-rule ownership (no drift, Art. I)

| Rule | Owner | Consumed by |
|---|---|---|
| Purity wall (forbidden keys, non-data, budgets) | `toPlainData` (existing) | spec validation AND registration |
| Entry well-formedness | `register.ts` private schema (NEW) | registration only |
| Spec-vs-catalog membership/typing | `checkNode` (existing, parametrized) | validation AND render |
| URL allowlist, render budgets, streaming accumulation | `render.ts` (existing, unchanged) | render only |
| Version skew | `versionDiagnostic` (existing, parametrized) | render + streaming |
