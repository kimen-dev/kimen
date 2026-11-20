// Regression: the component usage examples are the source of the published
// llms documents (packages/elements/llms/<tag>.md), which agents copy
// verbatim. A UI-spec example there that the validator rejects teaches every
// agent that reads it to emit a broken spec (ki-icon once wrote `"type"`
// instead of `"component"`; ki-code-block once wrote `lineNumbers` instead of
// the attribute name `line-numbers`). Every JSON block that looks like a spec
// must be a complete document that validates against the built-in catalog.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateUiSpec } from '../src/index.js';

const componentsRoot = join(import.meta.dirname, '../../elements/src/components');

interface Example {
  readonly file: string;
  readonly line: number;
  readonly value: unknown;
}

function* jsonBlocks(file: string): Generator<Example> {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/u);
  let start = -1;
  let body: string[] = [];
  for (const [index, line] of lines.entries()) {
    if (start < 0 && /^\s*```json\s*$/u.test(line)) {
      start = index + 1;
      body = [];
    } else if (start >= 0 && /^\s*```\s*$/u.test(line)) {
      let value: unknown;
      try {
        value = JSON.parse(body.join('\n'));
      } catch {
        value = undefined;
      }
      if (value !== undefined) {
        yield { file, line: start, value };
      }
      start = -1;
    } else if (start >= 0) {
      body.push(line);
    }
  }
}

function looksLikeSpec(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    'root' in record ||
    'component' in record ||
    (typeof record['type'] === 'string' && record['type'].startsWith('ki-'))
  );
}

const examples = readdirSync(componentsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(componentsRoot, entry.name, 'usage/examples.md'))
  .filter((file) => {
    try {
      readFileSync(file);
      return true;
    } catch {
      return false;
    }
  })
  .flatMap((file) => [...jsonBlocks(file)])
  .filter((example) => looksLikeSpec(example.value));

describe('UI-spec examples in component usage docs', () => {
  it('finds the spec examples it guards', () => {
    expect(examples.length).toBeGreaterThan(0);
  });

  it.each(examples.map((example) => [`${example.file}:${String(example.line)}`, example]))(
    '%s is a complete spec the validator accepts',
    (_, example) => {
      const report = validateUiSpec(example.value);
      expect(report.issues).toEqual([]);
      expect(report.ok).toBe(true);
    },
  );
});
