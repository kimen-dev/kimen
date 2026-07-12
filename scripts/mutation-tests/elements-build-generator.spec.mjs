import { createRequire } from 'node:module';

import { afterEach, describe, expect, it, vi } from 'vitest';

// @spec:018-project-integrity-hardening

const require = createRequire(import.meta.url);
const pluginRequire = createRequire(
  new URL('../../tools/kimen-plugin/package.json', import.meta.url),
);
const { logger } = pluginRequire('@nx/devkit');
const { createTreeWithEmptyWorkspace } = pluginRequire('@nx/devkit/testing');
const componentGenerator = require('../../tools/kimen-plugin/src/generators/component/generator.js');

const tag = 'ki-avatar-card2';
const feature = '018-project-integrity-hardening';
const componentRoot = `packages/elements/src/components/${tag}`;
const browserSpec = `packages/elements/browser-tests/${tag}.browser.spec.ts`;
const tokenSource = 'packages/tokens/tokens/component/avatar-card2.tokens.json';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('component generator mutation boundary', () => {
  it.each([
    undefined,
    '',
    'button',
    'Ki-button',
    'ki-Button',
    'ki-',
    'ki-1button',
    'ki-a--b',
    'ki-a_b',
    'ki-a-',
    'ki-a b',
  ])('rejects an invalid custom-element tag before generating files: %#', async (name) => {
    const tree = createTreeWithEmptyWorkspace();

    await expect(componentGenerator(tree, { name, spec: feature })).rejects.toThrow(
      `Component tag must match ki-<lowercase> (got "${name}")`,
    );
    expect(tree.children('packages/elements/src/components')).toEqual([]);
  });

  it('scaffolds source, browser and token surfaces with exact substitutions', async () => {
    const tree = createTreeWithEmptyWorkspace();

    await componentGenerator(tree, { name: tag, spec: feature });

    expect(tree.read(`${componentRoot}/${tag}.tsx`, 'utf8')).toContain(
      'export class KiAvatarCard2',
    );
    expect(tree.read(`${componentRoot}/${tag}.css`, 'utf8')).toContain(
      'var(--ki-avatar-card2-text-color)',
    );
    expect(tree.read(`${componentRoot}/${tag}.spec.tsx`, 'utf8')).toContain(
      '// @spec:018-project-integrity-hardening',
    );
    expect(tree.read(browserSpec, 'utf8')).toContain(
      "import { defineCustomElement } from '../dist/components/ki-avatar-card2.js';",
    );
    expect(tree.read(browserSpec, 'utf8')).toContain('type KiAvatarCard2Element');
    expect(JSON.parse(tree.read(tokenSource, 'utf8'))).toEqual({
      ki: {
        'avatar-card2': {
          'text-color': {
            $type: 'color',
            $value: '{ki.text.base}',
            $description: 'Text color used by the ki-avatar-card2 component.',
          },
        },
      },
    });
  });

  it('uses the constitutional TODO marker when no approved feature is supplied', async () => {
    const tree = createTreeWithEmptyWorkspace();

    await componentGenerator(tree, { name: 'ki-avatar' });

    expect(
      tree.read('packages/elements/src/components/ki-avatar/ki-avatar.spec.tsx', 'utf8'),
    ).toContain(
      '// TODO(spec): add &#39;// @spec:&lt;feature-dir&gt;&#39; when the approved feature exists (Art. II).',
    );
  });

  it('rejects an existing component without overwriting any generated content', async () => {
    const tree = createTreeWithEmptyWorkspace();
    await componentGenerator(tree, { name: tag, spec: feature });
    const originalSource = tree.read(`${componentRoot}/${tag}.tsx`, 'utf8');
    tree.write(`${componentRoot}/owner-note.txt`, 'preserve me');

    await expect(componentGenerator(tree, { name: tag, spec: feature })).rejects.toThrow(
      `${componentRoot} already exists: components are never overwritten`,
    );
    expect(tree.read(`${componentRoot}/${tag}.tsx`, 'utf8')).toBe(originalSource);
    expect(tree.read(`${componentRoot}/owner-note.txt`, 'utf8')).toBe('preserve me');
  });

  it('returns an explicit three-step handoff for the generated component', async () => {
    const tree = createTreeWithEmptyWorkspace();
    const info = vi.spyOn(logger, 'info').mockImplementation(() => undefined);

    const handoff = await componentGenerator(tree, { name: tag, spec: feature });
    handoff();

    expect(info).toHaveBeenCalledTimes(4);
    expect(info).toHaveBeenNthCalledWith(1, 'Component ki-avatar-card2 scaffolded. Next steps:');
    expect(info).toHaveBeenNthCalledWith(
      2,
      '  1. pnpm exec nx run @kimen/elements:build && pnpm run format  (derives direct exports, budgets and machine surfaces, then formats them)',
    );
    expect(info).toHaveBeenNthCalledWith(
      3,
      '  2. Replace every TODO(spec) with content from the APPROVED spec (Art. II: no behavior without a spec).',
    );
    expect(info).toHaveBeenNthCalledWith(4, '  3. bash scripts/gates/gates-suite.sh');
  });
});
