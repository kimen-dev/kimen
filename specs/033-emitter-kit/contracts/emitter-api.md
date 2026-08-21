# Public API Contract: Emitter kit (spec 033)

First release of `@kimen/emitter`. Runtime dependency: `@kimen/catalog`
only. Every member ships complete JSDoc (Art. I).

```ts
import type { Catalog, UiSpec, ValidationReport } from '@kimen/catalog';

/** JSON Schema dialect/lowering targets (research D2). */
export type EmitterTarget = 'anthropic-strict' | 'draft-2020-12' | 'openai-strict';

export interface DerivationOptions {
  /** Restrict artifacts to these tags (plus their guidance); default: whole catalog. */
  readonly components?: readonly string[];
  /** Lowering target; default 'draft-2020-12'. */
  readonly target?: EmitterTarget;
  /** anthropic-strict only: unrolled composition depth bound (default 6). */
  readonly maxDepth?: number;
}

export type EmitterIssueCode =
  | 'empty-subset'
  | 'invalid-option'
  | 'malformed-catalog'
  | 'provider-limit'
  | 'unknown-component'
  | 'unsupported-version';

export interface EmitterIssue {
  readonly code: EmitterIssueCode;
  readonly path: string;
  readonly message: string;   // names the offender (component, limit, version)
  readonly value?: string | undefined;
}

export type Derivation<T> =
  | { readonly ok: true; readonly artifact: T; readonly issues: readonly [] }
  | { readonly ok: false; readonly issues: readonly EmitterIssue[] };

/** Model-facing prompt: guidance verbatim + format rules + validated example (S7, S8). */
export function catalogPrompt(catalog: Catalog, options?: DerivationOptions): Derivation<string>;

/** Catalog-specialized JSON Schema of the UI-spec format, lowered per target (S1–S6). */
export function uiSpecJsonSchema(
  catalog: Catalog,
  options?: DerivationOptions,
): Derivation<Record<string, unknown>>;

export interface UiSpecTool {
  readonly name: string;         // 'emit_ui'
  readonly description: string;  // model-facing; carries version stamp
  readonly inputSchema: Record<string, unknown>;
}

/** Provider-neutral tool definition wrapping the lowered schema (S9). */
export function uiSpecTool(catalog: Catalog, options?: DerivationOptions): Derivation<UiSpecTool>;

/**
 * Strips strict-mode placeholders (null-valued props, empty optional
 * containers) from an emission (S13). Pure cleanup; output is untrusted
 * until `validateUiSpec` passes. Total function.
 */
export function normalizeEmission(value: unknown): unknown;

/**
 * ONE corrective message from a failed report (code + path + offender per
 * issue), or null when the report is ok (S14). The single-round-then-
 * fail-closed policy is fixed. Total function.
 */
export function repairPrompt(report: ValidationReport): string | null;
```

## Behavioral guarantees

1. Any `Catalog` value works identically — built-in `catalogData` or a
   032-registered catalog (S7 with `acme-kpi-card`).
2. A catalog whose `catalogSchemaVersion` differs from the supported one is
   refused (`unsupported-version`, S12) on every derivation.
3. Deterministic: identical inputs ⇒ byte-identical artifacts (S11).
4. Never silent truncation: subset misses and provider limits fail with
   named offenders (`unknown-component`, `provider-limit`; S4, S15).
5. Version stamps on every artifact (schema `$id`, prompt header, tool
   description; S10; elements version included when the catalog carries
   one).
6. Advisory only: no derivation authorizes rendering; the boundary remains
   `validateUiSpec` + the guarded renderer (docs contract, FR-011).

## SemVer notes (Art. IX)

- Artifact SHAPES (schema structure per target, tool fields, issue codes)
  are public API. Adjusting a lowering to a provider's subset change is
  MINOR with a changelog entry; changing the default dialect is MAJOR.
- `EmitterIssueCode` is a closed union; adding a code is MINOR.
