/**
 * Shared derivation guards of the emitter kit (spec 033): every artifact
 * derivation resolves its inputs through one gate — catalog-version skew
 * refused fail-closed (FR-007), component subsets validated with named
 * offenders (FR-009) — and reports failures in the 032 diagnostic idiom.
 */
import type { Catalog, CatalogEntry } from '@kimen/catalog';
import { CATALOG_SCHEMA_VERSION, NODE_ID_GRAMMAR } from '@kimen/catalog';

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

export function success<T>(artifact: T): Derivation<T> {
  return { ok: true, artifact, issues: [] };
}

export function failure(issues: readonly EmitterIssue[]): Derivation<never> {
  return { ok: false, issues };
}

export function invalidOption(path: string, message: string, value?: string): Derivation<never> {
  return failure([{ code: 'invalid-option', path, message, value }]);
}

export function isNonblank(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Resolves the entries a derivation covers: the whole catalog, or the
 * requested subset. Fail-closed on version skew (S12), malformed catalog
 * values, empty subsets and subset members outside the catalog (S4); the
 * returned entries are sorted by tag so every artifact is deterministic
 * (S11).
 */
const CONSTRAINT_TYPES: ReadonlySet<unknown> = new Set([
  'boolean',
  'enum',
  'number',
  'number-or-string',
  'string',
]);

/** The declared string formats (specs 027, 152 and 154). */
const FORMATS: ReadonlySet<unknown> = new Set(['idref', 'text', 'url']);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isStringRecord(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string');
}

function isStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

const OPTIONAL_CONSTRAINT_CHECKS = Object.entries({
  default: (value: unknown) => ['boolean', 'number', 'string'].includes(typeof value),
  documentedValues: isStringArray,
  format: (value: unknown) => FORMATS.has(value),
  maximum: Number.isFinite,
  minimum: Number.isFinite,
  required: (value: unknown) => typeof value === 'boolean',
  values: isStringArray,
});

function isConstraintShaped(value: unknown): boolean {
  return (
    isRecord(value) &&
    CONSTRAINT_TYPES.has(value['type']) &&
    typeof value['description'] === 'string' &&
    OPTIONAL_CONSTRAINT_CHECKS.every(([key, check]) => {
      const field = value[key];
      return field === undefined || check(field);
    })
  );
}

/**
 * Structural check to exactly the depth the derivations dereference: a
 * hand-built "catalog" with garbage entries must yield a coded issue,
 * never a downstream TypeError (the Derivation no-throw contract).
 */
function isEntryShaped(value: unknown): value is CatalogEntry {
  if (!isRecord(value)) {
    return false;
  }
  return (
    ['tag', 'description', 'whenToUse', 'whenNotToUse'].every(
      (key) => typeof value[key] === 'string',
    ) &&
    isRecord(value['props']) &&
    Object.values(value['props']).every(isConstraintShaped) &&
    isStringRecord(value['slots']) &&
    isStringRecord(value['events'])
  );
}

export function resolveEntries(
  catalog: Catalog,
  components?: readonly string[],
  icons?: readonly string[],
): Derivation<readonly ResolvedEntry[]> {
  const issues: EmitterIssue[] = [];
  // JS callers can hand over anything despite the Catalog type; the guard
  // inspects the value as unknown so the check is real, not tautological.
  const candidate: unknown = catalog;
  const shaped =
    isRecord(candidate) &&
    typeof candidate['catalogSchemaVersion'] === 'string' &&
    isRecord(candidate['components']);
  if (!shaped) {
    return failure([
      {
        code: 'malformed-catalog',
        message: 'the catalog value does not carry a components record and a schema version',
        path: 'catalog',
      },
    ]);
  }
  // The subset option arrives from untyped/JSON callers too: a non-array (or
  // non-string-array) must fail closed with a named issue, not throw a
  // TypeError when the branch below reads `.length` or iterates it (the
  // Derivation no-throw contract).
  if (components !== undefined && !isStringArray(components)) {
    return failure([
      {
        code: 'invalid-option',
        path: 'options.components',
        message: 'options.components must be an array of component tag strings when provided',
      },
    ]);
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
  const tags = components ?? Object.keys(componentsRecord);
  if (tags.length === 0) {
    issues.push(
      components === undefined
        ? {
            code: 'malformed-catalog',
            message: 'the catalog declares no components',
            path: 'catalog.components',
          }
        : {
            code: 'empty-subset',
            message: 'a component subset must name at least one component',
            path: 'options.components',
          },
    );
  }
  for (const tag of components ?? []) {
    if (!Object.hasOwn(componentsRecord, tag)) {
      issues.push({
        code: 'unknown-component',
        message: `subset component "${tag}" is outside the catalog`,
        path: 'options.components',
        value: tag,
      });
    }
  }
  if (issues.length > 0) return failure(issues);
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
  if (issues.length > 0) return failure(issues);
  return icons === undefined ? success(entries) : restrictIcons(entries, icons);
}

/** Close icon props for artifact derivation, leaving the runtime catalog intact. */
function restrictIcons(
  entries: readonly ResolvedEntry[],
  icons: readonly string[],
): Derivation<readonly ResolvedEntry[]> {
  const path = 'options.icons';
  const values = Array.isArray(icons) ? [...new Set<string>(icons)] : [];
  if (values.length === 0 || !values.every(isNonblank)) {
    return invalidOption(path, 'icons must be a nonempty list of nonblank glyph names');
  }
  const narrowed: ResolvedEntry[] = [];
  for (const [tag, entry] of entries) {
    const props = { ...entry.props };
    for (const name of tag === 'ki-icon' ? ['name', 'icon-name'] : ['icon-name']) {
      const prop = props[name];
      if (prop === undefined) continue;
      const conflict = values.find((value) => {
        if (prop.format === 'idref') return !NODE_ID_GRAMMAR.test(value);
        // A URL prop can be restricted by the host's origin policy; a glyph
        // selection does not carry enough information to offer URL values.
        if (prop.format === 'url') return true;
        if (prop.type === 'enum') return prop.values?.includes(value) !== true;
        return prop.type !== 'string' && prop.type !== 'number-or-string';
      });
      if (conflict !== undefined) {
        return invalidOption(path, `glyph "${conflict}" conflicts with ${tag}.${name}`, conflict);
      }
      // The prop prose can mention built-in glyphs unavailable here.
      const constraint = { ...prop, description: '', type: 'enum' as const, values };
      if (typeof constraint.default !== 'string' || !values.includes(constraint.default)) {
        delete constraint.default;
      }
      props[name] = constraint;
    }
    narrowed.push([tag, { ...entry, props }]);
  }
  return success(narrowed);
}

/** The human version stamp every artifact carries (S10, FR-012). */
export function versionStamp(catalog: Catalog): string {
  return catalog.elementsVersion === undefined
    ? `catalog schema version ${catalog.catalogSchemaVersion}`
    : `catalog schema version ${catalog.catalogSchemaVersion}; elements ${catalog.elementsVersion}`;
}
