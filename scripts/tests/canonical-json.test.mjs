import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  canonicalJson,
  canonicalJsonSha256,
  readJsonFile,
  sha256,
  sha256File,
  writeCanonicalJsonFile,
} from '../lib/canonical-json.mjs';

test('canonical JSON sorts object keys recursively and preserves array order', () => {
  const value = {
    z: [3, 1, { b: 2, a: 1 }],
    a: { d: 4, c: 3 },
  };

  assert.equal(
    canonicalJson(value),
    `${[
      '{',
      '  "a": {',
      '    "c": 3,',
      '    "d": 4',
      '  },',
      '  "z": [',
      '    3,',
      '    1,',
      '    {',
      '      "a": 1,',
      '      "b": 2',
      '    }',
      '  ]',
      '}',
    ].join('\n')}\n`,
  );
});

test('insertion order does not change canonical bytes or digest', () => {
  const first = { z: { b: 2, a: 1 }, a: true };
  const second = { a: true, z: { a: 1, b: 2 } };

  assert.equal(canonicalJson(first), canonicalJson(second));
  assert.equal(canonicalJsonSha256(first), canonicalJsonSha256(second));
});

test('SHA-256 hashes UTF-8 bytes with a lowercase hexadecimal digest', () => {
  assert.equal(sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('file hashing preserves byte-level distinctions', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'kimen-canonical-json-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const withoutLineFeed = join(root, 'without-lf.txt');
  const withLineFeed = join(root, 'with-lf.txt');
  await writeFile(withoutLineFeed, 'same', 'utf8');
  await writeFile(withLineFeed, 'same\n', 'utf8');

  assert.notEqual(await sha256File(withoutLineFeed), await sha256File(withLineFeed));
});

test('canonical files round-trip and create missing parent directories', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'kimen-canonical-json-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const file = join(root, 'nested', 'manifest.json');
  const value = { version: 1, packages: ['elements', 'tokens'] };

  await writeCanonicalJsonFile(file, value);

  assert.deepEqual(await readJsonFile(file), value);
  assert.equal(await readFile(file, 'utf8'), canonicalJson(value));
});

test('invalid or non-JSON data fails closed', () => {
  const circular = {};
  circular.self = circular;

  for (const invalid of [undefined, Number.NaN, 1n, circular, new Date()]) {
    assert.throws(() => canonicalJson(invalid), TypeError);
  }
  assert.throws(() => canonicalJson({ nested: undefined }), TypeError);
});
