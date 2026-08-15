# Public API Contract: Consumer catalog registration (spec 032)

Additive surface on `@kimen/catalog` (Art. IX: MINOR; default-path behavior
unchanged). Names below are the contract; every member ships complete JSDoc
(Art. I).

## New exports

```ts
/** The immutable catalog value every boundary resolves (built-in or created). */
export interface Catalog {
  readonly catalogSchemaVersion: string;
  readonly components: Readonly<Record<string, CatalogEntry>>;
  readonly elementsVersion?: string | undefined;
}

/** The consumer-authored, data-only JSON facade (untrusted input). */
export interface CatalogDefinition {
  readonly components: Readonly<Record<string, CatalogEntry>>;
}

export interface CatalogCreationOptions {
  /**
   * Base catalog to extend (e.g. the built-in `catalogData`). Registered
   * tags colliding with base tags are rejected fail-closed; base entries
   * are re-snapshotted and frozen into the result. When absent the result
   * is a standalone catalog of exactly the definition's entries.
   */
  readonly extend?: Catalog;
}

export type RegistrationIssueCode =
  | 'collision'
  | 'depth-budget'
  | 'empty-definition'
  | 'forbidden-key'
  | 'invalid-tag'
  | 'malformed-constraint'
  | 'malformed-definition'
  | 'missing-guidance'
  | 'size-budget';

export interface RegistrationIssue {
  readonly code: RegistrationIssueCode;
  readonly path: string;        // e.g. `definition.components.acme-kpi-card.props.tone`
  readonly message: string;     // names the offender; never echoes payload bodies
  readonly value?: string | undefined;
}

export type CatalogCreationResult =
  | { readonly ok: true; readonly catalog: Catalog; readonly issues: readonly [] }
  | { readonly ok: false; readonly issues: readonly RegistrationIssue[] };

/**
 * Creates an immutable catalog from a data-only definition (S1), optionally
 * extending a base catalog (S2). The definition is untrusted: it crosses
 * the purity wall and a strict schema; every rejection names its offender
 * (S4–S9). The result is deeply frozen (S10). Never throws on bad input.
 */
export function createCatalog(
  definition: unknown,
  options?: CatalogCreationOptions,
): CatalogCreationResult;
```

## Widened existing signatures (additive, backward-compatible)

```ts
// validate.ts — new optional member on the existing options bag
export function validateUiSpec(
  input: unknown,
  options?: { readonly maxBytes?: number; readonly catalog?: Catalog },
): ValidationReport;

// render.ts — new optional member on RenderOptions
export interface RenderOptions {
  readonly surface: Element;
  readonly onAction?: (event: ActionEvent) => void;
  readonly budgets?: Partial<RenderBudgets>;
  readonly catalogSchemaVersion?: string;
  /** The catalog to validate and render against; built-in catalog when absent (S3). */
  readonly catalog?: Catalog;
}
```

`createStreamingRenderer(options)` inherits `catalog` through
`RenderOptions` (S16).

## Behavioral guarantees (contract-level)

1. **Default path identical**: absent `catalog`, every observable outcome of
   `validateUiSpec`/`renderUiSpec`/`createStreamingRenderer` is unchanged —
   the entire pre-existing test suite is the proof (SC-003, S3).
2. **Catalog-in-use totality**: membership, prop constraints, slot names,
   `type`-prop pinning and version-skew comparison ALL read the catalog in
   use; no code path consults the built-in catalog when an explicit one was
   given (FR-011).
3. **Fail-closed creation**: no partial catalog escapes a failed
   `createCatalog`; `ok: false` carries ≥1 named issue.
4. **Immutability**: mutation attempts on a created catalog (any depth)
   never alter subsequent validation/render outcomes (S10); in strict-mode
   ESM they throw `TypeError` (frozen objects), and the guarantee holds
   regardless.
5. **No throw on hostile input**: `createCatalog` returns issues for any
   input shape (including primitives, `null`, cyclic objects, functions);
   throwing is reserved for programmer errors outside the untrusted-input
   path (none in v1).
6. **Protocol neutrality**: no protocol vocabulary in any new identifier or
   type (FR-009).

## SemVer notes (Art. IX)

- This surface lands as a MINOR (pre-1.0: minor line bump) on
  `@kimen/catalog`.
- The definition format's acceptance rules are part of the public contract:
  NARROWING them later (rejecting previously accepted definitions) is
  breaking; WIDENING (accepting more) is additive.
- `RegistrationIssueCode` is a closed union consumers may exhaustively
  switch on; adding a code is a MINOR documented in the changelog.
