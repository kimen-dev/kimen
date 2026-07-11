import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  augmentDirectDeclaration,
  renderDirectTypeExports,
  syncComponentTypes,
} from '../../packages/elements/scripts/sync-components.mjs';

// @spec:018-project-integrity-hardening

const component = {
  tag: 'ki-alert',
  className: 'KiAlert',
  moduleExports: { values: ['KiAlert'], types: ['KiAlertTone', 'KiAlertSize'] },
};
const rootContract = {
  values: [],
  namedTypes: [
    {
      name: 'KiAlertPlacement',
      from: './components/ki-alert/ki-alert.placement.js',
      replacement: '@kimen/elements/ki-alert',
    },
    {
      name: 'KiAlertTone',
      from: './components/ki-alert/ki-alert.js',
      replacement: '@kimen/elements/ki-alert',
    },
    {
      name: 'IgnoredType',
      from: './components/ki-other/ki-other.js',
      replacement: '@kimen/elements/ki-other',
    },
  ],
  typeStars: [],
};
const declaration = [
  'import type { Components } from "../types/components";',
  '',
  'interface KiAlert extends Components.KiAlert, HTMLElement {}',
  'export const KiAlert: { prototype: KiAlert; new (): KiAlert };',
  '',
].join('\n');

async function createSyncWorkspace({ inventory = [component], contract = rootContract } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'elements-build-sync-'));
  const gateDir = resolve(root, 'scripts/gates');
  const distDir = resolve(root, 'packages/elements/dist/components');
  await Promise.all([mkdir(gateDir, { recursive: true }), mkdir(distDir, { recursive: true })]);
  await writeFile(
    resolve(gateDir, 'check-component-inventory.mjs'),
    `process.stdout.write(${JSON.stringify(JSON.stringify({ inventory, rootContract: contract }))});\n`,
  );
  await Promise.all([
    writeFile(resolve(distDir, 'ki-alert.d.ts'), declaration),
    writeFile(resolve(distDir, 'ki-alert.js'), 'export const defineCustomElement = () => {};\n'),
  ]);
  return { root, distDir };
}

describe('direct component declaration mutation boundary', () => {
  it('renders sorted direct type exports from module and compatible root aliases', () => {
    expect(renderDirectTypeExports(component, rootContract)).toBe(
      [
        '// <kimen:direct-types>',
        "export type { KiAlertPlacement } from '../types/components/ki-alert/ki-alert.placement.js';",
        "export type { KiAlertSize } from '../types/components/ki-alert/ki-alert.js';",
        "export type { KiAlertTone } from '../types/components/ki-alert/ki-alert.js';",
        '// </kimen:direct-types>',
        '',
      ].join('\n'),
    );
  });

  it('rejects conflicting sources for the same direct type name', () => {
    expect(() =>
      renderDirectTypeExports(component, {
        ...rootContract,
        namedTypes: [
          {
            name: 'KiAlertTone',
            from: './components/ki-alert/ki-alert.other.js',
            replacement: '@kimen/elements/ki-alert',
          },
        ],
      }),
    ).toThrow('Conflicting direct type source for KiAlertTone');
  });

  it('exports the generated interface and replaces the owned direct-types block idempotently', () => {
    const first = augmentDirectDeclaration(declaration, component, rootContract);
    const stale = first.replace('KiAlertPlacement', 'StaleType');
    const second = augmentDirectDeclaration(stale, component, rootContract);

    expect(first).toContain('export interface KiAlert extends Components.KiAlert');
    expect(second).toBe(first);
    expect(augmentDirectDeclaration(second, component, rootContract)).toBe(second);
  });

  it('escapes regular-expression characters in generated class names', () => {
    const unusualComponent = {
      tag: 'ki-unusual',
      className: 'KiAlert[Legacy]',
      moduleExports: { values: [], types: [] },
    };
    const unusualSource =
      'interface KiAlert[Legacy] extends Components.KiAlertLegacy, HTMLElement {}\n';

    expect(augmentDirectDeclaration(unusualSource, unusualComponent, rootContract)).toContain(
      'export interface KiAlert[Legacy] extends Components.KiAlertLegacy',
    );
  });

  it.each([
    [{ ...component, className: undefined }],
    [{ ...component, className: '' }],
    [{ ...component, className: '   ' }],
  ])('rejects a missing component class name %#', (invalidComponent) => {
    expect(() => augmentDirectDeclaration(declaration, invalidComponent, rootContract)).toThrow(
      'Missing component class name for ki-alert',
    );
  });

  it('requires exactly one generated component interface', () => {
    expect(() =>
      augmentDirectDeclaration('export const KiAlert = {};\n', component, rootContract),
    ).toThrow('ki-alert declaration must contain exactly one generated KiAlert interface');
    expect(() =>
      augmentDirectDeclaration(`${declaration}${declaration}`, component, rootContract),
    ).toThrow('ki-alert declaration must contain exactly one generated KiAlert interface');
  });

  it.each([
    [`${declaration}// <kimen:direct-types>\nstale\n`, 'start-only'],
    [`${declaration}// </kimen:direct-types>\n`, 'end-only'],
  ])('rejects a malformed generated block: %s', (source) => {
    expect(() => augmentDirectDeclaration(source, component, rootContract)).toThrow(
      'Malformed generated direct-types block',
    );
  });

  it('synchronizes declaration files, returns the inventory count and remains idempotent', async () => {
    const { root, distDir } = await createSyncWorkspace();
    try {
      expect(await syncComponentTypes({ workspaceRoot: root })).toBe(1);
      const first = await readFile(resolve(distDir, 'ki-alert.d.ts'), 'utf8');
      expect(first).toContain('export interface KiAlert extends Components.KiAlert');
      expect(first).toContain('export type { KiAlertPlacement }');

      expect(await syncComponentTypes({ workspaceRoot: root })).toBe(1);
      expect(await readFile(resolve(distDir, 'ki-alert.d.ts'), 'utf8')).toBe(first);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('fails when a required generated runtime surface is not a file', async () => {
    const { root, distDir } = await createSyncWorkspace();
    try {
      await rm(resolve(distDir, 'ki-alert.js'));
      await mkdir(resolve(distDir, 'ki-alert.js'));

      await expect(syncComponentTypes({ workspaceRoot: root })).rejects.toThrow(
        `Expected generated file: ${resolve(distDir, 'ki-alert.js')}`,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('fails closed when the component-inventory contract cannot be loaded', async () => {
    const root = await mkdtemp(join(tmpdir(), 'elements-build-sync-gate-'));
    try {
      const gateDir = resolve(root, 'scripts/gates');
      await mkdir(gateDir, { recursive: true });
      await writeFile(
        resolve(gateDir, 'check-component-inventory.mjs'),
        "process.stderr.write('contract unavailable'); process.exit(3);\n",
      );

      await expect(syncComponentTypes({ workspaceRoot: root })).rejects.toThrow(
        'Component inventory gate failed: contract unavailable',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
