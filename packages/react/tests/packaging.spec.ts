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
  it('S12 passes publint for the React and Vue wrappers', () => {
    expect(publint('packages/react')).toContain('All good');
    expect(publint('packages/vue')).toContain('All good');
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
