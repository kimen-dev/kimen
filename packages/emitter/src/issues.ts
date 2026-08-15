/**
 * Shared derivation guards of the emitter kit (spec 033): every artifact
 * derivation resolves its inputs through one gate — catalog-version skew
 * refused fail-closed (FR-007), component subsets validated with named
 * offenders (FR-009) — and reports failures in the 032 diagnostic idiom.
 */
import type { Catalog, CatalogEntry } from '@kimen/catalog';
import { CATALOG_SCHEMA_VERSION } from '@kimen/catalog';

/** Machine-readable derivation rejection classes (spec 033 FR-007/FR-009). */
export type EmitterIssueCode =
  | 'empty-subset'
  | 'invalid-option'
  | 'malformed-catalog'
  | 'provider-limit'
  | 'unknown-component'
  | 'unsupported-version';

/**
 * One derivation rejection: the violated rule, the offending location and
 * the named offender (component, limit or version). Messages never echo
 * payload bodies.
 */
export interface EmitterIssue {
  readonly code: EmitterIssueCode;
  readonly path: string;
  readonly message: string;
  readonly value?: string | undefined;
}

/**
 * The fail-closed outcome of every artifact derivation: the artifact, or
 * the named issues — never a throw on any catalog or options input.
 */
export type Derivation<T> =
  | { readonly ok: true; readonly artifact: T; readonly issues: readonly [] }
  | { readonly ok: false; readonly issues: readonly EmitterIssue[] };

/** One resolved catalog entry, keyed by its tag, in deterministic order. */
export type ResolvedEntry = readonly [string, CatalogEntry];

export interface ResolvedEntries {
  readonly entries: readonly ResolvedEntry[];
  readonly issues: readonly EmitterIssue[];
}

/**
 * Resolves the entries a derivation covers: the whole catalog, or the
 * requested subset. Fail-closed on version skew (S12), malformed catalog
 * values, empty subsets and subset members outside the catalog (S4); the
 * returned entries are sorted by tag so every artifact is deterministic
 * (S11).
 */
const CONSTRAINT_TYPES: ReadonlySet<string> = new Set(['boolean', 'enum', 'number', 'string']);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isStringRecord(value: unknown): boolean {
  return isPlainRecord(value) && Object.values(value).every((entry) => typeof entry === 'string');
}

function isStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isConstraintShaped(value: unknown): boolean {
  if (!isPlainRecord(value)) {
    return false;
  }
  const scalarDefault =
    value['default'] === undefined ||
    ['boolean', 'number', 'string'].includes(typeof value['default']);
  return (
    typeof value['type'] === 'string' &&
    CONSTRAINT_TYPES.has(value['type']) &&
    typeof value['description'] === 'string' &&
    (value['values'] === undefined || isStringArray(value['values'])) &&
    (value['documentedValues'] === undefined || isStringArray(value['documentedValues'])) &&
    scalarDefault
  );
}

/**
 * Structural check to exactly the depth the derivations dereference: a
 * hand-built "catalog" with garbage entries must yield a coded issue,
 * never a downstream TypeError (the Derivation no-throw contract).
 */
function isEntryShaped(value: unknown): value is CatalogEntry {
  if (!isPlainRecord(value)) {
    return false;
  }
  return (
    typeof value['tag'] === 'string' &&
    typeof value['description'] === 'string' &&
    typeof value['whenToUse'] === 'string' &&
    typeof value['whenNotToUse'] === 'string' &&
    isPlainRecord(value['props']) &&
    Object.values(value['props']).every(isConstraintShaped) &&
    isStringRecord(value['slots']) &&
    isStringRecord(value['events'])
  );
}

export function resolveEntries(catalog: Catalog, components?: readonly string[]): ResolvedEntries {
  const issues: EmitterIssue[] = [];
  // JS callers can hand over anything despite the Catalog type; the guard
  // inspects the value as unknown so the check is real, not tautological.
  const candidate: unknown = catalog;
  const shaped =
    isPlainRecord(candidate) &&
    typeof candidate['catalogSchemaVersion'] === 'string' &&
    isPlainRecord(candidate['components']);
  if (!shaped) {
    return {
      entries: [],
      issues: [
        {
          code: 'malformed-catalog',
          message: 'the catalog value does not carry a components record and a schema version',
          path: 'catalog',
        },
      ],
    };
  }
  const componentsRecord = candidate['components'] as Record<string, unknown>;
  if (catalog.catalogSchemaVersion !== CATALOG_SCHEMA_VERSION) {
    issues.push({
      code: 'unsupported-version',
      message: `catalog declares schema version "${catalog.catalogSchemaVersion}"; this emitter supports "${CATALOG_SCHEMA_VERSION}"`,
      path: 'catalog.catalogSchemaVersion',
      value: catalog.catalogSchemaVersion,
    });
  }
  let tags: readonly string[];
  if (components === undefined) {
    tags = Object.keys(componentsRecord);
    if (tags.length === 0) {
      issues.push({
        code: 'malformed-catalog',
        message: 'the catalog declares no components',
        path: 'catalog.components',
      });
    }
  } else {
    if (components.length === 0) {
      issues.push({
        code: 'empty-subset',
        message: 'a component subset must name at least one component',
        path: 'options.components',
      });
    }
    for (const tag of components) {
      if (!Object.hasOwn(componentsRecord, tag)) {
        issues.push({
          code: 'unknown-component',
          message: `subset component "${tag}" is outside the catalog`,
          path: 'options.components',
          value: tag,
        });
      }
    }
    tags = components;
  }
  if (issues.length > 0) {
    return { entries: [], issues };
  }
  // A subset is a selection SET: repeats collapse instead of duplicating
  // guidance blocks, anyOf branches and limit tallies (review finding).
  const sorted = [...new Set(tags)].sort();
  const entries: ResolvedEntry[] = [];
  for (const tag of sorted) {
    const entry = componentsRecord[tag];
    if (!isEntryShaped(entry)) {
      issues.push({
        code: 'malformed-catalog',
        message: `catalog entry "${tag}" does not satisfy the catalog entry contract`,
        path: `catalog.components.${tag}`,
        value: tag,
      });
      continue;
    }
    entries.push([tag, entry] as const);
  }
  if (issues.length > 0) {
    return { entries: [], issues };
  }
  return { entries, issues: [] };
}

/** The human version stamp every artifact carries (S10, FR-012). */
export function versionStamp(catalog: Catalog): string {
  return catalog.elementsVersion === undefined
    ? `catalog schema version ${catalog.catalogSchemaVersion}`
    : `catalog schema version ${catalog.catalogSchemaVersion}; elements ${catalog.elementsVersion}`;
}
