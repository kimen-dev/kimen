import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TextEncoder } from 'node:util';

import { describe, expect, it, onTestFinished } from 'vitest';

import {
  canonicalJson,
  canonicalJsonSha256,
  readJsonFile,
  sha256,
  sha256File,
  writeCanonicalJsonFile,
} from '../lib/canonical-json.mjs';

// @spec:018-project-integrity-hardening

describe('canonical mutation boundary', () => {
  it('S3 sorts nested object keys while preserving array order and one final line feed', () => {
    expect(canonicalJson({ z: [3, { b: 2, a: 1 }], a: true })).toBe(
      '{\n  "a": true,\n  "z": [\n    3,\n    {\n      "a": 1,\n      "b": 2\n    }\n  ]\n}\n',
    );
  });

  it('S3 rejects non-finite, non-JSON and cyclic values', () => {
    const cyclic = {};
    cyclic.self = cyclic;

    expect(() => canonicalJson(Number.NaN)).toThrow(/numbers must be finite/);
    expect(() => canonicalJson(undefined)).toThrow(/undefined is not JSON data/);
    expect(() => canonicalJson(new Date())).toThrow(/only plain objects/);
    expect(() => canonicalJson(cyclic)).toThrow(/circular reference/);
  });

  it('S3 rejects sparse arrays and named array properties', () => {
    const sparse = [];
    sparse.length = 1;
    const named = [];
    named.extra = true;

    expect(() => canonicalJson(sparse)).toThrow(/sparse arrays/);
    expect(() => canonicalJson(named)).toThrow(/named or symbol properties/);
  });

  it('S3 hashes UTF-8 text, bytes and canonical objects deterministically', () => {
    const digest = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

    expect(sha256('abc')).toBe(digest);
    expect(sha256(new TextEncoder().encode('abc'))).toBe(digest);
    expect(canonicalJsonSha256({ b: 2, a: 1 })).toBe(sha256('{\n  "a": 1,\n  "b": 2\n}\n'));
    expect(() => sha256(123)).toThrow(/string or Uint8Array/);
  });

  it('S3 hashes files without erasing byte-level distinctions', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kimen-mutation-canonical-'));
    onTestFinished(() => rm(root, { recursive: true, force: true }));
    const withoutLineFeed = join(root, 'without-lf.txt');
    const withLineFeed = join(root, 'with-lf.txt');
    await writeFile(withoutLineFeed, 'same', 'utf8');
    await writeFile(withLineFeed, 'same\n', 'utf8');

    expect(await sha256File(withoutLineFeed)).not.toBe(await sha256File(withLineFeed));
  });

  it('S3 writes canonical files, creates parents and reads the same public value', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kimen-mutation-canonical-'));
    onTestFinished(() => rm(root, { recursive: true, force: true }));
    const file = join(root, 'nested', 'manifest.json');
    const value = { version: 1, packages: ['elements', 'tokens'] };

    await writeCanonicalJsonFile(file, value);

    expect(await readJsonFile(file)).toEqual(value);
    expect(await readFile(file, 'utf8')).toBe(canonicalJson(value));
    await expect(readJsonFile(join(root, 'missing.json'))).rejects.toThrow(/Cannot read JSON file/);
  });
});
