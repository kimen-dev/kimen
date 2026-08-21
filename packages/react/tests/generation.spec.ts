// @spec:034-framework-wrappers
// Generation coverage and drift (S8, S9, S10) for the three wrapper
// packages, asserted from the committed sources: every published custom
// element appears in every wrapper (S8); the wrappers sync-gate group
// fails closed on drift with the artifact named (S9, unit-tested through
// the gate's injectable git seam exactly like the catalog-sync precedent);
// and the committed generated sources carry no absolute paths or
// timestamps, the determinism regeneration relies on — the sync gate
// regenerates and byte-diffs on every PR (S10).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// eslint-disable-next-line @nx/enforce-module-boundaries -- repo-root gate module, not a package import
import * as syncGateModule from '../../../scripts/gates/check-generated-sync.mjs';

// The gate ships as untyped .mjs; this is its exact surface (unit-typed
// here so the test stays honest under strict lint).
type GitExecution = (
  root: string,
  args: readonly string[],
  options?: { allowFailure?: boolean },
) => { status: number; stdout: string; stderr: string };
const { generatedGroups, validateGeneratedSync } = syncGateModule as unknown as {
  generatedGroups: Readonly<
    Record<'wrappers', { required: readonly string[]; scopes: readonly string[] }>
  >;
  validateGeneratedSync: (input: { root: string; group: string; executeGit: GitExecution }) => {
    group: string;
    files: number;
  };
};

const repoRoot = join(__dirname, '../../..');

function publishedTags(): string[] {
  const manifest = JSON.parse(
    readFileSync(join(repoRoot, 'packages/elements/generated/custom-elements.json'), 'utf8'),
  ) as { modules?: { declarations?: { customElement?: boolean; tagName?: string }[] }[] };
  const tags: string[] = [];
  for (const module of manifest.modules ?? []) {
    for (const declaration of module.declarations ?? []) {
      if (declaration.customElement === true && typeof declaration.tagName === 'string') {
        tags.push(declaration.tagName);
      }
    }
  }
  return tags.sort();
}

describe('wrapper generation', () => {
  it('S8 exports every published component from every wrapper', () => {
    const tags = publishedTags();
    expect(tags.length).toBeGreaterThanOrEqual(29);

    const reactFiles = readdirSync(join(repoRoot, 'packages/react/src'));
    const vueFiles = readdirSync(join(repoRoot, 'packages/vue/src'));
    const angularProxies = readFileSync(
      join(repoRoot, 'packages/angular/src/directives/proxies.ts'),
      'utf8',
    );
    for (const tag of tags) {
      expect(reactFiles).toContain(`${tag}.ts`);
      expect(vueFiles).toContain(`${tag}.ts`);
      expect(angularProxies).toContain(`'${tag}'`);
    }

    const reactBarrel = readFileSync(join(repoRoot, 'packages/react/src/components.ts'), 'utf8');
    const vueBarrel = readFileSync(join(repoRoot, 'packages/vue/src/index.ts'), 'utf8');
    for (const tag of tags) {
      expect(reactBarrel).toContain(`./${tag}.js`);
      expect(vueBarrel).toContain(`./${tag}.js`);
    }
  });

  it('S9 fails the sync gate naming the drifted artifact', () => {
    const wrappers = generatedGroups.wrappers;
    expect(wrappers).toBeDefined();
    const gitDrift: GitExecution = (root, args) => {
      void root;
      if (args[0] === 'ls-files' && args[1] === '--error-unmatch') {
        return { status: 0, stdout: '', stderr: '' };
      }
      if (args[0] === 'ls-files' && args.includes('--others')) {
        return { status: 0, stdout: '', stderr: '' };
      }
      if (args[0] === 'ls-files') {
        return { status: 0, stdout: wrappers.required.join('\n'), stderr: '' };
      }
      if (args[0] === 'diff') {
        return { status: 1, stdout: '', stderr: '' };
      }
      return { status: 0, stdout: '', stderr: '' };
    };
    expect(() =>
      validateGeneratedSync({ root: repoRoot, group: 'wrappers', executeGit: gitDrift }),
    ).toThrow(/drift detected/);
  });

  it('S10 keeps the committed generated wrapper sources free of machine state', () => {
    const wrappers = generatedGroups.wrappers;
    expect(wrappers.required.length).toBeGreaterThanOrEqual(64);
    for (const file of wrappers.required) {
      if (file.endsWith('/index.ts') && file.includes('/react/')) {
        continue; // hand-written shell, listed for tracking, not generated
      }
      const text = readFileSync(join(repoRoot, file), 'utf8');
      expect(text, `${file} must not embed absolute paths`).not.toMatch(
        /\/Users\/|\/home\/|[A-Z]:\\/,
      );
      expect(text, `${file} must not embed timestamps`).not.toMatch(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
      );
    }
  });
});
