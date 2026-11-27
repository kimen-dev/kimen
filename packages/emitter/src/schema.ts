/**
 * Catalog-specialized JSON Schema derivation (spec 033, FR-002/FR-003):
 * the neutral UI-spec format narrowed to exactly one catalog — one branch
 * per component, closed objects everywhere, enums closed over their
 * declared values — in the draft 2020-12 dialect by default, with one
 * provider-strict lowering. The schema is ADVISORY shape for a model;
 * `validateUiSpec` and the guarded renderer remain the only enforcement
 * points (FR-011).
 */
import type { Catalog, CatalogEntry, CatalogPropConstraint } from '@kimen/catalog';
import { COLLECT_MAX_ENTRIES, NATIVE_PRIMITIVE_TAGS, NODE_ID_GRAMMAR } from '@kimen/catalog';

import type { Derivation, EmitterIssue, ResolvedEntry } from './issues.js';
import {
  failure,
  invalidOption,
  isNonblank,
  isRecord,
  resolveEntries,
  success,
  versionStamp,
} from './issues.js';

/**
 * Schema lowering targets (research D2). `draft-2020-12` is the stable
 * default and the one to hand to any provider surface that takes a JSON
 * Schema as guidance (a regular, non-strict tool included). `openai-strict`
 * meets OpenAI's strict structured-outputs subset: closed all-required
 * objects, recursion kept via `$ref`, only the keywords that subset
 * documents, and its published size limits enforced.
 *
 * There is deliberately no target for Anthropic's strict tools / structured
 * outputs (removed, research D2 amendment): that subset rejects recursive
 * schemas and allows 24 optional and 16 union-typed parameters per request,
 * which no catalog-specialized schema of a real catalog fits.
 */
export type EmitterTarget = 'draft-2020-12' | 'openai-strict';

/** Options shared by every artifact derivation (spec 033 Key Entities). */
export interface DerivationOptions {
  /** Restrict the artifact to these tags; default: the whole catalog. */
  readonly components?: readonly string[];
  /** Glyph names this host offers. Pass the same list to selectSpecIcons. */
  readonly icons?: readonly string[];
  /** Compact catalogPrompt output. Omit for the standard prompt. */
  readonly verbosity?: 'compact';
  /** Exact data keys by named button action, for the openai-strict schema and tool. */
  readonly collect?: Readonly<Record<string, readonly string[]>>;
  /** Schema lowering target; default `draft-2020-12`. */
  readonly target?: EmitterTarget;
}

const SCHEMA_ID_BASE = 'https://kimen.dev/schemas/ui-spec';

// OpenAI strict-mode limits, as documented in the "Supported schemas" section
// of https://developers.openai.com/api/docs/guides/structured-outputs (read
// 2026-11-14; tests/provider-limits.spec.ts measures the artifact against
// the same numbers). Nesting depth (10 levels) holds by construction.
const OPENAI_LIMITS = {
  enumValues: 1000,
  nameAndEnumChars: 120_000,
  properties: 5000,
} as const;

// "For a single enum property with string values, the total string length of
// all enum values cannot exceed 15,000 characters when there are more than
// 250 enum values."
const OPENAI_LARGE_ENUM = { chars: 15_000, values: 250 } as const;

/**
 * A deterministic 32-bit content hash (FNV-1a) that discriminates the schema
 * `$id` per derivation (review finding: every catalog, subset and target
 * shared one version-only `$id`, so two materially different schemas collided
 * in a single JSON Schema registry). No runtime dependency; determinism (S11)
 * holds because the hashed `$defs` are built in sorted order.
 */
function fnv1a(input: string): string {
  let hash = 0x81_1c_9d_c5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01_00_01_93);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

// A required string must name something: the boundary rejects a blank value
// (027 S16), and "contains one non-white-space character" is the same rule
// as a regular expression every target supports.
const NON_BLANK = '\\S';
const NODE_ID = { pattern: NODE_ID_GRAMMAR.source, type: 'string' };
const NULL_SCHEMA = { type: 'null' };

/**
 * An action name: non-empty at the boundary. The default dialect says so
 * with `minLength`; OpenAI's strict subset documents only `pattern` and
 * `format` for strings, so there the rule is the non-blank pattern — a
 * little stricter than the boundary, never laxer.
 */
function actionName(strict: boolean): Record<string, unknown> {
  return strict ? { pattern: NON_BLANK, type: 'string' } : { minLength: 1, type: 'string' };
}

/** `schema` or null, the placeholder of an optional value under a strict target. */
function nullable(schema: Record<string, unknown>, strict: boolean): Record<string, unknown> {
  return strict ? { anyOf: [schema, NULL_SCHEMA] } : schema;
}

function closedObject(
  properties: Record<string, unknown>,
  required: readonly string[] | undefined,
) {
  return { additionalProperties: false, properties, required, type: 'object' };
}

/**
 * A node's binding (spec 154): an action name, or, on a component that
 * declares events, a map from those events to action names. The default
 * dialect asks the map for at least one event. OpenAI's strict subset closes
 * every object over all its properties, so there each event is present and
 * null when it fires nothing; `normalizeEmission` drops those placeholders.
 */
function actionBinding(events: readonly string[], strict: boolean): Record<string, unknown> {
  const name = actionName(strict);
  if (events.length === 0) {
    return nullable(name, strict);
  }
  const perEvent: Record<string, unknown> = {
    additionalProperties: false,
    properties: Object.fromEntries(events.map((event) => [event, nullable(name, strict)])),
    type: 'object',
  };
  if (strict) {
    perEvent['required'] = [...events];
    return { anyOf: [name, perEvent, NULL_SCHEMA] };
  }
  perEvent['minProperties'] = 1;
  return { anyOf: [name, perEvent] };
}

function propSchema(constraint: CatalogPropConstraint, strict: boolean): Record<string, unknown> {
  const base: Record<string, unknown> =
    constraint.type === 'enum'
      ? { enum: [...(constraint.values ?? [])], type: 'string' }
      : constraint.type === 'number-or-string'
        ? {
            anyOf: [
              { type: 'number' },
              constraint.required === true
                ? { type: 'string', pattern: NON_BLANK }
                : { type: 'string' },
            ],
          }
        : { type: constraint.type };
  if (constraint.description !== '') {
    base['description'] = constraint.description;
  }
  // Declared numeric bounds (S17): inclusive, as the boundary enforces them.
  if (constraint.minimum !== undefined) {
    base['minimum'] = constraint.minimum;
  }
  if (constraint.maximum !== undefined) {
    base['maximum'] = constraint.maximum;
  }
  if (constraint.required === true) {
    // A required string must name something — unless the catalog admits the
    // exact empty string as a deliberate value (spec 037: a decorative
    // image's alt), where the boundary alone tells "" from white space.
    if (constraint.type === 'string' && constraint.allowEmpty !== true) {
      base['pattern'] = NON_BLANK;
    }
    // A required prop has no placeholder: it is never nullable (S16).
    return base;
  }
  // Strict targets demand every property present; optionality becomes a
  // null union the host strips back out with `normalizeEmission` (S13).
  return nullable(base, strict);
}

function componentBranch(
  tag: string,
  entry: CatalogEntry,
  strict: boolean,
  collections: Collection,
): Record<string, unknown> {
  const properties: Record<string, unknown> = { component: { const: tag } };
  const draftRequired = ['component'];
  // The optional stable node id (spec 035), in the boundary's own grammar so
  // a schema-accepted id is a boundary-accepted one (S19). Uniqueness within
  // the document is a cross-node rule only the boundary can state.
  properties['id'] = nullable(NODE_ID, strict);
  const propEntries = Object.entries(entry.props);
  // The props the catalog declares required (S16): present in every dialect,
  // and their container with them — an omitted `props` would otherwise skip
  // the requirement altogether.
  if (propEntries.length > 0) {
    const requiredNames = propEntries
      .filter(([, constraint]) => strict || constraint.required === true)
      .map(([name]) => name);
    properties['props'] = closedObject(
      Object.fromEntries(
        propEntries.map(([name, constraint]) => [name, propSchema(constraint, strict)]),
      ),
      requiredNames.length > 0 ? requiredNames : undefined,
    );
    if (requiredNames.length > 0) draftRequired.push('props');
  }
  // A native primitive never binds an action (spec 037 D7): its branch
  // offers none, so a model is never invited to emit one.
  if (!NATIVE_PRIMITIVE_TAGS.includes(tag)) {
    properties['action'] = actionBinding(Object.keys(entry.events), strict);
    // The fields a bound action collects (spec 153): data names mapped to
    // node ids. Only the default dialect offers a map of free names.
    if (!strict) {
      properties['collect'] = {
        additionalProperties: NODE_ID,
        maxProperties: COLLECT_MAX_ENTRIES,
        type: 'object',
      };
    }
  }
  const slotNames = Object.keys(entry.slots);
  if (slotNames.length > 0) {
    properties['slots'] = closedObject(
      Object.fromEntries(
        slotNames.map((name) => [name, { items: { $ref: '#/$defs/child' }, type: 'array' }]),
      ),
      strict ? slotNames : undefined,
    );
  }
  const required = strict ? Object.keys(properties) : draftRequired;
  // Strict objects need a separate closed branch for each bound key set.
  const collecting =
    tag === 'ki-button'
      ? collections.filter(([, keys]) => keys.every((key) => !Object.hasOwn(entry.props, key)))
      : [];
  if (collecting.length === 0) return closedObject(properties, required);
  required.push('collect');
  const branch = (action: unknown, collect: Record<string, unknown>) =>
    closedObject({ ...properties, action, collect }, required);
  return {
    anyOf: [
      branch(properties['action'], NULL_SCHEMA),
      ...collecting.map(([action, keys]) =>
        branch(
          { const: action },
          closedObject(Object.fromEntries(keys.map((key) => [key, NODE_ID])), keys),
        ),
      ),
    ],
  };
}

type Collection = readonly (readonly [action: string, keys: readonly string[]])[];
// Match the UI-spec data boundary's forbidden own keys without exposing its set.
const FORBIDDEN_COLLECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isCollectionName(value: unknown): value is string {
  return isNonblank(value) && !FORBIDDEN_COLLECT_KEYS.has(value);
}

function resolveCollection(value: unknown): Derivation<Collection> {
  const path = 'options.collect';
  if (value === undefined) return success([]);
  if (
    !isRecord(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value) as object | null)
  ) {
    return invalidOption(path, 'collect must be a record of named actions and their data keys');
  }
  const collections: [string, string[]][] = [];
  for (const action of Reflect.ownKeys(value)) {
    if (!isCollectionName(action)) {
      return invalidOption(
        path,
        'collect requires a nonblank, permitted action name',
        String(action),
      );
    }
    const keys: unknown = Object.getOwnPropertyDescriptor(value, action)?.value;
    const at = `${path}.${action}`;
    if (!Array.isArray(keys) || keys.length === 0 || keys.length > COLLECT_MAX_ENTRIES) {
      return invalidOption(
        at,
        `declare 1 to ${String(COLLECT_MAX_ENTRIES)} distinct collection keys`,
      );
    }
    const unique = new Set<string>();
    for (const key of keys as unknown[]) {
      if (!isCollectionName(key) || unique.has(key)) {
        return invalidOption(
          at,
          'collection keys must be nonblank, permitted and distinct',
          typeof key === 'string' ? key : undefined,
        );
      }
      unique.add(key);
    }
    collections.push([action, [...unique].sort()]);
  }
  return success(collections.sort(([a], [b]) => (a < b ? -1 : 1)));
}

// JSON.stringify drops `required: undefined`, but determinism (S11) and
// honest artifacts prefer never materializing the key at all.
function pruneUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(pruneUndefined);
  }
  if (!isRecord(value)) return value;
  const record: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (child !== undefined) {
      record[key] = pruneUndefined(child);
    }
  }
  return record;
}

interface LimitTally {
  enumValues: number;
  nameAndEnumChars: number;
  properties: number;
}

/**
 * Exact tallies over the BUILT document, so the check can never drift from
 * what actually ships (review finding: a hand-derived estimate undercounted
 * container and top-level properties). Counts every key of every
 * `properties` object, every `$defs` name, every `enum` value and every
 * string `const` — the name/enum surface providers meter.
 */
function tallyDocument(
  artifact: unknown,
  tally: LimitTally = { enumValues: 0, nameAndEnumChars: 0, properties: 0 },
): LimitTally {
  // The derived schema tree is shallow: recursive nodes point to a $ref.
  if (artifact !== null && typeof artifact === 'object') {
    for (const [key, child] of Object.entries(artifact as Record<string, unknown>)) {
      if (
        (key === 'properties' || key === '$defs') &&
        child !== null &&
        typeof child === 'object'
      ) {
        const names = Object.keys(child);
        if (key === 'properties') tally.properties += names.length;
        for (const name of names) tally.nameAndEnumChars += name.length;
      }
      if (key === 'enum' && Array.isArray(child)) {
        tally.enumValues += child.length;
        for (const entry of child) {
          if (typeof entry === 'string') tally.nameAndEnumChars += entry.length;
        }
      }
      if (key === 'const' && typeof child === 'string') {
        tally.nameAndEnumChars += child.length;
      }
      tallyDocument(child, tally);
    }
  }
  return tally;
}

function openAiLimitIssues(
  artifact: unknown,
  entries: readonly ResolvedEntry[],
  definitions: Record<string, unknown>,
): readonly EmitterIssue[] {
  const tally = tallyDocument(artifact);
  // Use the same meter per component and metric for the reported contributor.
  const perEntry = entries.map(([tag]) => ({ tag, ...tallyDocument(definitions[tag]) }));
  const issues: EmitterIssue[] = [];
  const report = (message: string, value: string) =>
    issues.push({
      code: 'provider-limit',
      message: `openai-strict ${message}`,
      path: 'options.target',
      value,
    });
  for (const [tag, entry] of entries) {
    for (const [name, constraint] of Object.entries(entry.props)) {
      const values = constraint.type === 'enum' ? (constraint.values ?? []) : [];
      const chars = values.reduce((sum, value) => sum + value.length, 0);
      if (values.length > OPENAI_LARGE_ENUM.values && chars > OPENAI_LARGE_ENUM.chars) {
        report(
          `large-enum limit of ${String(OPENAI_LARGE_ENUM.chars)} characters exceeded by "${tag}" prop "${name}" (${String(values.length)} values, ${String(chars)} characters) — shorten the enum or derive a component subset`,
          tag,
        );
      }
    }
  }
  for (const limit of Object.keys(OPENAI_LIMITS) as (keyof LimitTally)[]) {
    const total = tally[limit];
    if (total > OPENAI_LIMITS[limit]) {
      const { tag: worstTag } = perEntry.reduce((max, entry) =>
        entry[limit] > max[limit] ? entry : max,
      );
      report(
        `${limit} limit of ${String(OPENAI_LIMITS[limit])} exceeded (${String(total)}); largest contributor is "${worstTag}" — derive a component subset instead`,
        worstTag,
      );
    }
  }
  return issues;
}

function schemaDocument(
  catalog: Catalog,
  target: EmitterTarget,
  definitions: Record<string, unknown>,
): Record<string, unknown> {
  const strict = target === 'openai-strict';
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    // Hash the sorted, JSON-ready definitions to distinguish catalogs and subsets.
    $id: `${SCHEMA_ID_BASE}/${catalog.catalogSchemaVersion}/${target}/${fnv1a(JSON.stringify(definitions))}`,
    additionalProperties: false,
    description: `UI-spec format for the Kimen catalog (${versionStamp(catalog)}). Advisory shape: the validation boundary and the guarded renderer remain authoritative.`,
    properties: {
      // The authoritative Zod is z.array(z.string().min(1)); mirror the
      // non-empty constraint so a schema-accepted spec is boundary-accepted.
      actions: { items: actionName(strict), type: 'array' },
      root: { $ref: '#/$defs/node' },
      version: { const: 1 },
    },
    required: strict ? ['actions', 'root', 'version'] : ['root', 'version'],
    title: 'Kimen UI spec',
    type: 'object',
    $defs: definitions,
  };
}

function recursiveDefinitions(
  entries: readonly ResolvedEntry[],
  strict: boolean,
  collections: Collection,
): Record<string, unknown> {
  const defs: Record<string, unknown> = {
    child: { anyOf: [{ type: 'string' }, { $ref: '#/$defs/node' }] },
    node: { anyOf: entries.map(([tag]) => ({ $ref: `#/$defs/${tag}` })) },
  };
  for (const [tag, entry] of entries) {
    defs[tag] = componentBranch(tag, entry, strict, collections);
  }
  return defs;
}

/**
 * Derives the catalog-specialized JSON Schema of the neutral UI-spec
 * format (S1–S5, S10–S12, S15–S20). Deterministic (S11), version-stamped
 * (S10), fail-closed on skew, bad subsets and provider limits — never a
 * silent truncation (FR-009).
 */
export function uiSpecJsonSchema(
  catalog: Catalog,
  options: DerivationOptions = {},
): Derivation<Record<string, unknown>> {
  const resolved = resolveEntries(catalog, options.components, options.icons);
  if (!resolved.ok) return resolved;
  const target: string = options.target ?? 'draft-2020-12';
  const strict = target === 'openai-strict';
  // A JS/config caller can pass a typo'd target despite the type; an unknown
  // value must fail closed, not fall through to the strict-recursive branch
  // and return an unchecked artifact as ok:true (review finding).
  if (!strict && target !== 'draft-2020-12') {
    return invalidOption(
      'options.target',
      `unknown schema target "${target}" (expected draft-2020-12 or openai-strict)`,
      target,
    );
  }
  const collection = resolveCollection(strict ? options.collect : undefined);
  if (!collection.ok) return collection;
  const definitions = recursiveDefinitions(resolved.artifact, strict, collection.artifact);
  const artifact = schemaDocument(
    catalog,
    target,
    pruneUndefined(definitions) as Record<string, unknown>,
  );
  const limitIssues = strict ? openAiLimitIssues(artifact, resolved.artifact, definitions) : [];
  return limitIssues.length > 0 ? failure(limitIssues) : success(artifact);
}
