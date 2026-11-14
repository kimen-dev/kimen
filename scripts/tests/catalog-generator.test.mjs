// @spec:027-runtime-catalog
// The catalog generator derives every declared prop limit from the manifest
// and nothing else: a limit the manifest states malformed is a generation
// failure, never a silently wider guardrail (FR-002, FR-016, FR-017).
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCatalog } from '../../packages/catalog/scripts/generate-catalog.mjs';

const manifestWith = (attributes) => ({
  modules: [
    {
      declarations: [
        {
          attributes,
          customElement: true,
          description: 'A probe.',
          tagName: 'ki-probe',
          whenNotToUse: 'Never.',
          whenToUse: 'Only in this test.',
        },
      ],
    },
  ],
});

const propsOf = (attributes) => {
  const source = buildCatalog(manifestWith(attributes), { elementsVersion: '0.0.0' });
  const json = source.slice(source.indexOf('{'), source.lastIndexOf('}') + 1);
  return JSON.parse(json).components['ki-probe'].props;
};

test('S15 a required manifest attribute becomes a required constraint and nothing else does', () => {
  const props = propsOf([
    { name: 'label', required: true, type: { text: 'string' } },
    { name: 'hint', type: { text: 'string | undefined' } },
  ]);
  assert.equal(props.label.required, true);
  assert.equal(Object.hasOwn(props.hint, 'required'), false);
});

test('S17 numeric bounds on a number attribute become minimum and maximum', () => {
  const props = propsOf([
    { maximum: 20, minimum: 0, name: 'count', type: { text: 'number | undefined' } },
    { name: 'rows', type: { text: 'number' } },
  ]);
  assert.deepEqual([props.count.minimum, props.count.maximum], [0, 20]);
  assert.equal(Object.hasOwn(props.rows, 'minimum'), false);
  assert.equal(Object.hasOwn(props.rows, 'maximum'), false);
});

test('S17 a malformed bound fails generation naming the attribute', () => {
  for (const attribute of [
    { maximum: 20, name: 'label', type: { text: 'string' } },
    { maximum: '20', name: 'count', type: { text: 'number' } },
    { maximum: 1, minimum: 2, name: 'count', type: { text: 'number' } },
  ]) {
    assert.throws(
      () => buildCatalog(manifestWith([attribute]), { elementsVersion: '0.0.0' }),
      new RegExp(`ki-probe\\.${attribute.name}: .*bound`, 'u'),
    );
  }
});
