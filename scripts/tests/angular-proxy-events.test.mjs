import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('Angular normalization removes both events from one proxy metadata line', (context) => {
  const fixture = mkdtempSync(join(tmpdir(), 'kimen-angular-proxy-'));
  context.after(() => rmSync(fixture, { recursive: true, force: true }));
  const scripts = join(fixture, 'elements', 'scripts');
  const directives = join(fixture, 'angular', 'src', 'directives');
  mkdirSync(scripts, { recursive: true });
  mkdirSync(directives, { recursive: true });
  const script = join(scripts, 'normalize-angular-proxies.mjs');
  const proxies = join(directives, 'proxies.ts');
  copyFileSync(
    new URL('../../packages/elements/scripts/normalize-angular-proxies.mjs', import.meta.url),
    script,
  );
  writeFileSync(
    proxies,
    `import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  inputs: ['page'],
  outputs: ['ki-page-change', 'ki-load-more'],
})
export class KiPagination {
  @Output() kiPageChange = new EventEmitter<KiPaginationCustomEvent<{ page: number }>>();
  @Output() kiLoadMore = new EventEmitter<KiPaginationCustomEvent<void>>();
}

import type { KiPaginationCustomEvent } from '@kimen/elements/components';

export declare interface KiPagination extends Components.KiPagination {
  'ki-page-change': EventEmitter<KiPaginationCustomEvent<{ page: number }>>;
  'ki-load-more': EventEmitter<KiPaginationCustomEvent<void>>;
}
`,
  );

  const normalized = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.equal(normalized.status, 0, normalized.stderr);
  const output = readFileSync(proxies, 'utf8');
  assert.doesNotMatch(output, /@Output|EventEmitter|outputs:|KiPaginationCustomEvent/u);
  assert.match(output, /inputs: \['page'\]/u);
});
