/**
 * Catalog-specialized JSON Schema derivation (spec 033, FR-002/FR-003):
 * the neutral UI-spec format narrowed to exactly one catalog — one branch
 * per component, closed objects everywhere, enums closed over their
 * declared values — in the draft 2020-12 dialect by default, with
 * provider-strict lowerings. The schema is ADVISORY shape for a model;
 * `validateUiSpec` and the guarded renderer remain the only enforcement
 * points (FR-011).
 */
import type { Catalog, CatalogEntry, CatalogPropConstraint } from '@kimen/catalog';

import type { Derivation, EmitterIssue, ResolvedEntry } from './issues.js';
import { resolveEntries, versionStamp } from './issues.js';

/**
 * Schema lowering targets (research D2). `draft-2020-12` is the stable
 * default; `openai-strict` meets the all-required closed-object subset
 * (recursion kept via `$ref`); `anthropic-strict` additionally unrolls
 * recursion to a bounded composition depth.
 */
export type EmitterTarget = 'anthropic-strict' | 'draft-2020-12' | 'openai-strict';

/** Options shared by every artifact derivation (spec 033 Key Entities). */
export interface DerivationOptions {
  /** Restrict the artifact to these tags; default: the whole catalog. */
  readonly components?: readonly string[];
  /** Schema lowering target; default `draft-2020-12`. */
  readonly target?: EmitterTarget;
  /**
   * `anthropic-strict` only: the unrolled composition depth bound (default 6,
   * an integer in [1, 32]). The bound constrains the SCHEMA, not the format —
   * deeper compositions still validate at the boundary; an out-of-range value
   * fails the derivation closed rather than unrolling unboundedly.
   */
  readonly maxDepth?: number;
}

const DEFAULT_ANTHROPIC_DEPTH = 6;

// The unrolled anthropic-strict lowering materializes one copy of every
// component branch PER level, so an unbounded depth exhausts memory instead
// of returning a fail-closed Derivation (review finding). 32 is far beyond any
// real composition yet keeps the artifact bounded; the default is 6.
const MAX_ANTHROPIC_DEPTH = 32;

// The runtime target allowlist: a JS/config caller can pass a typo'd string
// despite the EmitterTarget type; an unknown value must fail closed, not slip
// into the strict-recursive fallback branch as ok:true (review finding).
const KNOWN_TARGETS: ReadonlySet<string> = new Set([
  'anthropic-strict',
  'draft-2020-12',
  'openai-strict',
]);

const SCHEMA_ID_BASE = 'https://kimen.dev/schemas/ui-spec';

// OpenAI strict-mode limits (research-pinned 2026-08, data-model.md table).
const OPENAI_LIMITS = {
  enumValues: 1000,
  nameAndEnumChars: 120_000,
  properties: 5000,
} as const;

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

function propSchema(constraint: CatalogPropConstraint, strict: boolean): Record<string, unknown> {
  const base: Record<string, unknown> =
    constraint.type === 'enum'
      ? { enum: [...(constraint.values ?? [])], type: 'string' }
      : { type: constraint.type };
  if (constraint.description !== '') {
    base['description'] = constraint.description;
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
  const propEntries = Object.entries(entry.props);
  const propNames = propEntries.map(([name]) => name);
  if (propEntries.length > 0) {
    properties['props'] = {
      additionalProperties: false,
      properties: Object.fromEntries(
        propEntries.map(([name, constraint]) => [name, propSchema(constraint, strict)]),
      ),
      required: strict ? propNames : undefined,
      type: 'object',
    };
    if (strict) {
      required.push('props');
    }
  }
  properties['action'] = strict
    ? { anyOf: [{ minLength: 1, type: 'string' }, { type: 'null' }] }
    : { minLength: 1, type: 'string' };
  if (strict) {
    required.push('action');
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
  const strict = target !== 'draft-2020-12';
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
      actions: { items: { minLength: 1, type: 'string' }, type: 'array' },
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
 * Recursion-free lowering (S6): the node tree unrolled level by level —
 * `node1` may contain `node2` children and so on; the deepest level
 * accepts text children only. The depth bound constrains the schema, not
 * the format (edge case in spec.md).
 */
function unrolledDefinitions(
  entries: readonly ResolvedEntry[],
  depth: number,
): Record<string, unknown> {
  const defs: Record<string, unknown> = {};
  for (let level = 1; level <= depth; level += 1) {
    const childReference = level === depth ? '#/$defs/text' : `#/$defs/child${String(level + 1)}`;
    defs[`node${String(level)}`] = {
      anyOf: entries.map(([tag]) => ({ $ref: `#/$defs/${tag}-${String(level)}` })),
    };
    if (level < depth) {
      defs[`child${String(level + 1)}`] = {
        anyOf: [{ type: 'string' }, { $ref: `#/$defs/node${String(level + 1)}` }],
      };
    }
    for (const [tag, entry] of entries) {
      defs[`${tag}-${String(level)}`] = componentBranch(tag, entry, true, childReference);
    }
  }
  defs['text'] = { type: 'string' };
  return defs;
}

/**
 * Derives the catalog-specialized JSON Schema of the neutral UI-spec
 * format (S1–S6, S10–S12, S15). Deterministic (S11), version-stamped
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
          message: `unknown schema target "${target}" (expected draft-2020-12, openai-strict or anthropic-strict)`,
          path: 'options.target',
          value: target,
        },
      ],
      ok: false,
    };
  }
  const strict = target !== 'draft-2020-12';
  const document = baseDocument(catalog, target);
  if (target === 'anthropic-strict') {
    const depth = options.maxDepth ?? DEFAULT_ANTHROPIC_DEPTH;
    // A degenerate or unbounded depth would ship a dangling $ref as ok:true or
    // exhaust memory unrolling (review finding): fail closed naming the option.
    if (!Number.isInteger(depth) || depth < 1 || depth > MAX_ANTHROPIC_DEPTH) {
      return {
        issues: [
          {
            code: 'invalid-option',
            message: `anthropic-strict maxDepth must be an integer in [1, ${String(MAX_ANTHROPIC_DEPTH)}] (received ${String(options.maxDepth)})`,
            path: 'options.maxDepth',
            value: String(options.maxDepth),
          },
        ],
        ok: false,
      };
    }
    document['$comment'] =
      `composition depth bound: ${String(depth)} (schema bound only; the validation boundary accepts deeper specs)`;
    document['description'] =
      `${String(document['description'])} Composition depth bound: ${String(depth)}.`;
    const properties = document['properties'] as Record<string, unknown>;
    properties['root'] = { $ref: '#/$defs/node1' };
    document['$defs'] = unrolledDefinitions(resolved.entries, depth);
  } else {
    document['$defs'] = recursiveDefinitions(resolved.entries, strict);
  }
  const artifact = pruneUndefined(document) as Record<string, unknown>;
  // Finalize the $id with a content hash of the built $defs, so two materially
  // different derivations (different catalogs, subsets or depths) never share
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
