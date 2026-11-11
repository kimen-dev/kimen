import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createVitest } from 'vitest/node';

test('elements mutation discovers both diagnostic and real-browser behavior specs', async (t) => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const vitest = await createVitest('test', {
    root,
    config: 'vitest.mutation.elements.config.ts',
    watch: false,
  });
  t.after(() => vitest.close());
  const specs = await vitest.globTestSpecifications();
  const files = specs.map((spec) => spec.moduleId.slice(root.length));

  for (const component of ['ki-tooltip', 'ki-dialog', 'ki-radio-group', 'ki-qr']) {
    assert.ok(
      files.includes(`packages/elements/src/components/${component}/${component}.spec.tsx`),
      `${component}: diagnostic specs must remain in mutation`,
    );
    assert.ok(
      files.includes(`packages/elements/browser-tests/${component}.browser.spec.ts`),
      `${component}: browser interactions must participate in mutation`,
    );
  }
});
