// @spec:034-framework-wrappers
// Structural pin for the v-model wiring (S5-adjacent regression net): every
// form component's generated wrapper must carry its componentModels triple —
// a component silently missing from the stencil.config componentModels list
// would ship a wrapper without v-model (research D3 pitfall). Kept in node:
// the behavioral round trip runs in the browser suite.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const MODEL_TRIPLES: readonly (readonly [string, string, string])[] = [
  ['ki-input', 'value', 'input'],
  ['ki-textarea', 'value', 'input'],
  ['ki-checkbox', 'checked', 'change'],
  ['ki-switch', 'checked', 'change'],
  ['ki-select', 'value', 'change'],
  ['ki-radio-group', 'value', 'change'],
];

describe('vue v-model wiring', () => {
  it('S5 pins the model triple of every form component wrapper', () => {
    for (const [tag, targetAttr, event] of MODEL_TRIPLES) {
      const source = readFileSync(join(__dirname, `../src/${tag}.ts`), 'utf8');
      expect(source, `${tag} wrapper must bind ${targetAttr} on ${event}`).toContain(
        `'${targetAttr}', '${event}'`,
      );
    }
  });
});
