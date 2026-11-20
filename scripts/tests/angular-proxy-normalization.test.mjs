import assert from 'node:assert/strict';
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
