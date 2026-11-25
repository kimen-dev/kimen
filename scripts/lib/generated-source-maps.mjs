#!/usr/bin/env node
// Generated modules published without a source map (founder decision of
// 2026-11-25). tsc maps every module it emits; for the generated surface
// document and the generated catalog, that map would embed the whole
// generated source again and help no consumer debug anything. After the
// build, this pass removes the map of each module the package's rules name
// as unmapped (scripts/lib/package-contents.mjs), and the sourceMappingURL
// comment that points at it. The release candidate refuses any other module
// without its map, and an unmapped module that still ships one.
//
// tsc -b trusts its build info, so it does not rewrite the edited module until
// its source changes; the pass runs after every build, so it is idempotent.
//
// Usage, from a package directory: node ../../scripts/lib/generated-source-maps.mjs
import { readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { packageContentRules } from './package-contents.mjs';

/**
 * `source` without the lines that link the map `mapName`, or null when it
 * has none. A bundled module can carry the same link twice (Stencil's ESM
 * index does), and a link left behind sends a consumer tool after a map the
 * package no longer ships.
 */
export function withoutSourceMapLink(source, mapName) {
  const link = `//# sourceMappingURL=${mapName}`;
  const lines = source.split('\n');
  const kept = lines.filter((line) => line.trim() !== link);
  return kept.length === lines.length ? null : `${kept.join('\n').trimEnd()}\n`;
}

/** Removes the map and its links from each unmapped module of the package at `packageRoot`. */
export async function unmapGeneratedModules(packageRoot) {
  const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  const rules = packageContentRules[manifest.name];
  if (rules === undefined) throw new Error(`${manifest.name} has no package content rules`);
  for (const module of rules.unmappedModules) {
    const path = join(packageRoot, module);
    // A missing module means the build did not run: fail rather than pass silently.
    const unlinked = withoutSourceMapLink(await readFile(path, 'utf8'), `${basename(module)}.map`);
    if (unlinked !== null) await writeFile(path, unlinked);
    await rm(`${path}.map`, { force: true });
  }
  return rules.unmappedModules;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  unmapGeneratedModules(process.cwd()).then(
    (modules) => {
      process.stdout.write(
        `UNMAP generated modules: PASS (${modules.length === 0 ? 'none' : modules.join(', ')})\n`,
      );
    },
    (error) => {
      process.stderr.write(`UNMAP generated modules: FAIL — ${error.message}\n`);
      process.exitCode = 1;
    },
  );
}
