import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { RUNTIME_CHUNK } from './component-chunk-names.mjs';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const components = join(packageRoot, 'dist/components');

async function files(directory: string, suffix: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return files(path, suffix);
      return Promise.resolve(entry.name.endsWith(suffix) ? [path] : []);
    }),
  );
  return nested.flat().sort();
}

const STENCIL_IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*)["']@stencil\/core(?:\/[^"']*)?["']/u;
// Code without its comments: Stencil's declarations show imports in examples.
const code = (text: string): string =>
  text.replaceAll(/\/\*[\s\S]*?\*\//gu, '').replaceAll(/^\s*\/\/.*$/gmu, '');

// What a consumer installs is the built package, so this asserts the build:
// the per-component modules carry Stencil's runtime, and nothing published
// needs the Stencil compiler installed beside it.
describe('the Stencil runtime of @kimen/elements', () => {
  it('is one chunk of the per-component build, which every component imports', async () => {
    const holders = [];
    for (const map of await files(components, '.js.map')) {
      const { sources } = JSON.parse(await readFile(map, 'utf8')) as { sources: string[] };
      if (sources.some((source) => source.endsWith('@stencil/core/internal/client/index.js'))) {
        holders.push(map.slice(components.length + 1, -'.map'.length));
      }
    }
    expect(holders).toEqual([RUNTIME_CHUNK]);

    const importers = [];
    for (const module of await files(components, '.js')) {
      const code = await readFile(module, 'utf8');
      if (code.includes(`from"./${RUNTIME_CHUNK}"`)) importers.push(module);
    }
    expect(importers.length).toBeGreaterThan(100);
  });

  it('leaves no published module importing @stencil/core, and the package depends on nothing', async () => {
    const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    expect(manifest.dependencies).toBeUndefined();

    const modules = [
      ...(await files(components, '.js')),
      ...(await files(join(packageRoot, 'dist/esm'), '.js')),
      ...(await files(join(packageRoot, 'loader'), '.js')),
      join(packageRoot, 'dist/index.js'),
    ];
    const importing = [];
    for (const module of modules) {
      if (STENCIL_IMPORT.test(code(await readFile(module, 'utf8')))) importing.push(module);
    }
    expect(importing).toEqual([]);
  });

  it("names @stencil/core in a declaration only to type Stencil JSX for Stencil's own users", async () => {
    const naming = [];
    for (const directory of ['dist/types', 'dist/components', 'loader']) {
      for (const declaration of await files(join(packageRoot, directory), '.d.ts')) {
        const text = code(await readFile(declaration, 'utf8'));
        if (STENCIL_IMPORT.test(text)) {
          naming.push(declaration);
        }
      }
    }
    expect(naming).toEqual([]);
    // TypeScript ignores this augmentation where @stencil/core is not installed.
    const typesIndex = await readFile(join(packageRoot, 'dist/types/components.d.ts'), 'utf8');
    expect(typesIndex.match(/declare module "@stencil\/core"/gu)).toHaveLength(1);
  });
});
