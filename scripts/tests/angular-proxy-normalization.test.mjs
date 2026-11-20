import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const normalizer = new URL(
  '../../packages/elements/scripts/normalize-angular-proxies.mjs',
  import.meta.url,
);

function normalize(t, metadata) {
  const root = mkdtempSync(join(tmpdir(), 'kimen-angular-proxies-'));
  t.after(() => rmSync(root, { force: true, recursive: true }));
  const scripts = join(root, 'packages/elements/scripts');
  const directives = join(root, 'packages/angular/src/directives');
  mkdirSync(scripts, { recursive: true });
  mkdirSync(directives, { recursive: true });
  const script = join(scripts, 'normalize-angular-proxies.mjs');
  const proxies = join(directives, 'proxies.ts');
  copyFileSync(normalizer, script);
  writeFileSync(
    proxies,
    `import { Component, Output, EventEmitter } from '@angular/core';
@Component({
  outputs: [${metadata}],
})
export class Example {
  @Output() kiInput = new EventEmitter<CustomEvent<string>>();
  @Output() kiSearch = new EventEmitter<CustomEvent<string>>();
}
export declare interface Example {
  'ki-input': EventEmitter<CustomEvent<string>>;
  'ki-search': EventEmitter<CustomEvent<string>>;
}
`,
  );
  return {
    result: spawnSync(process.execPath, [script], { encoding: 'utf8' }),
    source: readFileSync(proxies, 'utf8'),
  };
}

test('normalizes multiple native events in one Angular outputs declaration', (t) => {
  const { result, source } = normalize(t, "'ki-input', 'ki-search'");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /removed 2 broken output surfaces/u);
  assert.doesNotMatch(source, /outputs:|@Output|EventEmitter/u);
  assert.match(source, /import \{ Component \}/u);
});

test('still rejects mismatched Angular output metadata and fields', (t) => {
  const { result, source } = normalize(t, "'ki-input'");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /inconsistent upstream event shape/u);
  assert.match(source, /@Output/u);
});
