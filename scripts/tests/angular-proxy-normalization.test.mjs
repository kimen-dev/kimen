import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('normalizes each kebab-case output when one directive declares multiple events', (t) => {
  const fixture = mkdtempSync(join(tmpdir(), 'kimen-angular-proxies-'));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  const scripts = join(fixture, 'elements/scripts');
  const directives = join(fixture, 'angular/src/directives');
  mkdirSync(scripts, { recursive: true });
  mkdirSync(directives, { recursive: true });
  const normalizer = join(scripts, 'normalize-angular-proxies.mjs');
  copyFileSync(
    new URL('../../packages/elements/scripts/normalize-angular-proxies.mjs', import.meta.url),
    normalizer,
  );
  const proxies = join(directives, 'proxies.ts');
  writeFileSync(
    proxies,
    [
      "import { Component, Output, EventEmitter } from '@angular/core';",
      "import type { CopyEvent } from '@kimen/elements/components';",
      '@Component({',
      "  selector: 'ki-copy-button',",
      "  outputs: ['ki-copy', 'ki-copy-error'],",
      '})',
      'export class KiCopyButton {',
      '  @Output() kiCopy = new EventEmitter<CopyEvent<{ value: string }>>();',
      '  @Output() kiCopyError = new EventEmitter<CopyEvent<void>>();',
      '}',
      'export declare interface KiCopyButton {',
      "  'ki-copy': EventEmitter<CopyEvent<{ value: string }>>;",
      "  'ki-copy-error': EventEmitter<CopyEvent<void>>;",
      '}',
      '',
    ].join('\n'),
  );

  const result = spawnSync(process.execPath, [normalizer], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  const source = readFileSync(proxies, 'utf8');
  assert.doesNotMatch(source, /@Output|EventEmitter|outputs:|CopyEvent/u);
  assert.match(source, /selector: 'ki-copy-button'/u);
});
