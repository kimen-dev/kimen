// @spec:034-framework-wrappers
// Packaging correctness (S12): publint over the packed React and Vue
// wrappers, and Angular Package Format shape assertions for the Angular
// library (fesm + types + partial-Ivy declare markers + framework peer
// ranges). Mechanical, per Art. IX.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = join(__dirname, '../../..');

function publint(packageDirectory: string): string {
  return execFileSync('pnpm', ['exec', 'publint', '--strict', packageDirectory], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

describe('wrapper packaging', () => {
  it('S12 passes publint for the React and Vue wrappers with their peer ranges', () => {
    expect(publint('packages/react')).toContain('All good');
    expect(publint('packages/vue')).toContain('All good');

    const react = JSON.parse(
      readFileSync(join(repoRoot, 'packages/react/package.json'), 'utf8'),
    ) as { peerDependencies?: Record<string, string> };
    expect(react.peerDependencies?.['react']).toBe('^18 || ^19');
    expect(react.peerDependencies?.['react-dom']).toBe('^18 || ^19');

    const vue = JSON.parse(readFileSync(join(repoRoot, 'packages/vue/package.json'), 'utf8')) as {
      peerDependencies?: Record<string, string>;
      peerDependenciesMeta?: Record<string, { optional?: boolean }>;
    };
    expect(vue.peerDependencies?.['vue']).toBe('>=3.4.38');
    expect(vue.peerDependencies?.['vue-router']).toBe('>=4.5.0');
    expect(vue.peerDependenciesMeta?.['vue-router']?.optional).toBe(true);
  });

  it('S12 ships the Angular wrapper in Angular Package Format with its peer ranges', () => {
    const dist = join(repoRoot, 'packages/angular/dist');
    expect(existsSync(join(dist, 'fesm2022'))).toBe(true);

    const manifest = JSON.parse(readFileSync(join(dist, 'package.json'), 'utf8')) as {
      module?: string;
      typings?: string;
      exports?: Record<string, unknown>;
      sideEffects?: boolean;
      peerDependencies?: Record<string, string>;
    };
    expect(manifest.module).toBeDefined();
    expect(manifest.typings).toBeDefined();
    expect(existsSync(join(dist, manifest.typings ?? ''))).toBe(true);
    expect(manifest.exports?.['.']).toBeDefined();
    expect(manifest.sideEffects).toBe(false);
    expect(manifest.peerDependencies?.['@angular/core']).toMatch(/\^22/);
    expect(manifest.peerDependencies?.['@angular/forms']).toMatch(/\^22/);

    const fesm = readFileSync(join(dist, 'fesm2022/kimen-angular.mjs'), 'utf8');
    expect(fesm).toContain('ɵɵngDeclare');
  });
});
