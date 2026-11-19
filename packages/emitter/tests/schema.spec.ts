// @spec:033-emitter-kit
// Schema derivation (S1-S5, S10-S12, S15-S19): the catalog-specialized JSON
// Schema behaves under an independent oracle (ajv, draft 2020-12) exactly
// as the contract promises, deterministically, with provider lowerings
// structurally verified and never silently truncated.

import type { Catalog } from '@kimen/catalog';
import { catalogData, validateUiSpec } from '@kimen/catalog';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { catalogPrompt, type EmitterTarget, uiSpecJsonSchema } from '../src/index.js';

function compile(artifact: Record<string, unknown>) {
  const ajv = new Ajv2020({ allErrors: false, strict: false });
  return ajv.compile(artifact);
}

function deriveOrThrow(catalog: Catalog, options?: Parameters<typeof uiSpecJsonSchema>[1]) {
  const derivation = uiSpecJsonSchema(catalog, options);
  if (!derivation.ok) {
    throw new Error(`derivation must succeed: ${derivation.issues[0]?.message ?? ''}`);
  }
  return derivation.artifact;
}

describe('uiSpecJsonSchema', () => {
  it('S1 accepts a valid spec under an independent JSON Schema validator', () => {
    const validate = compile(deriveOrThrow(catalogData));
    const accepted = validate({
      actions: [],
      root: {
        component: 'ki-card',
        slots: {
          '': [{ component: 'ki-badge', props: { tone: 'info' }, slots: { '': ['3 items'] } }],
        },
      },
      version: 1,
    });
    expect(validate.errors ?? []).toEqual([]);
    expect(accepted).toBe(true);
  });

  it('S2 rejects an out-of-catalog component', () => {
    const validate = compile(deriveOrThrow(catalogData));
    const accepted = validate({
      root: { component: 'acme-invoice-table' },
      version: 1,
    });
    expect(accepted).toBe(false);
  });

  it('S3 surfaces enum props as closed enums', () => {
    const artifact = deriveOrThrow(catalogData);
    const defs = artifact['$defs'] as Record<string, Record<string, unknown>>;
    const badge = defs['ki-badge'] as {
      properties: { props: { properties: { tone: { enum?: readonly string[] } } } };
    };
    expect(badge.properties.props.properties.tone.enum).toEqual(
      catalogData.components['ki-badge'].props.tone.values,
    );

    const validate = compile(artifact);
    const accepted = validate({
      root: { component: 'ki-badge', props: { tone: 'sparkly' } },
      version: 1,
    });
    expect(accepted).toBe(false);
  });

  it.each([
    ['ki-button', 'S18'],
    ['ki-icon-button', 'S17'],
  ] as const)('%s %s only offers recommended variants to agents', (component) => {
    const artifact = deriveOrThrow(catalogData, { components: [component] });
    const defs = artifact['$defs'] as Record<
      string,
      { properties: { props: { properties: { variant: { enum: readonly string[] } } } } }
    >;
    expect(defs[component]?.properties.props.properties.variant.enum).toEqual([
      'ghost',
      'primary',
      'quaternary',
      'secondary',
    ]);
    const prompt = catalogPrompt(catalogData, { components: [component] });
    expect(prompt.ok && prompt.artifact).toContain(
      '- `variant` (enum: "ghost" | "primary" | "quaternary" | "secondary")',
    );
  });

  it('S4 refuses a component subset outside the catalog', () => {
    const derivation = uiSpecJsonSchema(catalogData, {
      components: ['ki-card', 'acme-invoice-table'],
    });
    expect(derivation.ok).toBe(false);
    if (!derivation.ok) {
      const issue = derivation.issues[0];
      expect(issue?.code).toBe('unknown-component');
      expect(issue?.value).toBe('acme-invoice-table');
    }
  });

  it('S10 embeds the catalog schema version in the artifact', () => {
    const artifact = deriveOrThrow(catalogData);
    expect(artifact['$id']).toContain(catalogData.catalogSchemaVersion);
  });

  it('S11 derives byte-identical artifacts for the same catalog', () => {
    const first = deriveOrThrow(catalogData);
    const second = deriveOrThrow(catalogData);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it('S5 lowers to closed all-required objects under openai-strict', () => {
    const artifact = deriveOrThrow(catalogData, { target: 'openai-strict' });
    let objects = 0;
    const walk = (value: unknown): void => {
      if (Array.isArray(value)) {
        for (const child of value) {
          walk(child);
        }
        return;
      }
      if (value === null || typeof value !== 'object') {
        return;
      }
      const record = value as Record<string, unknown>;
      if (record['type'] === 'object' && typeof record['properties'] === 'object') {
        objects += 1;
        expect(record['additionalProperties']).toBe(false);
        const propertyNames = Object.keys(record['properties'] as Record<string, unknown>).sort();
        const required = record['required'] as string[] | undefined;
        expect([...(required ?? [])].sort()).toEqual(propertyNames);
      }
      for (const child of Object.values(record)) {
        walk(child);
      }
    };
    walk(artifact);
    expect(objects).toBeGreaterThan(0);

    const validate = compile(artifact);
    const accepted = validate({
      actions: [],
      root: {
        action: null,
        component: 'ki-badge',
        id: null,
        props: { size: null, tone: 'info' },
        slots: { '': ['3 items'] },
      },
      version: 1,
    });
    expect(validate.errors ?? []).toEqual([]);
    expect(accepted).toBe(true);
  });

  it('S15 fails derivation naming the offender when a catalog exceeds a provider limit', () => {
    const hugeValues = Array.from({ length: 600 }, (_, index) => `value-${String(index)}`);
    const entry = (tag: string) => ({
      description: 'Synthetic limit probe.',
      events: {},
      props: {
        mode: {
          description: 'Synthetic enum.',
          type: 'enum' as const,
          values: hugeValues,
        },
      },
      slots: {},
      tag,
      whenNotToUse: 'Never in production.',
      whenToUse: 'Only in this test.',
    });
    const synthetic: Catalog = {
      catalogSchemaVersion: catalogData.catalogSchemaVersion,
      components: {
        'acme-limit-a': entry('acme-limit-a'),
        'acme-limit-b': entry('acme-limit-b'),
      },
    };
    const derivation = uiSpecJsonSchema(synthetic, { target: 'openai-strict' });
    expect(derivation.ok).toBe(false);
    if (!derivation.ok) {
      const issue = derivation.issues[0];
      expect(issue?.code).toBe('provider-limit');
      expect(issue?.message).toContain('enumValues');
      expect(issue?.message).toContain('acme-limit');
    }
  });

  it('S16 requires the props the catalog declares required, in the default dialect', () => {
    const validate = compile(deriveOrThrow(catalogData));
    const spec = (node: Record<string, unknown>) => ({ root: node, version: 1 });
    expect(validate(spec({ component: 'ki-textarea' }))).toBe(false);
    expect(validate(spec({ component: 'ki-textarea', props: {} }))).toBe(false);
    expect(validate(spec({ component: 'ki-textarea', props: { rows: 3 } }))).toBe(false);
    // A blank value names nothing: the boundary rejects it, so the schema does too.
    expect(validate(spec({ component: 'ki-textarea', props: { label: ' ' } }))).toBe(false);
    expect(validate(spec({ component: 'ki-textarea', props: { label: 'Notes' } }))).toBe(true);
    // A component without required props keeps its props container optional.
    expect(validate(spec({ component: 'ki-badge' }))).toBe(true);
  });

  it('S16 makes required props non-nullable under openai-strict', () => {
    const validate = compile(
      deriveOrThrow(catalogData, { components: ['ki-textarea'], target: 'openai-strict' }),
    );
    const placeholders = Object.fromEntries(
      Object.keys(catalogData.components['ki-textarea'].props).map((name) => [name, null]),
    );
    const node = (label: unknown) => ({
      actions: [],
      root: {
        action: null,
        component: 'ki-textarea',
        id: null,
        props: { ...placeholders, label },
      },
      version: 1,
    });
    expect(validate(node(null))).toBe(false);
    expect(validate(node('Notes'))).toBe(true);
  });

  it.each(['draft-2020-12', 'openai-strict'] as const)(
    'S17 carries the declared numeric bounds under %s',
    (target) => {
      const artifact = deriveOrThrow(catalogData, { components: ['ki-indicator'], target });
      const validate = compile(artifact);
      const spec = (count: number) => ({
        actions: [],
        root: {
          action: target === 'draft-2020-12' ? undefined : null,
          component: 'ki-indicator',
          id: target === 'draft-2020-12' ? undefined : null,
          props: { count, current: 1, label: 'Slide position' },
        },
        version: 1,
      });
      expect(validate(JSON.parse(JSON.stringify(spec(21))))).toBe(false);
      expect(validate(JSON.parse(JSON.stringify(spec(-1))))).toBe(false);
      expect(validate(JSON.parse(JSON.stringify(spec(20))))).toBe(true);
    },
  );

  it('S19 admits stable node ids in the boundary grammar and rejects any other id', () => {
    const validate = compile(deriveOrThrow(catalogData));
    const spec = (rootId: unknown, childId: unknown) => ({
      root: {
        component: 'ki-card',
        id: rootId,
        slots: { '': [{ component: 'ki-badge', id: childId, slots: { '': ['3 items'] } }] },
      },
      version: 1,
    });
    const accepted = spec('order-card', 'items_badge-2');
    expect(validate(accepted)).toBe(true);
    expect(validateUiSpec(accepted).issues).toEqual([]);
    for (const bad of ['Order Card', '-card', '', 'x'.repeat(65), 7]) {
      expect(validate(spec(bad, 'ok')), String(bad)).toBe(false);
      expect(validate(spec('ok', bad)), String(bad)).toBe(false);
    }
    // No id at all stays valid: ids are optional.
    expect(validate({ root: { component: 'ki-card' }, version: 1 })).toBe(true);
  });

  it('S19 makes the id a nullable required property under openai-strict', () => {
    const validate = compile(
      deriveOrThrow(catalogData, { components: ['ki-badge'], target: 'openai-strict' }),
    );
    const root = { action: null, component: 'ki-badge', props: { size: null, tone: null } };
    const spec = (node: Record<string, unknown>) => ({
      actions: [],
      root: { ...node, slots: { '': [] } },
      version: 1,
    });
    expect(validate(spec({ ...root, id: null }))).toBe(true);
    expect(validate(spec({ ...root, id: 'status-1' }))).toBe(true);
    expect(validate(spec({ ...root, id: 'Status 1' }))).toBe(false);
    expect(validate(spec(root))).toBe(false);
  });

  it('S4 collapses duplicate subset tags instead of duplicating branches (review regression)', () => {
    const artifact = deriveOrThrow(catalogData, { components: ['ki-badge', 'ki-badge'] });
    const defs = artifact['$defs'] as Record<string, { anyOf?: readonly unknown[] }>;
    expect(defs['node']?.anyOf).toHaveLength(1);
  });

  it('S12 rejects malformed catalog entries with a coded issue instead of throwing (review regression)', () => {
    const withNullEntry: Catalog = {
      catalogSchemaVersion: catalogData.catalogSchemaVersion,
      components: { 'ki-x': null } as unknown as Catalog['components'],
    };
    const nullEntry = uiSpecJsonSchema(withNullEntry);
    expect(nullEntry.ok).toBe(false);
    expect(!nullEntry.ok && nullEntry.issues[0]?.code).toBe('malformed-catalog');
    expect(!nullEntry.ok && nullEntry.issues[0]?.value).toBe('ki-x');

    const arrayComponents = uiSpecJsonSchema({
      catalogSchemaVersion: catalogData.catalogSchemaVersion,
      components: ['fake'] as unknown as Catalog['components'],
    });
    expect(arrayComponents.ok).toBe(false);
    expect(!arrayComponents.ok && arrayComponents.issues[0]?.code).toBe('malformed-catalog');
  });

  it('constrains action names to non-empty strings, matching the validator (review regression)', () => {
    // The authoritative Zod uses z.string().min(1); an empty action string is
    // schema-expressible, so the derived schema must reject it too.
    const validate = compile(deriveOrThrow(catalogData));
    expect(validate({ actions: [''], root: { component: 'ki-badge' }, version: 1 })).toBe(false);
    expect(validate({ actions: [], root: { action: '', component: 'ki-badge' }, version: 1 })).toBe(
      false,
    );
    // The strict target states the same rule with a keyword it supports.
    const strict = compile(
      deriveOrThrow(catalogData, { components: ['ki-badge'], target: 'openai-strict' }),
    );
    const node = (action: string | null) => ({
      action,
      component: 'ki-badge',
      id: null,
      props: { size: null, tone: null },
      slots: { '': [] },
    });
    expect(strict({ actions: [''], root: node(null), version: 1 })).toBe(false);
    expect(strict({ actions: ['confirm'], root: node(''), version: 1 })).toBe(false);
    expect(strict({ actions: ['confirm'], root: node('confirm'), version: 1 })).toBe(true);
  });

  it('refuses the removed anthropic-strict target like any unknown target', () => {
    // Removed on purpose (FR-003): the profile could not meet the provider's
    // documented limits. A caller still passing it must fail closed, never
    // receive a schema for another target.
    const derivation = uiSpecJsonSchema(catalogData, {
      target: 'anthropic-strict' as unknown as EmitterTarget,
    });
    expect(derivation.ok).toBe(false);
    expect(!derivation.ok && derivation.issues[0]?.code).toBe('invalid-option');
    expect(!derivation.ok && derivation.issues[0]?.value).toBe('anthropic-strict');
  });

  it('derives a distinct $id per target and per component subset (review regression)', () => {
    const draft = deriveOrThrow(catalogData);
    const openai = deriveOrThrow(catalogData, { target: 'openai-strict' });
    const subset = deriveOrThrow(catalogData, { components: ['ki-badge'] });
    expect(draft['$id']).not.toBe(openai['$id']);
    expect(draft['$id']).not.toBe(subset['$id']);
    expect(openai['$id']).not.toBe(subset['$id']);
    // still carries the catalog schema version (S10 contract).
    expect(String(draft['$id'])).toContain(catalogData.catalogSchemaVersion);
  });

  it('rejects an unrecognized schema target with a named invalid-option issue (review regression)', () => {
    const derivation = uiSpecJsonSchema(catalogData, {
      target: 'openai_strict' as unknown as EmitterTarget,
    });
    expect(derivation.ok).toBe(false);
    if (!derivation.ok) {
      expect(derivation.issues[0]?.code).toBe('invalid-option');
      expect(derivation.issues[0]?.path).toBe('options.target');
    }
  });

  it('names the true worst contributor per limit, not by enum count (review regression)', () => {
    const probe = (tag: string, values: readonly string[]) => ({
      description: 'Synthetic probe.',
      events: {},
      props: { mode: { description: '', type: 'enum' as const, values: [...values] } },
      slots: {},
      tag,
      whenNotToUse: 'Never.',
      whenToUse: 'Only in this test.',
    });
    // acme-short: many short enum values (high enum COUNT, low char total).
    // acme-long: one enormous enum value (low count, dominates char total).
    // The nameAndEnumChars overflow is caused by acme-long; the old enum-count
    // heuristic would misname acme-short.
    const synthetic: Catalog = {
      catalogSchemaVersion: catalogData.catalogSchemaVersion,
      components: {
        'acme-long': probe('acme-long', ['x'.repeat(200_000)]),
        'acme-short': probe(
          'acme-short',
          Array.from({ length: 400 }, (_, index) => `v${String(index)}`),
        ),
      },
    };
    const derivation = uiSpecJsonSchema(synthetic, { target: 'openai-strict' });
    expect(derivation.ok).toBe(false);
    if (!derivation.ok) {
      const chars = derivation.issues.find((issue) => issue.message.includes('nameAndEnumChars'));
      expect(chars?.value).toBe('acme-long');
    }
  });

  it('S15 counts container and top-level properties against the strict limit (review regression)', () => {
    const components: Record<string, unknown> = {};
    for (let index = 0; index < 1000; index += 1) {
      const tag = `acme-w${String(index)}`;
      components[tag] = {
        description: 'Synthetic tally probe.',
        events: {},
        props: { mode: { description: 'One prop.', type: 'string' } },
        slots: { '': 'One slot.' },
        tag,
        whenNotToUse: 'Never in production.',
        whenToUse: 'Only in this test.',
      };
    }
    const synthetic = {
      catalogSchemaVersion: catalogData.catalogSchemaVersion,
      components,
    } as unknown as Catalog;
    const derivation = uiSpecJsonSchema(synthetic, { target: 'openai-strict' });
    expect(derivation.ok).toBe(false);
    if (!derivation.ok) {
      expect(derivation.issues.some((issue) => issue.message.includes('properties'))).toBe(true);
    }
  });

  it('returns a fail-closed invalid-option issue for a non-array components subset, never throwing (review regression)', () => {
    for (const bad of [null, 42, 'ki-button', {}]) {
      const derivation = uiSpecJsonSchema(catalogData, {
        components: bad as unknown as readonly string[],
      });
      expect(derivation.ok).toBe(false);
      expect(!derivation.ok && derivation.issues.some((i) => i.code === 'invalid-option')).toBe(
        true,
      );
    }
  });

  it('S12 refuses a version-skewed catalog naming both versions', () => {
    const skewed: Catalog = { ...catalogData, catalogSchemaVersion: '0.9.9' };
    const derivation = uiSpecJsonSchema(skewed);
    expect(derivation.ok).toBe(false);
    if (!derivation.ok) {
      const issue = derivation.issues[0];
      expect(issue?.code).toBe('unsupported-version');
      expect(issue?.message).toContain('0.9.9');
      expect(issue?.message).toContain(catalogData.catalogSchemaVersion);
    }
  });
});
