// @spec:170-emitter-strict-collection
import { catalogData, validateUiSpec } from '@kimen/catalog';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

import { normalizeEmission, uiSpecJsonSchema, uiSpecTool } from '../src/index.js';

const options = {
  collect: { save: ['customerName', 'region', 'notes'], preview: ['region'] },
  components: ['ki-button'] as const,
  target: 'openai-strict' as const,
};
const fields = { customerName: 'f-name', region: 'f-region', notes: 'f-notes' };
const nullProps = Object.fromEntries(
  Object.entries(catalogData.components['ki-button'].props).map(([name]) => [name, null]),
);
const slots = Object.fromEntries(
  Object.keys(catalogData.components['ki-button'].slots).map((name) => [
    name,
    name === '' ? ['Save'] : [],
  ]),
);

function lower(derivationOptions = options) {
  const result = uiSpecJsonSchema(catalogData, derivationOptions);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.artifact;
}

const button = (action: unknown, collect: unknown) => ({
  actions: ['save', 'preview', 'export'],
  root: {
    action,
    collect,
    component: 'ki-button',
    id: null,
    props: nullProps,
    slots,
  },
  version: 1,
});

describe('strict collection declarations', () => {
  it('S1 gives the tool the strict schema and allows the exact keys of each bound action', () => {
    const schema = lower();
    const tool = uiSpecTool(catalogData, options);
    expect(tool).toMatchObject({ ok: true, artifact: { inputSchema: schema } });
    const validate = new Ajv2020({ strict: false }).compile(schema);
    expect(validate(button('save', fields)), JSON.stringify(validate.errors)).toBe(true);
    expect(validate(button('preview', { region: 'f-region' }))).toBe(true);
  });

  it.each([
    ['preview', fields],
    ['export', { region: 'f-region' }],
    ['save', { customerName: 'f-name', region: 'f-region' }],
    ['save', { ...fields, destination: 'f-url' }],
    ['preview', { region: 'https://example.com/receive' }],
    [{ 'ki-change': 'save' }, fields],
    [null, { region: 'f-region' }],
  ])('S2 rejects %j with collection %j', (binding, collect) => {
    const validate = new Ajv2020({ strict: false }).compile(lower());
    expect(validate(button(binding, collect))).toBe(false);
  });

  it('S3 accepts a null map and normalization keeps the binding while dropping only the placeholder', () => {
    const emitted = button('save', null);
    expect(new Ajv2020({ strict: false }).compile(lower())(emitted)).toBe(true);
    const normalized = normalizeEmission(emitted) as { root: Record<string, unknown> };
    expect(normalized.root['action']).toBe('save');
    expect(normalized.root).not.toHaveProperty('collect');
    expect(normalizeEmission(button('save', fields))).toMatchObject({ root: { collect: fields } });
  });

  it('S4 still rejects a collecting action absent from the spec declarations', () => {
    const normalized = normalizeEmission({
      actions: ['preview'],
      root: {
        component: 'ki-card',
        slots: {
          '': [
            { component: 'ki-input', id: 'f-name', props: { label: 'Name' } },
            { component: 'ki-input', id: 'f-region', props: { label: 'Region' } },
            { component: 'ki-textarea', id: 'f-notes', props: { label: 'Notes' } },
            button('save', fields).root,
          ],
        },
      },
      version: 1,
    });
    expect(validateUiSpec(normalized)).toMatchObject({
      ok: false,
      issues: [expect.objectContaining({ code: 'undeclared-action', value: 'save' })],
    });
  });

  it('S6 keeps the existing strict schema when no keys are supplied', () => {
    const base = { components: options.components, target: options.target };
    const schema = uiSpecJsonSchema(catalogData, base);
    expect(uiSpecJsonSchema(catalogData, { ...base, collect: {} })).toEqual(schema);
    expect(JSON.stringify(schema)).not.toContain('"collect"');
  });

  it('S2 excludes colliding keys and leaves collection guidance for other targets intact', () => {
    const components = ['ki-button', 'ki-input', 'p'];
    const collect = { save: ['name'] };
    const options = { components, collect, target: 'openai-strict' } as const;
    const strict = uiSpecJsonSchema(catalogData, options);
    expect(strict.ok).toBe(true);
    expect(JSON.stringify(strict)).not.toContain('"collect"');

    expect(uiSpecJsonSchema(catalogData, { components, collect })).toEqual(
      uiSpecJsonSchema(catalogData, { components }),
    );
  });

  it('S1 counts additional strict branches against the provider property budget', () => {
    const collect = Object.fromEntries(
      Array.from({ length: 200 }, (_, index) => [`save-${String(index)}`, ['customerName']]),
    );
    const result = uiSpecJsonSchema(catalogData, { ...options, collect });
    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'provider-limit',
        value: 'ki-button',
        message: expect.stringContaining('properties limit') as unknown,
      }),
    );
  });

  it.each(['constructor', '__proto__', 'prototype'])('S7 rejects the forbidden key %s', (key) => {
    expect(uiSpecJsonSchema(catalogData, { ...options, collect: { save: [key] } })).toEqual({
      ok: false,
      issues: [
        expect.objectContaining({
          code: 'invalid-option',
          path: 'options.collect.save',
          value: key,
        }),
      ],
    });
  });

  it.each(
    [
      null,
      [],
      { ' ': ['region'] },
      { save: [] },
      { save: [''] },
      {
        save: ['region', 'region'],
      },
      { save: Array.from({ length: 33 }, (_, n) => String(n)) },
    ].map((collect: unknown) => ({ collect })),
  )('S7 rejects malformed declarations $collect', ({ collect }) => {
    expect(
      uiSpecJsonSchema(catalogData, { ...options, collect: collect as typeof options.collect }),
    ).toMatchObject({ ok: false, issues: [expect.objectContaining({ code: 'invalid-option' })] });
  });
});
