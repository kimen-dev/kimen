import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { describe, expect, it, onTestFinished } from 'vitest';

import { unmapGeneratedModules, withoutSourceMapLink } from '../lib/generated-source-maps.mjs';

// @spec:018-project-integrity-hardening#S7

const exists = (path) =>
  access(path).then(
    () => true,
    () => false,
  );

async function aPackage(name, files) {
  const root = await mkdtemp(join(tmpdir(), 'kimen-unmap-'));
  onTestFinished(() => rm(root, { force: true, recursive: true }));
  for (const [path, contents] of Object.entries({
    'package.json': JSON.stringify({ name }),
    ...files,
  })) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), contents);
  }
  return root;
}

describe('generated modules published without a source map', () => {
  it('S7 removes the map and its link from each unmapped module, and nothing else', async () => {
    const root = await aPackage('@kimen/catalog', {
      'dist/generated/catalog.js':
        'export const catalog = {};\n//# sourceMappingURL=catalog.js.map\n\n  //# sourceMappingURL=catalog.js.map',
      'dist/generated/catalog.js.map': '{}',
      'dist/index.js': 'export {};\n//# sourceMappingURL=index.js.map\n',
      'dist/index.js.map': '{}',
    });

    await expect(unmapGeneratedModules(root)).resolves.toEqual(['dist/generated/catalog.js']);

    expect(await readFile(join(root, 'dist/generated/catalog.js'), 'utf8')).toBe(
      'export const catalog = {};\n',
    );
    expect(await exists(join(root, 'dist/generated/catalog.js.map'))).toBe(false);
    expect(await readFile(join(root, 'dist/index.js'), 'utf8')).toBe(
      'export {};\n//# sourceMappingURL=index.js.map\n',
    );
    expect(await exists(join(root, 'dist/index.js.map'))).toBe(true);
  });

  it('S7 a second pass changes nothing, and a link to another map stays', async () => {
    const root = await aPackage('@kimen/adapter-mcp-apps', {
      'dist/generated/surface-document.js':
        'export const html = "";\n//# sourceMappingURL=other.js.map\n',
    });

    await unmapGeneratedModules(root);
    await unmapGeneratedModules(root);

    expect(await readFile(join(root, 'dist/generated/surface-document.js'), 'utf8')).toBe(
      'export const html = "";\n//# sourceMappingURL=other.js.map\n',
    );
  });

  it('S7 drops only the lines that link the named map', () => {
    expect(withoutSourceMapLink('a;\n//# sourceMappingURL=x.js.map\nb;\n', 'x.js.map')).toBe(
      'a;\nb;\n',
    );
    expect(withoutSourceMapLink('a;\n//# sourceMappingURL=y.js.map\n', 'x.js.map')).toBeNull();
    expect(withoutSourceMapLink('// see //# sourceMappingURL=x.js.map\n', 'x.js.map')).toBeNull();
    expect(withoutSourceMapLink('//# sourceMappingURL=x.js.map', 'x.js.map')).toBe('\n');
  });

  it('S7 does nothing for a package without unmapped modules', async () => {
    const root = await aPackage('@kimen/emitter', { 'dist/index.js.map': '{}' });

    await expect(unmapGeneratedModules(root)).resolves.toEqual([]);
    expect(await exists(join(root, 'dist/index.js.map'))).toBe(true);
  });

  it('S7 fails when the module was never built or the package has no rules', async () => {
    const unbuilt = await aPackage('@kimen/catalog', {});
    await expect(unmapGeneratedModules(unbuilt)).rejects.toThrow(/catalog\.js/u);

    const unknown = await aPackage('@kimen/unknown', {});
    await expect(unmapGeneratedModules(unknown)).rejects.toThrow(
      '@kimen/unknown has no package content rules',
    );
  });
});
