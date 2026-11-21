#!/usr/bin/env node
// Per-component modules without a bundler warning (integrator feedback
// 0.1.1, item 7). A deterministic post-pass of the build: nothing it writes
// is edited by hand.
//
// The custom-elements build (`dist/components`, which `@kimen/elements/ki-*`,
// `@kimen/elements/components` and the framework wrappers import) leaves
// Stencil's client runtime external: every module imports
// `@stencil/core/internal/client`. That runtime also serves Stencil's lazy
// loader, and its `loadModule` imports a component chunk with a template
// literal, `./${bundleId}.entry.js`. A consumer's esbuild reads that as the
// glob `./**/*.entry.js*`, finds nothing beside Stencil's file, and warns
// `empty-glob` on every build. The custom-elements build never lazy-loads, so
// the call is unreachable, but a bundler cannot know that.
//
// This pass ships the runtime beside the modules that use it, as
// `dist/components/stencil-client.js`: Stencil's file byte for byte, except
// that the unreachable import's specifier is assembled at run time and marked
// for bundlers to leave alone. Every module of `dist/components` imports it by
// relative path. The runtime keeps importing `@stencil/core/internal/app-data`
// and `app-globals`, so `@stencil/core` stays a dependency and the build flags
// are still the package's. The lazy loader (`dist/esm`, `loader`) bundles its
// own runtime and is left as it is.
//
// The pass refuses to guess: if Stencil's import no longer has the shape
// below, or a module imports the runtime under another form, the build stops.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RUNTIME_SPECIFIER = '@stencil/core/internal/client';
export const VENDORED_RUNTIME = 'stencil-client.js';

// The lazy import of `src/client/client-load-module.ts`, as Stencil 4 ships it.
const LAZY_IMPORT =
  /return import\(\s*(?:\/\*[^*]*\*\/\s*)*`\.\/\$\{bundleId\}\.entry\.js\$\{cacheBustParams \? "\?" \+ cacheBustParams : ""\}`\s*\)/gu;
const UNANALYSED_IMPORT = [
  'return import(',
  '    /* @vite-ignore */',
  '    /* webpackIgnore: true */',
  '    /* turbopackIgnore: true */',
  '    ["./", bundleId, ".entry.js", cacheBustParams ? "?" + cacheBustParams : ""].join("")',
  '  )',
].join('\n');

const BANNER = [
  '/*!',
  ' * Stencil client runtime, copied from @stencil/core/internal/client by',
  ' * scripts/vendor-stencil-client.mjs: the lazy-loader import that bundlers',
  ' * read as an empty glob is left unanalysed. Stencil is MIT licensed:',
  ' * Copyright (c) 2019-present Drifty Co. See NOTICE.',
  ' */',
  '',
].join('\n');

/** Stencil's runtime with its lazy-loader import left to the browser. */
export function vendorRuntime(source) {
  const matches = source.match(LAZY_IMPORT) ?? [];
  if (matches.length !== 1) {
    throw new Error(
      `vendor-stencil-client: expected one lazy-loader import in ${RUNTIME_SPECIFIER}, found ${String(matches.length)}`,
    );
  }
  return BANNER + source.replace(LAZY_IMPORT, UNANALYSED_IMPORT);
}

const QUOTED = [`"${RUNTIME_SPECIFIER}"`, `'${RUNTIME_SPECIFIER}'`];

/** A dist/components module importing the shipped runtime instead of Stencil's. */
export function relinkModule(source, name) {
  if (!source.includes(RUNTIME_SPECIFIER)) {
    return source;
  }
  let relinked = source;
  for (const quoted of QUOTED) {
    relinked = relinked.split(quoted).join(`"./${VENDORED_RUNTIME}"`);
  }
  if (relinked.includes(RUNTIME_SPECIFIER)) {
    throw new Error(`vendor-stencil-client: ${name} names ${RUNTIME_SPECIFIER} in an unknown form`);
  }
  return relinked;
}

export async function vendorStencilClient({ packageRoot }) {
  const components = resolve(packageRoot, 'dist/components');
  const require = createRequire(join(packageRoot, 'package.json'));
  const runtime = await readFile(require.resolve(RUNTIME_SPECIFIER), 'utf8');
  await writeFile(join(components, VENDORED_RUNTIME), vendorRuntime(runtime));

  let relinked = 0;
  for (const name of await readdir(components)) {
    if (!name.endsWith('.js') || name === VENDORED_RUNTIME) continue;
    const path = join(components, name);
    const source = await readFile(path, 'utf8');
    const next = relinkModule(source, name);
    if (next !== source) {
      await writeFile(path, next);
      relinked += 1;
    }
  }
  if (relinked === 0) {
    throw new Error(`vendor-stencil-client: no module of dist/components imports the runtime`);
  }
  return relinked;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const packageRoot = fileURLToPath(new URL('..', import.meta.url));
  vendorStencilClient({ packageRoot })
    .then((count) => {
      process.stdout.write(
        `vendor-stencil-client: ${String(count)} modules use the shipped runtime\n`,
      );
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
