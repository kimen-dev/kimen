import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { describe, expect, it, onTestFinished } from 'vitest';

import {
  bundledNpmPackages,
  MCP_BUNDLE_INVENTORY_PREFIX,
  mergeBundledPackages,
} from '../lib/bundled-package-inventory.mjs';

// The third-party npm packages a release bundle carries, for its notices.
async function workspace() {
  const root = await mkdtemp(join(tmpdir(), 'kimen-bundled-packages-'));
  onTestFinished(() => rm(root, { force: true, recursive: true }));
  const put = async (path, contents) => {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(
      join(root, path),
      typeof contents === 'string' ? contents : JSON.stringify(contents),
    );
  };
  return { root, put };
}
const manifest = (name, version = '1.0.0', license = 'MIT') => ({ name, version, license });
const metafile = (inputs) => ({ outputs: { 'out.js': { inputs } } });

describe('bundled-package-inventory', () => {
  it('merges inventories by name and version, sorted', () => {
    expect(MCP_BUNDLE_INVENTORY_PREFIX).toBe('// Bundled npm packages: ');
    const zod = manifest('zod', '4.0.0');
    expect(
      mergeBundledPackages([zod, manifest('a')], [manifest('a'), manifest('a', '2.0.0')]),
    ).toEqual([manifest('a'), manifest('a', '2.0.0'), zod]);
  });

  it('lists each installed package with bytes in the output, scoped or not, once', async () => {
    const { root, put } = await workspace();
    await put('node_modules/zod/package.json', manifest('zod', '4.6.7'));
    await put(
      'node_modules/@scope/pkg/package.json',
      manifest('@scope/pkg', '2.0.0', 'Apache-2.0'),
    );
    await put('node_modules/unused/package.json', manifest('unused'));
    const inputs = {
      'node_modules/zod/index.js': { bytesInOutput: 10 },
      'node_modules/zod/v4/core.js': { bytesInOutput: 5 },
      'node_modules/@scope/pkg/dist/a.js': { bytesInOutput: 1 },
      'node_modules/unused/index.js': { bytesInOutput: 0 },
      'src/own.ts': { bytesInOutput: 7 },
      '<stdin>': { bytesInOutput: 3 },
    };
    expect(await bundledNpmPackages(metafile(inputs), root)).toEqual([
      manifest('@scope/pkg', '2.0.0', 'Apache-2.0'),
      manifest('zod', '4.6.7'),
    ]);
  });

  it('lists the npm packages a workspace output compiled in, as its source map names them', async () => {
    const { root, put } = await workspace();
    await put(
      'packages/elements/node_modules/@stencil/core/package.json',
      manifest('@stencil/core', '4.45.3'),
    );
    await put('packages/elements/dist/components/stencil-client.js', 'runtime');
    await put('packages/elements/dist/components/stencil-client.js.map', {
      version: 3,
      // Stencil writes the path in the store relative to the package.
      sources: [
        '@stencil/core/internal/app-data',
        '../../node_modules/.pnpm/@stencil+core@4.45.3/node_modules/@stencil/core/internal/client/index.js',
        '../../node_modules/.pnpm/@stencil+core@4.45.3/node_modules/@stencil/core/internal/client/shadow-css.js',
        7,
      ],
    });
    await put('packages/elements/dist/components/ki-button.js', 'button');
    await put('packages/elements/dist/components/ki-button.js.map', {
      version: 3,
      sourceRoot: '../../src',
      sources: ['components/ki-button/ki-button.tsx'],
    });
    await put('packages/elements/dist/components/no-sources.js.map', { version: 3 });
    const inputs = {
      '../elements/dist/components/stencil-client.js': { bytesInOutput: 100 },
      '../elements/dist/components/ki-button.js': { bytesInOutput: 50 },
      '../elements/dist/components/no-sources.js': { bytesInOutput: 1 },
      '../elements/dist/components/no-map.js': { bytesInOutput: 1 },
    };
    expect(
      await bundledNpmPackages(metafile(inputs), join(root, 'packages/adapter-mcp-apps')),
    ).toEqual([manifest('@stencil/core', '4.45.3')]);
  });

  it('refuses a source map that names a package no node_modules above the output holds', async () => {
    const { root, put } = await workspace();
    await put('packages/elements/dist/components/x.js', 'x');
    await put('packages/elements/dist/components/x.js.map', {
      version: 3,
      sources: ['../../node_modules/zod/index.js'],
    });
    await expect(
      bundledNpmPackages(
        metafile({ 'packages/elements/dist/components/x.js': { bytesInOutput: 1 } }),
        root,
      ),
    ).rejects.toThrowError(/^Bundled source map .*x\.js\.map names zod, which is not installed$/u);
    await put('node_modules/zod/package.json', manifest('zod', '4.6.7'));
    expect(
      await bundledNpmPackages(
        metafile({ 'packages/elements/dist/components/x.js': { bytesInOutput: 1 } }),
        root,
      ),
    ).toEqual([manifest('zod', '4.6.7')]);
  });

  it('refuses an unreadable source map and a package without name, version or licence', async () => {
    const { root, put } = await workspace();
    await put('dist/broken.js.map', '{');
    await expect(
      bundledNpmPackages(metafile({ 'dist/broken.js': { bytesInOutput: 1 } }), root),
    ).rejects.toThrowError(/^Bundled source map .*broken\.js\.map is not valid JSON: /u);
    for (const incomplete of [
      { name: 'x', version: '1.0.0' },
      { name: 'x', version: '', license: 'MIT' },
      { version: '1', license: 'MIT' },
    ]) {
      await put('node_modules/x/package.json', incomplete);
      await expect(
        bundledNpmPackages(metafile({ 'node_modules/x/index.js': { bytesInOutput: 1 } }), root),
      ).rejects.toThrowError(
        /^Bundled npm package must declare its name, version and license in .*node_modules[\\/]x[\\/]package\.json$/u,
      );
    }
  });
});
