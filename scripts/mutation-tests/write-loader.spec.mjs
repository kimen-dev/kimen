import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, onTestFinished } from 'vitest';

import { runtimeExportName, writeLoader } from '../../packages/elements/scripts/write-loader.mjs';

const components = [
  { tag: 'ki-button', className: 'KiButton', distModule: './dist/components/ki-button.js' },
  { tag: 'ki-card', className: 'KiCard', distModule: './dist/components/ki-card.js' },
];
const values = [{ name: 'KiButton', replacement: '@kimen/elements/ki-button' }];
const stencilTypes = 'export declare function setNonce(nonce: string): void;\n';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'kimen-write-loader-'));
  onTestFinished(() => rm(root, { force: true, recursive: true }));
  await mkdir(join(root, 'dist/components'), { recursive: true });
  await mkdir(join(root, 'loader'));
  const write = (target, contents) => writeFile(join(root, target), contents);
  await Promise.all([
    write('dist/components/index.js', 'export { q as setNonce } from "./stencil-client.js";\n'),
    write('dist/components/stencil-client.js', 'export function q() {}\n'),
    write('dist/components/ki-button.js', 'export class KiButton {}\n'),
    write('dist/components/ki-card.js', 'export class KiCard {}\n'),
    write('loader/index.d.ts', stencilTypes),
  ]);
  return {
    build: () => writeLoader({ packageRoot: root, components, values }),
    read: (target) => readFile(join(root, target), 'utf8'),
    remove: (target) => rm(join(root, target)),
  };
}

describe('write-loader', () => {
  it('takes the nonce binding from the Stencil runtime re-export', () => {
    const barrel = "export { a as getAssetPath, q as setNonce } from './stencil-client.js';";
    expect(runtimeExportName(barrel)).toBe('q');
  });

  it('refuses a nonce binding from a different module', () => {
    expect(() => runtimeExportName('export { q as setNonce } from "./other.js";')).toThrow(
      'does not re-export setNonce from ./stencil-client.js',
    );
  });

  it('accepts a runtime export with its public name', () => {
    expect(runtimeExportName('export {setNonce} from "./stencil-client.js";')).toBe('setNonce');
  });

  it('keeps the loader lazy, with one grouped entry per tag and an independent root facade', async () => {
    const { build, read } = await fixture();

    await build();

    const loader = await read('loader/index.js');
    expect(loader).toContain('"ki-button": () => import("./register/ki-button.js")');
    expect(loader).toContain('"ki-card": () => import("./register/ki-card.js")');
    expect(loader).toContain("import('../dist/components/stencil-client.js')");
    expect(loader).toContain('module.q(nonce)');
    expect(await read('loader/register/ki-button.js')).toContain(
      'export { KiButton as default } from "../../dist/components/ki-button.js";',
    );
    expect(await read('dist/index.js')).toContain(
      'export { KiButton } from "./components/ki-button.js";',
    );
    expect(await read('dist/index.js')).not.toContain('KiCard');
  });

  it('retains the Stencil declarations and declares observeRoot once on rebuild', async () => {
    const { build, read } = await fixture();

    await build();
    const first = await read('loader/index.d.ts');
    await build();

    expect(first).toContain(stencilTypes);
    expect(first).toContain('observeRoot(root: ShadowRoot | Element): Promise<void>');
    expect(await read('loader/index.d.ts')).toBe(first);
  });

  it('stops the build when Stencil omits an inventoried module', async () => {
    const { build, remove } = await fixture();
    await remove('dist/components/ki-card.js');

    await expect(build()).rejects.toThrow('ki-card.js');
  });
});
