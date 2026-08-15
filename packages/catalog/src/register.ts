/**
 * Consumer catalog registration (spec 032, Art. VIII): the JSON facade a
 * consuming application puts in front of its own components. A definition
 * is untrusted input — it crosses the same purity wall as UI specs plus a
 * strict schema, every rejection names its offender, and no code path
 * executes from definition data. The produced catalog is a deep-frozen
 * immutable value that `validateUiSpec` and the guarded renderer accept
 * explicitly; the built-in generated catalog remains the default path
 * everywhere, unchanged.
 */
import { z } from 'zod';

import { catalogData } from './generated/catalog.js';
import type { Catalog, CatalogEntry, CatalogPropConstraint, ValidationIssue } from './validate.js';
import { toPlainData, VALIDATION_MAX_BYTES } from './validate.js';

/** Machine-readable registration rejection classes (spec 032 FR-002/FR-004). */
export type RegistrationIssueCode =
  | 'collision'
  | 'depth-budget'
  | 'empty-definition'
  | 'forbidden-key'
  | 'invalid-tag'
  | 'malformed-constraint'
  | 'malformed-definition'
  | 'missing-guidance'
  | 'size-budget'
  | 'unsupported-version';

/**
 * One registration rejection: the violated rule, the location in the
 * definition and the named offender. Pure data in the `ValidationIssue`
 * idiom — messages name identifiers, never echo payload bodies.
 */
export interface RegistrationIssue {
  readonly code: RegistrationIssueCode;
  /** Location in the definition, e.g. `definition.components.acme-kpi-card.props.tone`. */
  readonly path: string;
  readonly message: string;
  /** The offending value named by the issue (tag, field, key). */
  readonly value?: string | undefined;
}

/**
 * The consumer-authored, data-only JSON facade: one entry per component in
 * the exact shape the generated catalog uses (FR-001), keyed by tag.
 */
export interface CatalogDefinition {
  readonly components: Readonly<Record<string, CatalogEntry>>;
}

export interface CatalogCreationOptions {
  /**
   * Base catalog to extend (e.g. the built-in `catalogData`). Definition
   * tags colliding with base tags are rejected fail-closed; base entries
   * are re-snapshotted and frozen into the result. Absent, the result is a
   * standalone catalog of exactly the definition's entries.
   */
  readonly extend?: Catalog;
}

/**
 * The fail-closed outcome of `createCatalog`: a deep-frozen catalog, or the
 * named issues — never a partial catalog, never a throw on bad input.
 */
export type CatalogCreationResult =
  | { readonly ok: true; readonly catalog: Catalog; readonly issues: readonly [] }
  | { readonly ok: false; readonly issues: readonly RegistrationIssue[] };

// The definition schema is exactly as strict as the UI-spec schema (spec
// 027 precedent): unknown keys rejected everywhere, scalar-only constraint
// grammar, the entry shape shared verbatim with the generated catalog.
const propConstraintSchema = z.strictObject({
  default: z.union([z.boolean(), z.number(), z.string()]).optional(),
  description: z.string(),
  documentedValues: z.array(z.string()).optional(),
  type: z.enum(['boolean', 'enum', 'number', 'string']),
  values: z.array(z.string()).optional(),
});

const entrySchema = z.strictObject({
  description: z.string(),
  events: z.record(z.string(), z.string()),
  props: z.record(z.string(), propConstraintSchema),
  slots: z.record(z.string(), z.string()),
  tag: z.string(),
  whenNotToUse: z.string(),
  whenToUse: z.string(),
});

const definitionSchema = z.strictObject({
  components: z.record(z.string(), entrySchema),
});

// A base catalog can legitimately exceed the definition budget (dozens of
// entries with rich guidance); this ceiling still bounds the snapshot walk.
const EXTEND_MAX_BYTES = 8 * 1_024 * 1_024;

const baseSchema = z.record(z.string(), entrySchema);

function baseSchemaIssues(error: z.ZodError): readonly RegistrationIssue[] {
  return error.issues.map((issue) => ({
    code: 'malformed-definition' as const,
    message: issue.message,
    path: ['options.extend.components', ...issue.path.map(String)].join('.'),
  }));
}

type ParsedEntry = z.output<typeof entrySchema>;

/**
 * A conservative custom-element name: lowercase ASCII, digit-friendly, a
 * hyphen mandatory. Deliberately NARROWER than the HTML PCENChar grammar
 * (no Unicode ranges): a registration boundary prefers rejecting exotic
 * names over accepting a spoofable one (Art. VIII).
 */
const CUSTOM_ELEMENT_TAG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/u;

// The SVG/MathML names the custom-elements spec forbids even though they
// contain a hyphen.
const RESERVED_TAGS = new Set([
  'annotation-xml',
  'color-profile',
  'font-face',
  'font-face-format',
  'font-face-name',
  'font-face-src',
  'font-face-uri',
  'missing-glyph',
]);

const GUIDANCE_FIELDS = ['description', 'whenNotToUse', 'whenToUse'] as const;
const GUIDANCE_FIELD_SET: ReadonlySet<string> = new Set(GUIDANCE_FIELDS);

function toRegistrationIssue(issue: ValidationIssue): RegistrationIssue {
  // The purity wall emits exactly these codes; anything else in context is
  // a malformed definition.
  const code: RegistrationIssueCode =
    issue.code === 'forbidden-key' || issue.code === 'size-budget' || issue.code === 'depth-budget'
      ? issue.code
      : 'malformed-definition';
  return { code, message: issue.message, path: issue.path, value: issue.value };
}

function schemaIssues(error: z.ZodError): readonly RegistrationIssue[] {
  return error.issues.map((issue) => {
    const segments = issue.path.map(String);
    const last = segments.at(-1) ?? '';
    // An absent guidance field is a missing-guidance rejection (S6), not a
    // generic shape error: the classes stay distinct for consumers.
    if (segments[0] === 'components' && segments.length === 3 && GUIDANCE_FIELD_SET.has(last)) {
      return {
        code: 'missing-guidance' as const,
        message: `"${segments[1] ?? ''}" is missing required ${last} guidance`,
        path: ['definition', ...segments].join('.'),
        value: last,
      };
    }
    const code = segments.includes('props')
      ? ('malformed-constraint' as const)
      : ('malformed-definition' as const);
    return {
      code,
      message: issue.message,
      path: ['definition', ...segments].join('.'),
    };
  });
}

function checkConstraint(
  tag: string,
  name: string,
  constraint: ParsedEntry['props'][string],
  path: string,
  issues: RegistrationIssue[],
): void {
  if (constraint.type === 'enum') {
    if (constraint.values === undefined || constraint.values.length === 0) {
      issues.push({
        code: 'malformed-constraint',
        message: `${tag} prop "${name}" declares an enum constraint without values`,
        path,
        value: name,
      });
    } else if (constraint.values.some((value) => value.trim() === '')) {
      issues.push({
        code: 'malformed-constraint',
        message: `${tag} prop "${name}" declares blank enum values`,
        path,
        value: name,
      });
    }
  } else if (constraint.values !== undefined) {
    issues.push({
      code: 'malformed-constraint',
      message: `${tag} prop "${name}" declares values but is not an enum constraint`,
      path,
      value: name,
    });
  }
  if (constraint.documentedValues !== undefined && constraint.type !== 'string') {
    issues.push({
      code: 'malformed-constraint',
      message: `${tag} prop "${name}" declares documentedValues but is not an open string`,
      path,
      value: name,
    });
  }
  if (constraint.default !== undefined) {
    const satisfies =
      constraint.type === 'enum'
        ? typeof constraint.default === 'string' &&
          (constraint.values ?? []).includes(constraint.default)
        : typeof constraint.default === constraint.type;
    if (!satisfies) {
      issues.push({
        code: 'malformed-constraint',
        message: `${tag} prop "${name}" default does not satisfy its own constraint`,
        path,
        value: name,
      });
    }
  }
}

function checkEntry(key: string, entry: ParsedEntry, issues: RegistrationIssue[]): void {
  const path = `definition.components.${key}`;
  if (entry.tag !== key) {
    issues.push({
      code: 'malformed-definition',
      message: `entry key "${key}" does not match its tag "${entry.tag}"`,
      path: `${path}.tag`,
      value: entry.tag,
    });
  }
  if (RESERVED_TAGS.has(entry.tag)) {
    issues.push({
      code: 'invalid-tag',
      message: `tag "${entry.tag}" is a reserved SVG/MathML name and cannot be a custom element`,
      path: `${path}.tag`,
      value: entry.tag,
    });
  } else if (!CUSTOM_ELEMENT_TAG.test(entry.tag)) {
    issues.push({
      code: 'invalid-tag',
      message: `tag "${entry.tag}" is not a valid custom-element name (lowercase ASCII with a hyphen required)`,
      path: `${path}.tag`,
      value: entry.tag,
    });
  }
  for (const field of GUIDANCE_FIELDS) {
    if (entry[field].trim() === '') {
      issues.push({
        code: 'missing-guidance',
        message: `"${entry.tag}" ${field} guidance is required and must not be blank`,
        path: `${path}.${field}`,
        value: field,
      });
    }
  }
  for (const [name, constraint] of Object.entries(entry.props)) {
    checkConstraint(entry.tag, name, constraint, `${path}.props.${name}`, issues);
  }
}

const sortedRecord = <T>(entries: Iterable<readonly [string, T]>): Record<string, T> =>
  Object.fromEntries([...entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

function normalizeConstraint(input: ParsedEntry['props'][string]): CatalogPropConstraint {
  const constraint: {
    type: CatalogPropConstraint['type'];
    description: string;
    values?: readonly string[];
    documentedValues?: readonly string[];
    default?: boolean | number | string;
  } = { description: input.description, type: input.type };
  if (input.values !== undefined) {
    constraint.values = input.values;
  }
  if (input.documentedValues !== undefined) {
    constraint.documentedValues = input.documentedValues;
  }
  if (input.default !== undefined) {
    constraint.default = input.default;
  }
  return constraint;
}

function normalizeEntry(input: ParsedEntry): CatalogEntry {
  return {
    description: input.description,
    events: sortedRecord(Object.entries(input.events)),
    props: sortedRecord(
      Object.entries(input.props).map(
        ([name, constraint]) => [name, normalizeConstraint(constraint)] as const,
      ),
    ),
    slots: sortedRecord(Object.entries(input.slots)),
    tag: input.tag,
    whenNotToUse: input.whenNotToUse,
    whenToUse: input.whenToUse,
  };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

/**
 * Creates an immutable catalog from a data-only definition (S1), optionally
 * extending a base catalog (S2). The definition is untrusted: it crosses
 * the purity wall (forbidden keys, non-data values, accessors, cycles,
 * byte/depth budgets) and a strict schema; every rejection names its
 * offender (S4–S9). The result is deeply frozen (S10) and interchangeable
 * with the built-in catalog at every boundary that accepts a `catalog`
 * option. Never throws on bad input.
 */
export function createCatalog(
  definition: unknown,
  options: CatalogCreationOptions = {},
): CatalogCreationResult {
  const wall = toPlainData(definition, VALIDATION_MAX_BYTES, {
    root: 'definition',
    surface: 'a catalog definition',
  });
  if (wall.issues.length > 0) {
    return { issues: wall.issues.map(toRegistrationIssue), ok: false };
  }
  const parsed = definitionSchema.safeParse(wall.data);
  if (!parsed.success) {
    return { issues: schemaIssues(parsed.error), ok: false };
  }

  const issues: RegistrationIssue[] = [];
  const entries = Object.entries(parsed.data.components);
  if (entries.length === 0) {
    issues.push({
      code: 'empty-definition',
      message: 'a catalog definition must declare at least one component',
      path: 'definition.components',
    });
  }
  for (const [key, entry] of entries) {
    checkEntry(key, entry, issues);
  }

  const base = options.extend;
  let baseComponents: Record<string, CatalogEntry> | undefined;
  let baseElementsVersion: string | undefined;
  if (base !== undefined) {
    const baseCandidate: unknown = base;
    if (
      typeof baseCandidate !== 'object' ||
      baseCandidate === null ||
      Array.isArray(baseCandidate)
    ) {
      issues.push({
        code: 'malformed-definition',
        message: 'options.extend is not a catalog value',
        path: 'options.extend',
      });
    } else if (base.catalogSchemaVersion !== catalogData.catalogSchemaVersion) {
      issues.push({
        code: 'unsupported-version',
        message: `extended catalog declares schema version "${base.catalogSchemaVersion}"; this registration supports "${catalogData.catalogSchemaVersion}"`,
        path: 'options.extend.catalogSchemaVersion',
        value: base.catalogSchemaVersion,
      });
    } else {
      // The extend base is as untrusted as the definition (review finding:
      // structuredClone threw DOMException on non-cloneable values and
      // invoked accessor getters): its entries cross the SAME purity wall
      // and entry schema before they can flow into the result.
      const baseWall = toPlainData(base.components, EXTEND_MAX_BYTES, {
        root: 'options.extend.components',
        surface: 'an extended catalog',
      });
      if (baseWall.issues.length > 0) {
        issues.push(...baseWall.issues.map(toRegistrationIssue));
      } else {
        const parsedBase = baseSchema.safeParse(baseWall.data);
        if (!parsedBase.success) {
          issues.push(...baseSchemaIssues(parsedBase.error));
        } else {
          baseComponents = {};
          for (const [key, entry] of Object.entries(parsedBase.data)) {
            baseComponents[key] = normalizeEntry(entry);
          }
          for (const [key] of entries) {
            if (Object.hasOwn(baseComponents, key)) {
              issues.push({
                code: 'collision',
                message: `tag "${key}" collides with an entry of the extended catalog`,
                path: `definition.components.${key}`,
                value: key,
              });
            }
          }
          const versionCandidate = (baseCandidate as { elementsVersion?: unknown }).elementsVersion;
          if (typeof versionCandidate === 'string') {
            baseElementsVersion = versionCandidate;
          }
        }
      }
    }
  }
  if (issues.length > 0) {
    return { issues, ok: false };
  }

  const components: Record<string, CatalogEntry> = baseComponents ?? {};
  for (const [key, entry] of Object.entries(parsed.data.components)) {
    components[key] = normalizeEntry(entry);
  }

  const catalog: Catalog =
    baseElementsVersion === undefined
      ? {
          catalogSchemaVersion: catalogData.catalogSchemaVersion,
          components: sortedRecord(Object.entries(components)),
        }
      : {
          catalogSchemaVersion: catalogData.catalogSchemaVersion,
          components: sortedRecord(Object.entries(components)),
          elementsVersion: baseElementsVersion,
        };
  return { catalog: deepFreeze(catalog), issues: [], ok: true };
}
