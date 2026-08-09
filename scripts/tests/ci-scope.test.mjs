import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyChangedFiles } from '../gates/classify-ci-scope.mjs';
import { requiresBrowserVerification } from '../gates/dependency-browser-impact.mjs';

test('dependency metadata changes use the affected-project quality path', () => {
  assert.equal(
    classifyChangedFiles(['package.json', 'packages/elements/package.json', 'pnpm-lock.yaml']),
    'dependencies',
  );
});

test('sandbox lock maintenance delegates to the containment workflow', () => {
  assert.equal(
    classifyChangedFiles(['sandbox/package.json', 'sandbox/package-lock.json']),
    'sandbox',
  );
});

test('action digest maintenance validates workflows without installing the workspace', () => {
  assert.equal(
    classifyChangedFiles(['.github/workflows/ci.yml', '.github/workflows/security.yml']),
    'workflows',
  );
});

test('mixed dependency and action maintenance still uses dependency quality', () => {
  assert.equal(
    classifyChangedFiles([
      '.github/workflows/ci.yml',
      'packages/catalog/package.json',
      'pnpm-lock.yaml',
    ]),
    'dependencies',
  );
});

test('source or CI implementation changes retain the full quality suite', () => {
  assert.equal(
    classifyChangedFiles(['packages/elements/src/components/ki-card/ki-card.tsx']),
    'full',
  );
  assert.equal(
    classifyChangedFiles(['pnpm-lock.yaml', 'scripts/gates/gates-dependencies.sh']),
    'full',
  );
  assert.equal(classifyChangedFiles([]), 'full');
});

test('browser infrastructure dependencies retain Chromium verification', () => {
  assert.equal(requiresBrowserVerification(['playwright']), true);
  assert.equal(requiresBrowserVerification(['@stencil/core']), true);
  assert.equal(requiresBrowserVerification(['@vitest/browser-playwright']), true);
  assert.equal(requiresBrowserVerification(['typescript']), true);
});

test('unrelated dependency bumps avoid Chromium startup', () => {
  assert.equal(requiresBrowserVerification(['size-limit', 'zod', '@types/node']), false);
});
