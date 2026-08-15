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
   * `anthropic-strict` only: the unrolled composition depth bound
   * (default 6). The bound constrains the SCHEMA, not the format — deeper
   * compositions still validate at the boundary.
   */
  readonly maxDepth?: number;
}

const DEFAULT_ANTHROPIC_DEPTH = 6;

// OpenAI strict-mode limits (research-pinned 2026-08, data-model.md table).
const OPENAI_LIMITS = {
  enumValues: 1000,
  nameAndEnumChars: 120_000,
  properties: 5000,
} as const;

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
    ? { anyOf: [{ type: 'string' }, { type: 'null' }] }
    : { type: 'string' };
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
  worstTag: string;
  worstWeight: number;
}

function tallyLimits(entries: readonly ResolvedEntry[]): LimitTally {
  const tally: LimitTally = {
    enumValues: 0,
    nameAndEnumChars: 0,
    properties: 0,
    worstTag: '',
    worstWeight: -1,
  };
  for (const [tag, entry] of entries) {
    let weight = 0;
    // The branch itself: component/action plus props/slots containers.
    tally.properties += 2;
    for (const [name, constraint] of Object.entries(entry.props)) {
      tally.properties += 1;
      tally.nameAndEnumChars += name.length;
      weight += 1;
      for (const value of constraint.values ?? []) {
        tally.enumValues += 1;
        tally.nameAndEnumChars += value.length;
        weight += 1;
      }
    }
    for (const name of Object.keys(entry.slots)) {
      tally.properties += 1;
      tally.nameAndEnumChars += name.length;
      weight += 1;
    }
    if (weight > tally.worstWeight) {
      tally.worstWeight = weight;
      tally.worstTag = tag;
    }
  }
  return tally;
}

function openAiLimitIssues(entries: readonly ResolvedEntry[]): readonly EmitterIssue[] {
  const tally = tallyLimits(entries);
  const issues: EmitterIssue[] = [];
  const exceeded: readonly (readonly [keyof typeof OPENAI_LIMITS, number])[] = [
    ['enumValues', tally.enumValues],
    ['nameAndEnumChars', tally.nameAndEnumChars],
    ['properties', tally.properties],
  ];
  for (const [limit, total] of exceeded) {
    if (total > OPENAI_LIMITS[limit]) {
      issues.push({
        code: 'provider-limit',
        message: `openai-strict ${limit} limit of ${String(OPENAI_LIMITS[limit])} exceeded (${String(total)}); largest contributor is "${tally.worstTag}" — derive a component subset instead`,
        path: 'options.target',
        value: tally.worstTag,
      });
    }
  }
  return issues;
}

function baseDocument(catalog: Catalog, strict: boolean): Record<string, unknown> {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `https://kimen.dev/schemas/ui-spec/${catalog.catalogSchemaVersion}`,
    additionalProperties: false,
    description: `UI-spec format for the Kimen catalog (${versionStamp(catalog)}). Advisory shape: the validation boundary and the guarded renderer remain authoritative.`,
    properties: {
      actions: { items: { type: 'string' }, type: 'array' },
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
  const strict = target !== 'draft-2020-12';
  if (target === 'openai-strict') {
    const limitIssues = openAiLimitIssues(resolved.entries);
    if (limitIssues.length > 0) {
      return { issues: limitIssues, ok: false };
    }
  }
  const document = baseDocument(catalog, strict);
  if (target === 'anthropic-strict') {
    const depth = options.maxDepth ?? DEFAULT_ANTHROPIC_DEPTH;
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
  return { artifact: pruneUndefined(document) as Record<string, unknown>, issues: [], ok: true };
}
