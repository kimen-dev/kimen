import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { normalizeAngularProxies } from '../../packages/elements/scripts/normalize-angular-proxies.mjs';

const raw = `import { Component, EventEmitter, Output } from '@angular/core';
import type { Components } from '@kimen/elements/components';
import type { ChipEvent } from '@kimen/elements/components';
@Component({
  outputs: ['ki-change', 'ki-remove', 'ki-activate'],
})
class Chip {
  @Output() kiChange = new EventEmitter<ChipEvent>();
  @Output() kiRemove = new EventEmitter<ChipEvent>();
  @Output() kiActivate = new EventEmitter<ChipEvent>();
}
interface Chip extends Components.KiChip {
  'ki-change': EventEmitter<ChipEvent>;
  'ki-remove': EventEmitter<ChipEvent>;
  'ki-activate': EventEmitter<ChipEvent>;
}
`;

test('Angular strips all events from a proxy with a shared outputs list', () => {
  const { source } = normalizeAngularProxies(raw);
  assert.doesNotMatch(source, /outputs:|@Output|EventEmitter|ChipEvent/u);
  assert.match(source, /import type \{ Components \}/u);
  assert.equal(normalizeAngularProxies(source).source, source);
});

test('Angular rejects mismatched event metadata', () => {
  assert.throws(
    () => normalizeAngularProxies(raw.replace(", 'ki-activate'", '')),
    /3 @Output, 2 outputs metadata, 3 interface fields/u,
  );
});

test('Angular strips unquoted native event fields and their attached documentation', () => {
  const audio = `import { Component, EventEmitter, Output } from '@angular/core';
import type { Components } from '@kimen/elements/components';
import type { KiAudioCustomEvent } from '@kimen/elements/components';
@Component({
  outputs: ['play', 'timeupdate'],
})
class KiAudio {
  @Output() play = new EventEmitter<KiAudioCustomEvent<void>>();
  @Output() timeupdate = new EventEmitter<KiAudioCustomEvent<void>>();
}
export declare interface KiAudio extends Components.KiAudio {
  /** Title of the recording. */
  title: string;
  /**
   * Forwarded when playback starts.
   */
  play: EventEmitter<KiAudioCustomEvent<void>>;
  timeupdate: EventEmitter<KiAudioCustomEvent<void>>;
}
`;

  const { source, orphanCount } = normalizeAngularProxies(audio);

  assert.equal(orphanCount, 2);
  assert.doesNotMatch(source, /outputs:|@Output|EventEmitter|KiAudioCustomEvent|Forwarded/u);
  assert.match(source, /\/\*\* Title of the recording\. \*\/\n {2}title: string;/u);
});

test('normalizes each kebab-case output when one directive declares multiple events', (t) => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'kimen-angular-proxies-')));
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
