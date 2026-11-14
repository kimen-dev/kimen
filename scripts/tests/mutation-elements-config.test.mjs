import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createVitest } from 'vitest/node';

test('elements mutation discovers the pure-logic node specs and the real-browser behavior specs', async (t) => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const vitest = await createVitest('test', {
    root,
    config: 'vitest.mutation.elements.config.ts',
    watch: false,
  });
  t.after(() => vitest.close());
  const specs = await vitest.globTestSpecifications();
  const files = specs.map((spec) => spec.moduleId.slice(root.length));

  for (const helperSpec of [
    'ki-tooltip/ki-tooltip.position.spec.ts',
    'ki-dialog/ki-dialog.backdrop.spec.ts',
    'ki-radio-group/ki-radio-group.keyboard.spec.ts',
    'ki-qr/qr-encoder.spec.ts',
  ]) {
    assert.ok(
      files.includes(`packages/elements/src/components/${helperSpec}`),
      `${helperSpec}: pure-logic specs must remain in mutation`,
    );
  }
  assert.equal(
    files.some((file) => file.endsWith('.spec.tsx')),
    false,
    'no component spec runs outside a real browser',
  );
  for (const component of ['ki-tooltip', 'ki-dialog', 'ki-radio-group', 'ki-qr']) {
    assert.ok(
      files.includes(`packages/elements/browser-tests/${component}.browser.spec.ts`),
      `${component}: browser interactions must participate in mutation`,
    );
  }
});
