import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeReactWrapper } from '../../packages/elements/scripts/normalize-react-wrappers.mjs';

test('React wrapper event type imports resolve through the generated component declarations', () => {
  const input = [
    "import type { Components } from '@kimen/elements/components';",
    'import type { KiExampleCustomEvent,',
    "  ExampleDetail } from '@kimen/elements';",
    "import { defineCustomElement } from '@kimen/elements/components/ki-example.js';",
  ].join('\n');

  assert.equal(
    normalizeReactWrapper(input, 'ki-example.ts'),
    input.replace("from '@kimen/elements';", "from '@kimen/elements/components';"),
  );
});

test('React wrapper generation rejects runtime imports from the frozen root', () => {
  assert.throws(
    () => normalizeReactWrapper('import { KiExample } from "@kimen/elements";', 'ki-example.ts'),
    /ki-example.ts.*runtime import/u,
  );
});
