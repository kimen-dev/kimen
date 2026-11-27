#!/usr/bin/env node
// Declaration specifier normalization (Art. I — the pipeline owns its
// deterministic post-passes; nothing here is edited by hand).
//
// Stencil emits `components.d.ts`, the per-component declarations and the
// loader types with relative imports that omit the file name. Under
// `moduleResolution: node16 | nodenext` those imports do not resolve from a
// consumer's `node_modules`, and the prop and event types they carry degrade
// to `any` without a diagnostic. This pass names every file, after
// sync-components has written its own type re-exports and before anything
// packs or inspects the output. It also re-bases the specifiers of dist/types
// that leave src, and drops its glyph imports, which carry no type
// (scripts/lib/declaration-specifiers.mjs). It is idempotent,
// and it refuses to guess: a relative specifier with no declaration file
// behind it aborts the build.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Every directory of the package that ships declaration files.
export const DECLARATION_DIRECTORIES = Object.freeze(['dist/types', 'dist/components', 'loader']);
// The declaration directories Stencil writes as a copy of a source directory.
// A specifier there that leaves the source is re-based onto the file it
// names, except a component's glyph import, which is dropped.
export const DECLARATION_SOURCE_ROOTS = Object.freeze({ 'dist/types': 'src' });
// The glyph modules, which the package types through its `./icons/*` export.
export const GLYPH_DIRECTORY = 'icons';

export async function normalizePackageDeclarations({ packageRoot, workspaceRoot }) {
  const { normalizeDeclarationDirectories } = await import(
    pathToFileURL(resolve(workspaceRoot, 'scripts/lib/declaration-specifiers.mjs')).href
  );
  const sourceRoots = Object.fromEntries(
    Object.entries(DECLARATION_SOURCE_ROOTS).map(([directory, source]) => [
      resolve(packageRoot, directory),
      resolve(packageRoot, source),
    ]),
  );
  return normalizeDeclarationDirectories(
    DECLARATION_DIRECTORIES.map((directory) => resolve(packageRoot, directory)),
    { sourceRoots, glyphRoot: resolve(packageRoot, GLYPH_DIRECTORY) },
  );
}

async function stripLazyReadiness(packageRoot) {
  // Both published registration paths use dist-custom-elements, so the
  // inherited lazy-build method in Stencil's vendored types is absent at runtime.
  const file = resolve(packageRoot, 'dist/types/stencil-public-runtime.d.ts');
  const source = await readFile(file, 'utf8');
  const normalized = source.replace(
    /^(export interface HTMLStencilElement extends HTMLElement \{\r?\n) {4}componentOnReady\(\): Promise<this>;\r?\n/mu,
    '$1',
  );
  if (normalized !== source) await writeFile(file, normalized, 'utf8');
}

async function main() {
  const packageRoot = fileURLToPath(new URL('..', import.meta.url));
  const workspaceRoot = fileURLToPath(new URL('../../..', import.meta.url));
  const report = await normalizePackageDeclarations({ packageRoot, workspaceRoot });
  await stripLazyReadiness(packageRoot);
  process.stdout.write(
    `NORMALIZE declarations: PASS (${String(report.rewrittenSpecifiers)} specifiers named in ${String(report.rewrittenFiles)} of ${String(report.declarations)} files)\n`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`NORMALIZE declarations: FAIL — ${error.message}\n`);
    process.exitCode = 1;
  });
}
