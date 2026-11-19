import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
});
