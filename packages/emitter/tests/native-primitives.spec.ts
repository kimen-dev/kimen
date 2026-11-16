// @spec:037-native-primitives
// S21: the emitter describes each native primitive with exactly its declared
// attributes, never offers an action on one, and keeps img.alt required yet
// explicitly emptiable — under an independent JSON Schema oracle (ajv) and
// in the strict provider lowering.
import { catalogData, NATIVE_PRIMITIVE_TAGS } from '@kimen/catalog';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

import { catalogPrompt, type EmitterTarget, uiSpecJsonSchema } from '../src/index.js';

interface Branch {
  readonly properties: Record<
    string,
    { readonly properties?: Record<string, unknown>; readonly required?: readonly string[] }
  >;
  readonly required: readonly string[];
}

function derive(target: EmitterTarget = 'draft-2020-12') {
  const derivation = uiSpecJsonSchema(catalogData, { target });
  if (!derivation.ok) {
    throw new Error(`derivation must succeed: ${derivation.issues[0]?.message ?? ''}`);
  }
  return derivation.artifact as { readonly $defs: Record<string, Branch> } & Record<
    string,
    unknown
  >;
}

describe('037 — agents learn the primitives from the emitter', () => {
  it.each(['draft-2020-12', 'openai-strict'] as const)(
    'S21 the %s schema offers one branch per native element with exactly its declared props and no action',
    (target) => {
      const schema = derive(target);
      for (const tag of NATIVE_PRIMITIVE_TAGS) {
        const branch = schema.$defs[tag];
        expect(branch, tag).toBeDefined();
        const entry = catalogData.components[tag as keyof typeof catalogData.components];
        const declared = Object.keys(entry.props).sort();
        expect(Object.keys(branch?.properties['props']?.properties ?? {}).sort()).toEqual(declared);
        expect(Object.hasOwn(branch?.properties ?? {}, 'action')).toBe(false);
        expect(branch?.required ?? []).not.toContain('action');
      }
    },
  );

  it('S21 the image branch requires src and alt and accepts an empty alt', () => {
    const schema = derive();
    const alt = schema.$defs['img']?.properties['props'] as {
      readonly properties: Record<string, Record<string, unknown>>;
      readonly required: readonly string[];
    };
    expect([...alt.required].sort()).toEqual(['alt', 'src']);
    expect(alt.properties['alt']).not.toHaveProperty('pattern');
    const validate = new Ajv2020({ allErrors: false, strict: false }).compile(schema);
    const image = (props: Record<string, unknown>) => ({
      actions: [],
      root: { component: 'div', slots: { '': [{ component: 'img', props }] } },
      version: 1,
    });
    expect(validate(image({ alt: '', src: '/img/deco.png' }))).toBe(true);
    expect(validate(image({ alt: 'Gráfico de ventas', src: '/img/ventas.png' }))).toBe(true);
    expect(validate(image({ src: '/img/ventas.png' }))).toBe(false);
    expect(validate(image({ alt: '', onerror: 'alert(1)', src: '/a.png' }))).toBe(false);
    expect(
      validate({ actions: ['abrir'], root: { action: 'abrir', component: 'p' }, version: 1 }),
    ).toBe(false);
    const strictAlt =
      derive('openai-strict').$defs['img']?.properties['props']?.properties?.['alt'];
    expect(strictAlt).toEqual(expect.objectContaining({ type: 'string' }));
    expect(strictAlt).not.toHaveProperty('pattern');
  });

  it('S21 the prompt lists the native elements, says they never bind an action and that alt may be empty', () => {
    const prompt = catalogPrompt(catalogData);
    expect(prompt.ok).toBe(true);
    if (!prompt.ok) {
      return;
    }
    for (const tag of NATIVE_PRIMITIVE_TAGS) {
      expect(prompt.artifact).toContain(`### <${tag}>`);
    }
    expect(prompt.artifact).toMatch(/`alt` \(string, required, may be empty\)/u);
    // The generic rule must not contradict the emptiable alt (review finding).
    expect(prompt.artifact).toContain('non-blank value unless marked "may be empty"');
    const imgBlock = prompt.artifact.slice(prompt.artifact.indexOf('### <img>'));
    expect(imgBlock.slice(0, imgBlock.indexOf('\n###'))).toContain('never binds an action');
  });
});
