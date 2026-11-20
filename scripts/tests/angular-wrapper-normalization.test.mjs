import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

const script = new URL(
  '../../packages/elements/scripts/normalize-angular-proxies.mjs',
  import.meta.url,
);
const proxy = `import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'ki-file-upload',
  outputs: ['ki-files-add', 'ki-file-remove', 'ki-file-cancel'],
})
export class KiFileUpload {
  @Output() kiFilesAdd = new EventEmitter<CustomEvent>();
  @Output() kiFileRemove = new EventEmitter<CustomEvent>();
  @Output() kiFileCancel = new EventEmitter<CustomEvent>();
}

export declare interface KiFileUpload {
  'ki-files-add': EventEmitter<CustomEvent>;
  'ki-file-remove': EventEmitter<CustomEvent>;
  'ki-file-cancel': EventEmitter<CustomEvent>;
}
`;

test('Angular normalizer counts every event in one directive metadata array', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'kimen-angular-normalization-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const normalizer = join(root, 'packages/elements/scripts/normalize-angular-proxies.mjs');
  const fixture = join(root, 'packages/angular/src/directives/proxies.ts');
  mkdirSync(dirname(normalizer), { recursive: true });
  mkdirSync(dirname(fixture), { recursive: true });
  copyFileSync(script, normalizer);
  writeFileSync(fixture, proxy);

  const result = spawnSync(process.execPath, [normalizer], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(readFileSync(fixture, 'utf8'), /@Output|EventEmitter|outputs:/u);
});
