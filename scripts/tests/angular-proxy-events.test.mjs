import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

const normalizer = new URL(
  '../../packages/elements/scripts/normalize-angular-proxies.mjs',
  import.meta.url,
);

function normalizeFixture(context, source) {
  const root = mkdtempSync(join(tmpdir(), 'kimen-angular-events-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));

  const script = join(root, 'packages/elements/scripts/normalize-angular-proxies.mjs');
  const proxies = join(root, 'packages/angular/src/directives/proxies.ts');
  mkdirSync(dirname(script), { recursive: true });
  mkdirSync(dirname(proxies), { recursive: true });
  copyFileSync(normalizer, script);
  writeFileSync(proxies, source);

  const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  return { ...result, source: readFileSync(proxies, 'utf8') };
}

test('a component with two generated events uses native Angular event bindings', (context) => {
  const result = normalizeFixture(
    context,
    `import { Component, Output, EventEmitter } from '@angular/core';
@Component({
  selector: 'ki-confirmation',
  outputs: ['ki-approve', 'ki-deny'],
})
export class KiConfirmation {
  @Output() kiApprove = new EventEmitter<KiConfirmationCustomEvent<{ remember: boolean }>>();
  @Output() kiDeny = new EventEmitter<KiConfirmationCustomEvent<void>>();
}
import type { KiConfirmationCustomEvent } from '@kimen/elements/components';
export declare interface KiConfirmation extends Components.KiConfirmation {
  'ki-approve': EventEmitter<KiConfirmationCustomEvent<{ remember: boolean }>>;
  'ki-deny': EventEmitter<KiConfirmationCustomEvent<void>>;
}
`,
  );

  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.source, /outputs:|@Output|EventEmitter|KiConfirmationCustomEvent/u);
  assert.match(result.source, /selector: 'ki-confirmation'/u);
});

test('normalization rejects inconsistent event names even when counts match', (context) => {
  const result = normalizeFixture(
    context,
    `@Component({
  outputs: ['ki-approve'],
})
export class KiConfirmation {
  @Output() kiApprove = new EventEmitter<KiConfirmationCustomEvent<void>>();
}
export declare interface KiConfirmation extends Components.KiConfirmation {
  'ki-deny': EventEmitter<KiConfirmationCustomEvent<void>>;
}
`,
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /inconsistent upstream event shape/u);
  assert.match(result.source, /@Output/u);
});
