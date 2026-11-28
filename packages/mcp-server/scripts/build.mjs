// Builds the Kimen MCP server binary (spec 038 FR-001, FR-002, FR-012, D8).
//
// Two steps, both pure transforms of committed or built inputs:
//
// 1. `src/generated/manifest.ts`: the theming documentation of every custom
//    element (its `--ki-*` custom properties and its parts) and the package
//    version, read from the committed Custom Elements Manifest
//    (`packages/elements/generated/custom-elements.json`, Art. I). The
//    catalog itself is NOT copied: the server imports `catalogData` from
//    `@kimen/catalog`, so membership is decided by the generated catalog.
// 2. `dist/kimen-mcp.mjs`: one ESM file bundling the server, the MCP SDK, the
//    catalog, the emitter derivations and the MCP Apps surface document. At
//    run time the binary reads nothing but itself and opens no connection;
//    the end-to-end suite proves it under the Node permission model (S16).
//    `.mjs`, so Node never looks for a package.json to learn the module type.
//
// Deterministic: no date, randomness or machine path reaches either output.
// `--check` rebuilds both in memory and fails unless they equal the files on
// disk, so a rebuild is provably byte-identical.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const { bundledNpmPackages, MCP_BUNDLE_INVENTORY_PREFIX, mergeBundledPackages } = await import(
  new URL('../../../scripts/lib/bundled-package-inventory.mjs', import.meta.url).href
);
const { STOCK_SURFACE_ICON_SELECTION, stockSurfaceIconModules, stockSurfaceIconSelectionPlugin } =
  await import(new URL('../../../scripts/lib/stock-surface-icons.mjs', import.meta.url).href);
const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, '..');
const manifestFile = resolve(packageRoot, '../elements/generated/custom-elements.json');
const generatedFile = resolve(packageRoot, 'src/generated/manifest.ts');
const outFile = resolve(packageRoot, 'dist/kimen-mcp.mjs');
const surfaceInventory = resolve(
  packageRoot,
  '../adapter-mcp-apps/src/generated/surface-packages.json',
);

const SHORTHAND = /^[a-z][a-z0-9-]*$/u;
const CHECK = process.argv.includes('--check');

/** Documented hooks, sorted by name, from one manifest facet. */
function facet(entries, tag, kind) {
  const pairs = (entries ?? []).map((entry) => {
    if (typeof entry?.name !== 'string' || entry.name === '') {
      throw new Error(`mcp-server: ${tag} declares a ${kind} without a name`);
    }
    return {
      description: typeof entry.description === 'string' ? entry.description : '',
      name: entry.name,
      ...(entry.default === undefined ? {} : { default: entry.default }),
      ...(entry.material3Default === undefined ? {} : { material3Default: entry.material3Default }),
    };
  });
  return pairs.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

async function manifestModuleSource() {
  const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
  const { version } = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));
  const theming = {};
  const tokenHooks = [];
  const tokenIndices = new Map();
  for (const module of manifest.modules ?? []) {
    for (const declaration of module.declarations ?? []) {
      if (declaration.customElement !== true || typeof declaration.tagName !== 'string') {
        continue;
      }
      const tag = declaration.tagName;
      if (!SHORTHAND.test(tag)) {
        throw new Error(`mcp-server: unexpected custom element name "${tag}" in the manifest`);
      }
      const tokens = facet(declaration.cssProperties, tag, 'custom property').map((token) => {
        if (typeof token.default !== 'string' || token.default === '') {
          throw new Error(`mcp-server: ${tag} token ${token.name} has no default`);
        }
        // Shared CSS hooks have the same description and defaults in every contract.
        const existing = tokenIndices.get(token.name);
        if (existing !== undefined) return existing;
        const index = tokenHooks.length;
        tokenHooks.push(token);
        tokenIndices.set(token.name, index);
        return index;
      });
      theming[tag] = { parts: facet(declaration.cssParts, tag, 'part'), tokens };
    }
  }
  const sorted = Object.fromEntries(
    Object.keys(theming)
      .sort()
      .map((tag) => [tag, theming[tag]]),
  );
  return [
    '// GENERATED FILE (spec 038, Art. I) — never edit by hand.',
    '// Source: packages/elements/generated/custom-elements.json and package.json',
    '// via packages/mcp-server/scripts/build.mjs.',
    '',
    '/** One documented theming hook: a `--ki-*` custom property or a part. */',
    'export interface ThemingHook {',
    '  readonly name: string;',
    '  readonly description: string;',
    '}',
    '',
    'export interface TokenHook extends ThemingHook {',
    '  readonly default: string;',
    '  readonly material3Default?: string;',
    '}',
    '',
    '/** The theming surface one custom element documents in its manifest entry. */',
    'export interface ComponentTheming {',
    '  readonly tokens: readonly number[];',
    '  readonly parts: readonly ThemingHook[];',
    '}',
    '',
    `export const SERVER_VERSION = ${JSON.stringify(version)};`,
    '',
    `export const TOKEN_HOOKS: readonly TokenHook[] = ${JSON.stringify(tokenHooks, null, 2)};`,
    '',
    `export const COMPONENT_THEMING: Readonly<Record<string, ComponentTheming>> = ${JSON.stringify(sorted, null, 2)};`,
    '',
  ].join('\n');
}

// TypeScript sources import siblings with `.js` specifiers
// (verbatimModuleSyntax); bundle them from `src` directly.
const tsExtensionPlugin = {
  name: 'ts-extension',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /^\.\.?\/.*\.js$/ }, (args) => {
      if (!args.importer.startsWith(resolve(packageRoot, 'src'))) {
        return undefined;
      }
      return { path: resolve(args.resolveDir, args.path.replace(/\.js$/u, '.ts')) };
    });
  },
};

async function bundle() {
  const result = await build({
    // Paths esbuild writes into the bundle are relative to this directory:
    // pin it, so the bytes do not depend on where the build runs from.
    absWorkingDir: packageRoot,
    bundle: true,
    stdin: {
      contents: [
        ...stockSurfaceIconModules.map((file) => `import ${JSON.stringify(file)};`),
        // Spec 069 S14: the same spec-facing selection as the document.
        `import ${JSON.stringify(STOCK_SURFACE_ICON_SELECTION)};`,
        `import ${JSON.stringify(resolve(packageRoot, 'src/main.ts'))};`,
      ].join('\n'),
      resolveDir: packageRoot,
    },
    format: 'esm',
    legalComments: 'eof',
    logLevel: 'warning',
    metafile: true,
    minifySyntax: true,
    outfile: outFile,
    platform: 'node',
    plugins: [tsExtensionPlugin, stockSurfaceIconSelectionPlugin(packageRoot)],
    target: 'node22',
    write: false,
  });
  const packages = mergeBundledPackages(
    await bundledNpmPackages(result.metafile, packageRoot),
    JSON.parse(await readFile(surfaceInventory, 'utf8')),
  );
  // The nested surface is already bundled into an HTML string when esbuild
  // sees it here. Carry both inventories in the binary the release packs.
  return Buffer.concat([
    Buffer.from(`#!/usr/bin/env node\n${MCP_BUNDLE_INVENTORY_PREFIX}${JSON.stringify(packages)}\n`),
    result.outputFiles[0].contents,
  ]);
}

async function same(file, expected) {
  try {
    return Buffer.from(await readFile(file)).equals(Buffer.from(expected));
  } catch {
    return false;
  }
}

const manifestSource = await manifestModuleSource();
if (CHECK) {
  if (!(await same(generatedFile, Buffer.from(manifestSource)))) {
    throw new Error('mcp-server: src/generated/manifest.ts is stale — run the build');
  }
  if (!(await same(outFile, await bundle()))) {
    throw new Error('mcp-server: dist/kimen-mcp.mjs differs from a fresh build');
  }
} else {
  await mkdir(dirname(generatedFile), { recursive: true });
  await writeFile(generatedFile, manifestSource);
  const binary = await bundle();
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, binary, { mode: 0o755 });
}
