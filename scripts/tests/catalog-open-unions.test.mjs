// @spec:164-catalog-closed-open-unions
// FR-001: the generator closes a manifest's deliberately open union of string
// literals (`"a" | "b" | string & {}`) over its literals, so the built-in
// catalog never hands a model an open string where the component documents
// a fixed set of values.
import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTypeText } from '../../packages/catalog/scripts/generate-catalog.mjs';

test('164 FR-001 an open union of literals becomes a closed enum over its literals', () => {
  assert.deepEqual(
    parseTypeText('"danger" | "info" | "neutral" | "success" | "warning" | string & {}'),
    {
      type: 'enum',
      values: ['danger', 'info', 'neutral', 'success', 'warning'],
    },
  );
});

test('164 FR-001 an optional open union closes the same way', () => {
  assert.deepEqual(parseTypeText('"top-end" | "bottom-end" | string & {} | undefined'), {
    type: 'enum',
    values: ['top-end', 'bottom-end'],
  });
});

test('164 FR-001 a closed union is unchanged', () => {
  assert.deepEqual(parseTypeText('"danger" | "neutral"'), {
    type: 'enum',
    values: ['danger', 'neutral'],
  });
});

test('164 FR-001 a bare string stays an open string with no documented values', () => {
  assert.deepEqual(parseTypeText('string'), { type: 'string' });
});
