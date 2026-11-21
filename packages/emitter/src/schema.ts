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
import { resolveEntries, versionStamp } from './issues.js';

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
  /** Schema lowering target; default `draft-2020-12`. */
  readonly target?: EmitterTarget;
}

// The runtime target allowlist: a JS/config caller can pass a typo'd string
// despite the EmitterTarget type; an unknown value must fail closed, not slip
// into the strict branch as ok:true (review finding).
const KNOWN_TARGETS: ReadonlySet<string> = new Set(['draft-2020-12', 'openai-strict']);

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

/**
 * An action name: non-empty at the boundary. The default dialect says so
 * with `minLength`; OpenAI's strict subset documents only `pattern` and
 * `format` for strings, so there the rule is the non-blank pattern — a
 * little stricter than the boundary, never laxer.
 */
function actionName(strict: boolean): Record<string, unknown> {
  return strict ? { pattern: NON_BLANK, type: 'string' } : { minLength: 1, type: 'string' };
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
  return strict ? { anyOf: [base, { type: 'null' }] } : base;
}

function componentBranch(
  tag: string,
  entry: CatalogEntry,
  strict: boolean,
  childReference: string,
): Record<string, unknown> {
  const properties: Record<string, unknown> = { component: { const: tag } };
  const required = ['component'];
  // The optional stable node id (spec 035), in the boundary's own grammar so
  // a schema-accepted id is a boundary-accepted one (S19). Uniqueness within
  // the document is a cross-node rule only the boundary can state.
  const id = { pattern: NODE_ID_GRAMMAR.source, type: 'string' };
  properties['id'] = strict ? { anyOf: [id, { type: 'null' }] } : id;
  if (strict) {
    required.push('id');
  }
  const propEntries = Object.entries(entry.props);
  const propNames = propEntries.map(([name]) => name);
  // The props the catalog declares required (S16): present in every dialect,
  // and their container with them — an omitted `props` would otherwise skip
  // the requirement altogether.
  const requiredNames = propEntries
    .filter(([, constraint]) => constraint.required === true)
    .map(([name]) => name);
  if (propEntries.length > 0) {
    properties['props'] = {
      additionalProperties: false,
      properties: Object.fromEntries(
        propEntries.map(([name, constraint]) => [name, propSchema(constraint, strict)]),
      ),
      required: strict ? propNames : requiredNames.length > 0 ? requiredNames : undefined,
      type: 'object',
    };
    if (strict || requiredNames.length > 0) {
      required.push('props');
    }
  }
  // A native primitive never binds an action (spec 037 D7): its branch
  // offers none, so a model is never invited to emit one.
  if (!NATIVE_PRIMITIVE_TAGS.includes(tag)) {
    const action = actionName(strict);
    properties['action'] = strict ? { anyOf: [action, { type: 'null' }] } : action;
    if (strict) {
      required.push('action');
    }
    // The fields a bound action collects (spec 153): data names mapped to
    // node ids; the prompt states the rules. OpenAI's strict subset closes
    // every object over listed properties, so a map of free names has no
    // form there and only the default dialect offers it; the boundary
    // accepts it from any emitter.
    if (!strict) {
      properties['collect'] = {
        additionalProperties: { pattern: NODE_ID_GRAMMAR.source, type: 'string' },
        maxProperties: COLLECT_MAX_ENTRIES,
        type: 'object',
      };
    }
  }
  const slotNames = Object.keys(entry.slots);
  if (slotNames.length > 0) {
    properties['slots'] = {
      additionalProperties: false,
      properties: Object.fromEntries(
        slotNames.map((name) => [name, { items: { $ref: childReference }, type: 'array' }]),
      ),
      required: strict ? slotNames : undefined,
      type: 'object',
    };
    if (strict) {
      required.push('slots');
    }
  }
  return {
    additionalProperties: false,
    properties,
    required,
    type: 'object',
  };
}

// JSON.stringify drops `required: undefined`, but determinism (S11) and
// honest artifacts prefer never materializing the key at all.
function pruneUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(pruneUndefined);
  }
  if (value !== null && typeof value === 'object') {
    const record: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      if (child !== undefined) {
        record[key] = pruneUndefined(child);
      }
    }
    return record;
  }
  return value;
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
function tallyDocument(artifact: unknown): LimitTally {
  const tally: LimitTally = { enumValues: 0, nameAndEnumChars: 0, properties: 0 };
  const stack: unknown[] = [artifact];
  while (stack.length > 0) {
    const value = stack.pop();
    if (Array.isArray(value)) {
      for (const child of value) {
        stack.push(child);
      }
      continue;
    }
    if (value === null || typeof value !== 'object') {
      continue;
    }
    const record = value as Record<string, unknown>;
    for (const [key, child] of Object.entries(record)) {
      if (
        (key === 'properties' || key === '$defs') &&
        child !== null &&
        typeof child === 'object'
      ) {
        for (const name of Object.keys(child)) {
          tally.properties += key === 'properties' ? 1 : 0;
          tally.nameAndEnumChars += name.length;
        }
      }
      if (key === 'enum' && Array.isArray(child)) {
        for (const entry of child) {
          tally.enumValues += 1;
          tally.nameAndEnumChars += typeof entry === 'string' ? entry.length : 0;
        }
      }
      if (key === 'const' && typeof child === 'string') {
        tally.nameAndEnumChars += child.length;
      }
      stack.push(child);
    }
  }
  return tally;
}

/**
 * Per-component tallies over each component's own built branch, using the
 * SAME metric as the document tally (review finding: a single enum-count
 * heuristic named one "largest contributor" for every limit, so a
 * many-short-enums component could be blamed for a nameAndEnumChars overflow
 * actually caused by another component's single very long value).
 */
function limitContributors(entries: readonly ResolvedEntry[]): ReadonlyMap<string, LimitTally> {
  const perEntry = new Map<string, LimitTally>();
  for (const [tag, entry] of entries) {
    perEntry.set(tag, tallyDocument(componentBranch(tag, entry, true, '#/$defs/child')));
  }
  return perEntry;
}

function worstFor(limit: keyof LimitTally, perEntry: ReadonlyMap<string, LimitTally>): string {
  let worstTag = '';
  let worstValue = -1;
  for (const [tag, tally] of perEntry) {
    if (tally[limit] > worstValue) {
      worstValue = tally[limit];
      worstTag = tag;
    }
  }
  return worstTag;
}

function openAiLimitIssues(
  artifact: unknown,
  entries: readonly ResolvedEntry[],
): readonly EmitterIssue[] {
  const tally = tallyDocument(artifact);
  const perEntry = limitContributors(entries);
  const issues: EmitterIssue[] = [];
  const totals: readonly (readonly [keyof typeof OPENAI_LIMITS, number])[] = [
    ['enumValues', tally.enumValues],
    ['nameAndEnumChars', tally.nameAndEnumChars],
    ['properties', tally.properties],
  ];
  for (const [tag, entry] of entries) {
    for (const [name, constraint] of Object.entries(entry.props)) {
      const values = constraint.type === 'enum' ? (constraint.values ?? []) : [];
      const chars = values.reduce((sum, value) => sum + value.length, 0);
      if (values.length > OPENAI_LARGE_ENUM.values && chars > OPENAI_LARGE_ENUM.chars) {
        issues.push({
          code: 'provider-limit',
          message: `openai-strict large-enum limit of ${String(OPENAI_LARGE_ENUM.chars)} characters exceeded by "${tag}" prop "${name}" (${String(values.length)} values, ${String(chars)} characters) — shorten the enum or derive a component subset`,
          path: 'options.target',
          value: tag,
        });
      }
    }
  }
  for (const [limit, total] of totals) {
    if (total > OPENAI_LIMITS[limit]) {
      // The real largest contributor to THIS metric, not a shared heuristic.
      const worstTag = worstFor(limit, perEntry);
      issues.push({
        code: 'provider-limit',
        message: `openai-strict ${limit} limit of ${String(OPENAI_LIMITS[limit])} exceeded (${String(total)}); largest contributor is "${worstTag}" — derive a component subset instead`,
        path: 'options.target',
        value: worstTag,
      });
    }
  }
  return issues;
}

function baseDocument(catalog: Catalog, target: EmitterTarget): Record<string, unknown> {
  const strict = target === 'openai-strict';
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    // Version + target here; uiSpecJsonSchema appends a content hash of the
    // built $defs so the $id is unique per catalog, subset and target.
    $id: `${SCHEMA_ID_BASE}/${catalog.catalogSchemaVersion}/${target}`,
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
  };
}

function recursiveDefinitions(
  entries: readonly ResolvedEntry[],
  strict: boolean,
): Record<string, unknown> {
  const defs: Record<string, unknown> = {
    child: { anyOf: [{ type: 'string' }, { $ref: '#/$defs/node' }] },
    node: { anyOf: entries.map(([tag]) => ({ $ref: `#/$defs/${tag}` })) },
  };
  for (const [tag, entry] of entries) {
    defs[tag] = componentBranch(tag, entry, strict, '#/$defs/child');
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
  const resolved = resolveEntries(catalog, options.components);
  if (resolved.issues.length > 0) {
    return { issues: resolved.issues, ok: false };
  }
  const target = options.target ?? 'draft-2020-12';
  // A JS/config caller can pass a typo'd target despite the type; an unknown
  // value must fail closed, not fall through to the strict-recursive branch
  // and return an unchecked artifact as ok:true (review finding).
  if (!KNOWN_TARGETS.has(target)) {
    return {
      issues: [
        {
          code: 'invalid-option',
          message: `unknown schema target "${target}" (expected draft-2020-12 or openai-strict)`,
          path: 'options.target',
          value: target,
        },
      ],
      ok: false,
    };
  }
  const strict = target === 'openai-strict';
  const document = baseDocument(catalog, target);
  document['$defs'] = recursiveDefinitions(resolved.entries, strict);
  const artifact = pruneUndefined(document) as Record<string, unknown>;
  // Finalize the $id with a content hash of the built $defs, so two materially
  // different derivations (different catalogs, subsets or targets) never share
  // an identifier in a JSON Schema registry. Deterministic: the $defs are
  // built in sorted order.
  artifact['$id'] = `${String(artifact['$id'])}/${fnv1a(JSON.stringify(artifact['$defs']))}`;
  if (target === 'openai-strict') {
    const limitIssues = openAiLimitIssues(artifact, resolved.entries);
    if (limitIssues.length > 0) {
      return { issues: limitIssues, ok: false };
    }
  }
  return { artifact, issues: [], ok: true };
}
