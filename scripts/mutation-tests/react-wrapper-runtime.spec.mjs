import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { checkRuntimeImports } from '../../packages/react/scripts/check-runtime-imports.mjs';

describe('React published imports', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'kimen-react-imports-'));
    mkdirSync(join(root, 'dist', 'nested'), { recursive: true });
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({
        name: '@kimen/react',
        dependencies: { '@kimen/elements': '1.0.0' },
        peerDependencies: { react: '^18 || ^19' },
        devDependencies: { '@stencil/react-output-target': '1.8.1' },
      }),
    );
  });

  afterEach(() => rmSync(root, { force: true, recursive: true }));

  it('accepts dependency subpaths, peers and local modules', () => {
    writeFileSync(
      join(root, 'dist', 'ki-test.js'),
      `
      import { createElement } from 'react';
      import { Test } from '@kimen/elements/ki-test';
      export { Test } from './nested/test.js';
    `,
    );
    expect(() => checkRuntimeImports(root)).not.toThrow();
  });

  it.each([
    ['ki-test.js', "import '@lit/react'", '@lit/react'],
    [
      'nested/test.d.ts',
      "export type { EventName } from '@stencil/react-output-target/runtime'",
      '@stencil/react-output-target/runtime',
    ],
    ['ki-test.js', "export const load = () => import('react-dom/client')", 'react-dom/client'],
  ])('rejects a missing package in %s', (file, source, dependency) => {
    writeFileSync(join(root, 'dist', file), source);
    expect(() => checkRuntimeImports(root)).toThrow(
      `imports ${dependency}, which @kimen/react neither depends on nor peers`,
    );
  });
});
