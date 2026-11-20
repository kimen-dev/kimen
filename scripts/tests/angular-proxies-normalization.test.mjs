import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

test('one Angular proxy can declare two native kebab-case events', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'kimen-angular-proxies-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const normalizer = join(root, 'packages/elements/scripts/normalize-angular-proxies.mjs');
  const proxies = join(root, 'packages/angular/src/directives/proxies.ts');
  mkdirSync(dirname(normalizer), { recursive: true });
  mkdirSync(dirname(proxies), { recursive: true });
  copyFileSync(
    new URL('../../packages/elements/scripts/normalize-angular-proxies.mjs', import.meta.url),
    normalizer,
  );

  writeFileSync(
    proxies,
    `import { Component, Output, EventEmitter } from '@angular/core';
import type { Components } from '@kimen/elements/components';
import type { KiTableCustomEvent } from '@kimen/elements/components';
@Component({
  selector: 'ki-table',
  outputs: ['ki-sort', 'ki-selection-change'],
})
export class KiTable {
  @Output() kiSort = new EventEmitter<KiTableCustomEvent<unknown>>();
  @Output() kiSelectionChange = new EventEmitter<KiTableCustomEvent<unknown>>();
}
export declare interface KiTable extends Components.KiTable {
  'ki-sort': EventEmitter<KiTableCustomEvent<unknown>>;
  'ki-selection-change': EventEmitter<KiTableCustomEvent<unknown>>;
}
`,
  );
  const result = spawnSync(process.execPath, [normalizer], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  const normalized = readFileSync(proxies, 'utf8');
  assert.match(normalized, /selector: 'ki-table'/u);
  assert.match(normalized, /extends Components\.KiTable/u);
  assert.doesNotMatch(normalized, /@Output|EventEmitter|outputs:|KiTableCustomEvent/u);
});
