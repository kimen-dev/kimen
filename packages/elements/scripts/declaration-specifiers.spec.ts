import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const workspaceRoot = fileURLToPath(new URL('../../..', import.meta.url));

interface DeclarationSpecifiers {
  extensionlessRelativeSpecifiers: (text: string, fileName: string) => string[];
}

async function declarationFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return declarationFiles(path);
      }
      return Promise.resolve(entry.name.endsWith('.d.ts') ? [path] : []);
    }),
  );
  return nested.flat().sort();
}

// What a TypeScript consumer on `moduleResolution: nodenext` reads is the
// built output, so this asserts the build rather than a source file. A
// relative import that does not name its file fails to resolve there, and the
// types it carried reach the consumer as `any` with no diagnostic at all.
describe('declarations shipped by @kimen/elements', () => {
  it.each(['dist/types', 'dist/components', 'loader'])(
    'every relative import in %s names the file it points at',
    async (directory) => {
      const { extensionlessRelativeSpecifiers } = (await import(
        pathToFileURL(join(workspaceRoot, 'scripts/lib/declaration-specifiers.mjs')).href
      )) as DeclarationSpecifiers;
      const files = await declarationFiles(join(packageRoot, directory));
      expect(files.length).toBeGreaterThan(0);

      const offenders: string[] = [];
      for (const file of files) {
        const specifiers = extensionlessRelativeSpecifiers(await readFile(file, 'utf8'), file);
        for (const specifier of specifiers) {
          offenders.push(`${relative(packageRoot, file)} → ${specifier}`);
        }
      }

      expect(offenders).toEqual([]);
    },
  );

  // The release packaging gate (attw) fails the package on a declaration
  // import that does not resolve, and pull requests never run it. Stencil
  // copies src/ into dist/types/ one directory deeper and keeps every
  // specifier as written, so a component's glyph import
  // (`../../../icons/x.js`) pointed at a dist/icons/ that does not exist.
  // TypeScript's own resolver is the oracle: what it cannot resolve, a
  // consumer cannot either.
  it.each(['dist/types', 'dist/components', 'loader'])(
    'every relative import in %s resolves for a consumer on nodenext',
    async (directory) => {
      const options = {
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
      };
      const files = await declarationFiles(join(packageRoot, directory));
      expect(files.length).toBeGreaterThan(0);

      const unresolved: string[] = [];
      for (const file of files) {
        const { importedFiles } = ts.preProcessFile(await readFile(file, 'utf8'), true, true);
        for (const { fileName: specifier } of importedFiles) {
          if (!specifier.startsWith('./') && !specifier.startsWith('../')) continue;
          const { resolvedModule } = ts.resolveModuleName(
            specifier,
            file,
            options,
            ts.sys,
            undefined,
            undefined,
            ts.ModuleKind.ESNext,
          );
          if (resolvedModule === undefined) {
            unresolved.push(`${relative(packageRoot, file)} → ${specifier}`);
          }
        }
      }

      expect(unresolved).toEqual([]);
    },
  );
});
