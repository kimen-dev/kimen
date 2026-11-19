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
// packs or inspects the output. It is idempotent, and it refuses to guess: a
// relative specifier with no declaration file behind it aborts the build.
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = resolve(packageRoot, '../..');

const { normalizeDeclarationDirectories } = await import(
  pathToFileURL(resolve(workspaceRoot, 'scripts/lib/declaration-specifiers.mjs')).href
);

const report = await normalizeDeclarationDirectories(
  ['dist/types', 'dist/components', 'loader'].map((directory) => resolve(packageRoot, directory)),
);

process.stdout.write(
  `declaration specifiers: ${String(report.rewrittenSpecifiers)} named in ${String(report.rewrittenFiles)} of ${String(report.declarations)} files\n`,
);
