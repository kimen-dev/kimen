// @spec:033-emitter-kit
// The strict lowering against the provider's DOCUMENTED subset (S20, S15):
// this suite fails the day `openai-strict` emits a keyword the provider does
// not list, or grows past a limit it publishes. It measures the artifact a
// host would send; nothing here calls a provider.
//
// Source: OpenAI, "Structured Outputs" guide, section "Supported schemas",
// https://developers.openai.com/api/docs/guides/structured-outputs — read
// 2026-11-14. Re-read it before changing a constant below.

import type { Catalog } from '@kimen/catalog';
import { catalogData, createCatalog } from '@kimen/catalog';
import { describe, expect, it } from 'vitest';
import { uiSpecJsonSchema } from '../src/index.js';

const OPENAI_STRICT = {
  // "up to 5000 object properties total, with up to 10 levels of nesting"
  maxNesting: 10,
  maxProperties: 5000,
  // "total string length of all property names, definition names, enum
  // values, and const values cannot exceed 120,000 characters"
  maxNameAndValueChars: 120_000,
  // "up to 1000 enum values across all enum properties"; "for a single enum
  // property with string values, the total string length of all enum values
  // cannot exceed 15,000 characters when there are more than 250 enum values"
  largeEnum: { chars: 15_000, values: 250 },
  maxEnumValues: 1000,
  // "Supported string properties: pattern, format" with these formats.
  stringFormats: [
    'date',
    'date-time',
    'duration',
    'email',
    'hostname',
    'ipv4',
    'ipv6',
    'time',
    'uuid',
  ],
  // Structural keywords plus the type-specific ones the guide lists as
  // supported (string: pattern, format; number: multipleOf, maximum,
  // exclusiveMaximum, minimum, exclusiveMinimum; array: minItems, maxItems).
  // `minLength` and `maxLength` are deliberately absent: the guide does not
  // list them among the supported string properties.
  supportedKeywords: [
    '$defs',
    '$id',
    '$ref',
    '$schema',
    'additionalProperties',
    'anyOf',
    'const',
    'description',
    'enum',
    'exclusiveMaximum',
    'exclusiveMinimum',
    'format',
    'items',
    'maxItems',
    'maximum',
    'minItems',
    'minimum',
    'multipleOf',
    'pattern',
    'properties',
    'required',
    'title',
    'type',
  ],
} as const;

type Schema = Record<string, unknown>;

interface Measure {
  readonly keywords: ReadonlySet<string>;
  readonly formats: ReadonlySet<string>;
  readonly openObjects: number;
  readonly partiallyRequiredObjects: number;
  readonly properties: number;
  readonly enumValues: number;
  readonly nameAndValueChars: number;
  readonly nesting: number;
  readonly oversizedEnums: number;
}

const childSchemas = (schema: Schema): Schema[] => [
  ...Object.values((schema['properties'] ?? {}) as Record<string, Schema>),
  ...Object.values((schema['$defs'] ?? {}) as Record<string, Schema>),
  ...((schema['anyOf'] ?? []) as Schema[]),
  ...(schema['items'] === undefined ? [] : [schema['items'] as Schema]),
];

const nestingOf = (schema: Schema): number =>
  1 + Math.max(0, ...childSchemas(schema).map(nestingOf));

const allSchemas = (schema: Schema): Schema[] => [
  schema,
  ...childSchemas(schema).flatMap(allSchemas),
];

const stringLength = (values: readonly unknown[]): number =>
  values.reduce<number>((sum, value) => sum + (typeof value === 'string' ? value.length : 0), 0);

/** Measures a schema document the way the provider's limits are stated. */
function measure(document: Schema): Measure {
  const schemas = allSchemas(document);
  const objects = schemas.filter((schema) => schema['type'] === 'object');
  const propertyNames = objects.flatMap((schema) =>
    Object.keys((schema['properties'] ?? {}) as Schema),
  );
  const definitionNames = schemas.flatMap((schema) =>
    Object.keys((schema['$defs'] ?? {}) as Schema),
  );
  const enums = schemas.flatMap((schema) =>
    Array.isArray(schema['enum']) ? [schema['enum'] as unknown[]] : [],
  );
  const consts = schemas.flatMap((schema) => ('const' in schema ? [schema['const']] : []));
  return {
    enumValues: enums.flat().length,
    formats: new Set(
      schemas.flatMap((schema) => ('format' in schema ? [String(schema['format'])] : [])),
    ),
    keywords: new Set(schemas.flatMap((schema) => Object.keys(schema))),
    nameAndValueChars:
      stringLength(propertyNames) +
      stringLength(definitionNames) +
      stringLength(enums.flat()) +
      stringLength(consts),
    nesting: nestingOf(document),
    openObjects: objects.filter((schema) => schema['additionalProperties'] !== false).length,
    oversizedEnums: enums.filter(
      (values) =>
        values.length > OPENAI_STRICT.largeEnum.values &&
        stringLength(values) > OPENAI_STRICT.largeEnum.chars,
    ).length,
    partiallyRequiredObjects: objects.filter(
      (schema) =>
        JSON.stringify([...((schema['required'] ?? []) as string[])].sort()) !==
        JSON.stringify(Object.keys((schema['properties'] ?? {}) as Schema).sort()),
    ).length,
    properties: propertyNames.length,
  };
}

const probeEntry = (tag: string, props: Record<string, unknown>) => ({
  description: 'Synthetic probe.',
  events: { 'acme-change': 'Fired on change.' },
  props,
  slots: { '': 'Content.', footer: 'Footer.' },
  tag,
  whenNotToUse: 'Never in production.',
  whenToUse: 'Only in this test.',
});

/** A registered catalog exercising every constraint the lowering emits. */
function everyConstraintCatalog(): Catalog {
  const created = createCatalog(
    {
      components: {
        'acme-probe': probeEntry('acme-probe', {
          count: { description: 'Bounded.', maximum: 20, minimum: 0, type: 'number' },
          flag: { default: false, description: 'A flag.', type: 'boolean' },
          source: { description: 'A URL.', format: 'url', required: true, type: 'string' },
          title: { description: 'Required text.', required: true, type: 'string' },
          tone: { description: 'Closed set.', type: 'enum', values: ['ok', 'warn'] },
        }),
      },
    },
    { extend: catalogData },
  );
  if (!created.ok) {
    throw new Error(`fixture catalog must register: ${created.issues[0]?.message ?? ''}`);
  }
  return created.catalog;
}

describe('openai-strict stays within the documented provider subset', () => {
  it.each([
    ['the built-in catalog', (): Catalog => catalogData],
    ['a registered catalog using every constraint', everyConstraintCatalog],
  ])('S20 measures %s inside every documented keyword and size limit', (_name, catalogOf) => {
    const derivation = uiSpecJsonSchema(catalogOf(), { target: 'openai-strict' });
    expect(derivation.ok).toBe(true);
    const document = derivation.ok ? derivation.artifact : {};
    const measured = measure(document);

    expect(
      [...measured.keywords].filter(
        (keyword) => !(OPENAI_STRICT.supportedKeywords as readonly string[]).includes(keyword),
      ),
    ).toEqual([]);
    expect(
      [...measured.formats].filter(
        (format) => !(OPENAI_STRICT.stringFormats as readonly string[]).includes(format),
      ),
    ).toEqual([]);
    // "Root objects must not be anyOf and must be an object".
    expect(document['type']).toBe('object');
    expect(document).not.toHaveProperty('anyOf');
    // "additionalProperties: false must always be set in objects";
    // "all fields must be required".
    expect(measured.openObjects).toBe(0);
    expect(measured.partiallyRequiredObjects).toBe(0);
    expect(measured.properties).toBeLessThanOrEqual(OPENAI_STRICT.maxProperties);
    expect(measured.nesting).toBeLessThanOrEqual(OPENAI_STRICT.maxNesting);
    expect(measured.nameAndValueChars).toBeLessThanOrEqual(OPENAI_STRICT.maxNameAndValueChars);
    expect(measured.enumValues).toBeLessThanOrEqual(OPENAI_STRICT.maxEnumValues);
    expect(measured.oversizedEnums).toBe(0);
  });

  it('S20 the measuring stick itself sees an unsupported keyword and an open object', () => {
    // Guards the guard: a walker that visited nothing would pass every limit.
    const measured = measure({
      $defs: { leaf: { minLength: 1, type: 'string' } },
      properties: { nested: { properties: { deep: { type: 'string' } }, type: 'object' } },
      required: [],
      type: 'object',
    });
    expect(measured.keywords.has('minLength')).toBe(true);
    expect(measured.openObjects).toBe(2);
    expect(measured.partiallyRequiredObjects).toBe(2);
    expect(measured.nesting).toBe(3);
  });

  it('S15 fails derivation when one enum breaks the large-enum character limit', () => {
    const values = Array.from(
      { length: OPENAI_STRICT.largeEnum.values + 1 },
      (_, index) => `value-${String(index).padStart(4, '0')}-${'x'.repeat(60)}`,
    );
    const synthetic: Catalog = {
      catalogSchemaVersion: catalogData.catalogSchemaVersion,
      components: {
        'acme-wide': probeEntry('acme-wide', {
          mode: { description: 'One very wide enum.', type: 'enum', values },
        }) as Catalog['components'][string],
      },
    };
    expect(stringLength(values)).toBeGreaterThan(OPENAI_STRICT.largeEnum.chars);
    expect(stringLength(values)).toBeLessThan(OPENAI_STRICT.maxNameAndValueChars);

    const derivation = uiSpecJsonSchema(synthetic, { target: 'openai-strict' });
    expect(derivation.ok).toBe(false);
    const issue = derivation.ok ? undefined : derivation.issues[0];
    expect(issue?.code).toBe('provider-limit');
    expect(issue?.value).toBe('acme-wide');
    expect(issue?.message).toContain('"mode"');
    expect(issue?.message).toContain(String(OPENAI_STRICT.largeEnum.chars));
    // The default dialect has no such limit.
    expect(uiSpecJsonSchema(synthetic).ok).toBe(true);
  });
});
