// Builds the self-contained MCP Apps surface documents (spec 030 FR-002,
// FR-007, FR-011, FR-013; spec 165). A document is the WHOLE surface: an MCP
// server can hand a host nothing but this resource, so everything a Kimen
// surface needs is inline in it —
//
//   one <style>   the default token stylesheet and the page contract
//                 (@kimen/tokens), minified
//   one <script>  the component definitions and the selected glyphs
//                 (@kimen/elements), the guarded renderer and its validator
//                 (@kimen/catalog) and the host bridge (this package)
//
// and its content policy names exactly those two elements by digest: nothing
// else in the document can run or style, and nothing is fetchable.
//
// The full document registers every catalog component. A subset document
// (spec 165) registers only what its subset needs, and its built-in catalog IS
// that subset: the module that holds the generated catalog is replaced, so no
// validation or render path in the document can accept anything more (D3).
//
// Deterministic: a pure transform of the dependency builds — no network, no
// date, no randomness, no machine path — so regeneration is byte-identical and
// a host's cached audit stays valid (030 S2, 165 S4).
import { createHash } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { catalogData, NATIVE_PRIMITIVE_TAGS } from '@kimen/catalog';
import { build, transform } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, '..');
const runtimeModule = resolve(packageRoot, 'surface/surface-runtime.ts');

// Build outputs and sources of the workspace packages the document embeds.
// Like the catalog generator, this reads them by workspace path: they are
// build-time inputs of a prebuilt document, not runtime dependencies of the
// adapter (the Nx project declares both as implicit dependencies, so they are
// built first).
const elementsComponents = resolve(packageRoot, '../elements/dist/components');
const elementsSources = resolve(packageRoot, '../elements/src/components');
const tokenStylesheets = ['tokens.css', 'base.css'].map((file) =>
  resolve(packageRoot, '../tokens/dist/css', file),
);
// The catalog build esbuild resolves `@kimen/catalog` to (the workspace link,
// real path), found the same way as the others so a test runner can import
// this module too.
const catalogDist = realpathSync(resolve(packageRoot, '../catalog/dist'));
const generatedCatalogDir = resolve(catalogDist, 'generated');
const { bundledNpmPackages } = await import(
  new URL('../../../scripts/lib/bundled-package-inventory.mjs', import.meta.url).href
);
const {
  STOCK_SURFACE_ICON_SELECTION,
  stockSurfaceIconModules,
  stockSurfaceIconNames,
  stockSurfaceIconSelectionPlugin,
} = await import(new URL('../../../scripts/lib/stock-surface-icons.mjs', import.meta.url).href);
const { readComponentMetadataByTag } = await import(
  new URL('../../elements/scripts/component-metadata.mjs', import.meta.url).href
);

/** The placeholder every document shows until a spec paints (spec 163). */
const WAITING_PLACEHOLDER = 'ki-skeleton';

const byCodePoint = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

/**
 * The effective subset of `components` (spec 165 FR-003, FR-005): the named
 * catalog components, the parts their composite metadata declares
 * (`budgetGroup.members`, D5) and the native primitives. Throws, naming every
 * offending entry, unless the subset names at least one component, each once,
 * and only components of the catalog: a subset can narrow the catalog, never
 * extend it (S9).
 */
export function resolveSubset(components, { catalog = catalogData, metadata } = {}) {
  const issues = [];
  if (!Array.isArray(components) || components.length === 0) {
    issues.push('it names no component');
  }
  const named = Array.isArray(components) ? components : [];
  const seen = new Set();
  for (const tag of named) {
    if (typeof tag !== 'string' || !Object.hasOwn(catalog.components, tag)) {
      issues.push(`${JSON.stringify(tag)} is not in the catalog`);
    } else if (seen.has(tag)) {
      issues.push(`${JSON.stringify(tag)} is named twice`);
    }
    seen.add(tag);
  }
  if (issues.length > 0) {
    throw new Error(`adapter-mcp-apps: the subset cannot be generated: ${issues.join('; ')}`);
  }

  const byTag = metadata ?? readComponentMetadataByTag(elementsSources);
  const effective = new Set([...named, ...NATIVE_PRIMITIVE_TAGS]);
  for (const tag of named) {
    for (const part of byTag.get(tag)?.budgetGroup?.members ?? []) {
      if (!Object.hasOwn(catalog.components, part)) {
        throw new Error(
          `adapter-mcp-apps: the subset cannot be generated: ${JSON.stringify(part)}, a part of ${JSON.stringify(tag)}, is not in the catalog`,
        );
      }
      effective.add(part);
    }
  }
  return Object.freeze([...effective].sort(byCodePoint));
}

/** The built definition module of each tag, failing unless elements was built. */
function definitionModules(tags) {
  return tags.map((tag) => {
    const file = resolve(elementsComponents, `${tag}.js`);
    if (!/^ki-[a-z0-9-]+$/u.test(tag) || !existsSync(file)) {
      throw new Error(
        `adapter-mcp-apps: catalog component "${tag}" has no built definition at ${file} — build @kimen/elements first`,
      );
    }
    return file;
  });
}

// The document entry. Import order is evaluation order: the validator is
// configured before the catalog module that builds its schemas is evaluated.
const VALIDATOR_CONFIG = 'kimen-surface:validator-config';
const entryOf = (componentModules) =>
  [
    `import ${JSON.stringify(VALIDATOR_CONFIG)};`,
    ...stockSurfaceIconModules.map((file) => `import ${JSON.stringify(file)};`),
    // Spec 069 S14: specs may name the stock glyphs only, never the glyphs the
    // components below import to draw themselves.
    `import ${JSON.stringify(STOCK_SURFACE_ICON_SELECTION)};`,
    ...componentModules.map(
      (file, index) =>
        `import { defineCustomElement as define${index} } from ${JSON.stringify(file)};`,
    ),
    `import { startSurface } from ${JSON.stringify(runtimeModule)};`,
    ...componentModules.map((_, index) => `define${index}();`),
    'startSurface();',
    '',
  ].join('\n');

// TypeScript source uses `.js` import specifiers (verbatimModuleSyntax); map
// them back to their `.ts` sources so esbuild bundles from src directly (no
// dependency on tsc output, so this runs before the type build).
const tsExtensionPlugin = {
  name: 'ts-extension',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /^\.\.?\/.*\.js$/ }, (args) => {
      const candidate = resolve(args.resolveDir, args.path.replace(/\.js$/, '.ts'));
      return existsSync(candidate) ? { path: candidate } : undefined;
    });
  },
};

// The catalog validates with zod. Two things about how it is linked into a
// document that owns its whole realm and forbids evaluated code:
//
// 1. No eval probe. zod compiles object parsers with `new Function` when it
//    can, and finds out by trying. The content policy refuses the attempt, but
//    the browser still reports it as a violation on every load — a document
//    that probes for eval is not one an auditor should have to explain. Its
//    `jitless` switch skips the probe; it must be set before the catalog's
//    schemas are built, hence a module of its own, imported first. `zod` is
//    resolved from the catalog so both share one configuration.
//
// 2. Only the validator that is used. The catalog imports the `z` namespace
//    object (`import { z } from 'zod'`). esbuild cannot tree-shake a namespace
//    that crosses a re-export, so that one import drags in all of zod — every
//    locale, the JSON-Schema converters — 357 kB of what was a 527 kB
//    document. Importing the same bindings as a module namespace is
//    semantically identical and lets esbuild keep only what the catalog
//    calls. The rewrite is exact-match: if the catalog changes how it imports
//    zod this does nothing, and the size budget in tests/resource.spec.ts
//    says so.
const validatorPlugin = {
  name: 'validator',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /^kimen-surface:validator-config$/ }, (args) => ({
      namespace: 'kimen-surface',
      path: args.path,
    }));
    pluginBuild.onLoad({ filter: /.*/, namespace: 'kimen-surface' }, () => ({
      contents: "import { config } from 'zod';\nconfig({ jitless: true });\n",
      loader: 'js',
      resolveDir: catalogDist,
    }));
    pluginBuild.onLoad({ filter: /\.js$/ }, async (args) => {
      if (dirname(args.path) !== catalogDist) {
        return undefined;
      }
      const source = await readFile(args.path, 'utf8');
      return {
        contents: source.replace("import { z } from 'zod';", "import * as z from 'zod';"),
        loader: 'js',
      };
    });
  },
};

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Serves the catalog's generated modules cut down to `effective` (spec 165
 * D3, FR-004). Every module of the catalog reads its built-in catalog from a
 * generated module (`catalogData`, or the prose-free `catalogStructure` it is
 * built from), so each generated module that exports a catalog is replaced by
 * the same exports holding only the effective subset's entries. In a subset
 * document the validator, the renderer and the live surface then know the
 * subset and nothing else. A generated module that mixes a catalog with other
 * exports fails the build, and so does a build that replaced none: either
 * would leave the whole catalog in the document. `loaded.count` records the
 * replacements.
 */
function subsetCatalogPlugin(effective, loaded) {
  return {
    name: 'subset-catalog',
    setup(pluginBuild) {
      pluginBuild.onLoad({ filter: /\.js$/ }, async (args) => {
        if (dirname(args.path) !== generatedCatalogDir) {
          return undefined;
        }
        const exports = await import(pathToFileURL(args.path).href);
        const catalogs = Object.entries(exports).filter(
          ([, value]) => isRecord(value) && isRecord(value.components),
        );
        if (catalogs.length === 0) {
          return undefined;
        }
        if (catalogs.length !== Object.keys(exports).length) {
          throw new Error(
            `adapter-mcp-apps: ${args.path} exports more than a catalog; the subset document cannot replace it`,
          );
        }
        loaded.count += 1;
        const contents = catalogs.map(([name, catalog]) => {
          const components = Object.fromEntries(
            Object.entries(catalog.components).filter(([tag]) => effective.has(tag)),
          );
          return `export const ${name} = ${JSON.stringify({ ...catalog, components })};`;
        });
        return { contents: `${contents.join('\n')}\n`, loader: 'js' };
      });
    },
  };
}

// XML namespace names: `createElementNS` takes them verbatim as identifiers
// and never dereferences them. The only `http(s)://host` strings the document
// may contain.
const NAMESPACE_NAMES = new Set([
  'http://www.w3.org/1999/xhtml',
  'http://www.w3.org/1999/xlink',
  'http://www.w3.org/2000/svg',
]);

// Documentation links inside bundled dependency text: the "see …" tails of
// Stencil's diagnostics, and zod's JSON-Schema `$id` constants whenever its
// converters are bundled. No code path fetches them — the content policy
// forbids all network — but neutralizing them keeps the packaged document
// auditably free of ANY external origin, so a host's self-containment audit
// (S2) has nothing to reason about.
const INERT_REFERENCES = [
  /https?:\/\/json-schema\.org[^"'`\s)]*/g,
  /https:\/\/(?:chat\.)?stenciljs\.com[^"'`\s)]*/g,
  /https:\/\/github\.com\/stenciljs\/[^"'`\s)]*/g,
];
const EXTERNAL_ORIGIN = /https?:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+[^\s"'`)<>]*/gi;

/** Fails the build unless `text` can be the body of an inline `<tag>` element as is. */
function assertInlinable(tag, text) {
  const external = (text.match(EXTERNAL_ORIGIN) ?? []).filter((url) => !NAMESPACE_NAMES.has(url));
  if (external.length > 0) {
    // Fail closed: a dependency update that brings a new URL into the document
    // is a decision for a person, not something to ship or to rewrite blindly.
    throw new Error(
      `adapter-mcp-apps: the surface <${tag}> names an external origin: ${[...new Set(external)].join(', ')}`,
    );
  }
  // The digests in the content policy cover the text between the tags. Nothing
  // inside may end the element early, open an escaped section or be
  // normalized by the HTML tokenizer: the browser must hash the very string
  // that was hashed here.
  if (text.toLowerCase().includes(`</${tag}`) || text.includes('<!--') || text.includes('\r')) {
    throw new Error(`adapter-mcp-apps: the surface <${tag}> cannot be inlined verbatim`);
  }
}

async function bundleScript(tags, effective) {
  const loaded = { count: 0 };
  const result = await build({
    absWorkingDir: packageRoot,
    bundle: true,
    format: 'iife',
    legalComments: 'none',
    // A side-effect import that the elements package does not declare in
    // `sideEffects` is one esbuild removes: a component's own glyph went
    // missing from the document that way. Fail the build instead. (The
    // per-component modules ship a Stencil runtime whose unreachable lazy
    // import esbuild no longer reads as an empty glob, so no warning needs
    // silencing: packages/elements/scripts/vendor-stencil-client.mjs.)
    logOverride: { 'ignored-bare-import': 'error' },
    metafile: true,
    minify: true,
    platform: 'browser',
    plugins: [
      tsExtensionPlugin,
      ...(effective === undefined ? [] : [subsetCatalogPlugin(effective, loaded)]),
      validatorPlugin,
      stockSurfaceIconSelectionPlugin(packageRoot),
    ],
    stdin: {
      contents: entryOf(definitionModules(tags)),
      loader: 'js',
      resolveDir: packageRoot,
      sourcefile: 'surface-entry.js',
    },
    target: 'es2022',
    write: false,
  });
  if (effective !== undefined && loaded.count === 0) {
    // Fail closed: without the replacement the document would carry, and
    // validate against, the whole catalog.
    throw new Error(
      `adapter-mcp-apps: the subset document loaded no generated catalog module from ${generatedCatalogDir}`,
    );
  }
  let script = result.outputFiles[0].text;
  for (const reference of INERT_REFERENCES) {
    script = script.replace(reference, 'urn:kimen:inert-reference');
  }
  assertInlinable('script', script);
  return { script, packages: await bundledNpmPackages(result.metafile, packageRoot) };
}

async function bundleStyle() {
  const sheets = await Promise.all(tokenStylesheets.map((file) => readFile(file, 'utf8')));
  // The token stylesheet, then the page contract that consumes it (its
  // declared order), then the document's own two layout resets.
  const source = [...sheets, 'body{margin:0}#kimen-surface{display:block}'].join('\n');
  // Minify only — no `target`, so nothing is lowered or rewritten for an older
  // engine. Most of the token stylesheet's bytes are its per-token comments.
  const { code } = await transform(source, { loader: 'css', minify: true });
  const style = code.trim();
  assertInlinable('style', style);
  return style;
}

const digest = (text) => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;

/**
 * One surface document. Without `subset` it is the full document: every
 * catalog component registered, the generated catalog built in. With a
 * subset (spec 165) it registers the definitions of the effective subset and
 * of the waiting placeholder (FR-002), and its built-in catalog is the
 * effective subset alone (FR-004). Returns the HTML, the npm packages bundled
 * into its script, the registered tags, the glyph names it offers specs and,
 * for a subset, the effective subset and its catalog (the entries the
 * document's generated modules keep).
 */
export async function generateSurfaceDocument({ subset } = {}) {
  let tags;
  let catalog;
  let components;
  let effective;
  if (subset === undefined) {
    // The registered set IS the catalog (FR-011, Art. I): every component the
    // guarded renderer may render gets its definition, and nothing is
    // hand-listed. The native primitives (spec 037) are platform elements and
    // need none.
    tags = Object.keys(catalogData.components)
      .filter((tag) => !NATIVE_PRIMITIVE_TAGS.includes(tag))
      .sort();
  } else {
    components = resolveSubset(subset);
    effective = new Set(components);
    catalog = {
      ...catalogData,
      components: Object.fromEntries(
        Object.entries(catalogData.components).filter(([tag]) => effective.has(tag)),
      ),
    };
    tags = [
      ...new Set([
        ...components.filter((tag) => !NATIVE_PRIMITIVE_TAGS.includes(tag)),
        WAITING_PLACEHOLDER,
      ]),
    ].sort();
  }
  const [{ script, packages }, style] = await Promise.all([
    bundleScript(tags, effective),
    bundleStyle(),
  ]);

  // A content policy that references no external origin and admits exactly
  // the two inline elements below, by digest: an injected or smuggled script,
  // an inline handler, a style attribute and evaluated code are all refused
  // (defense in depth — safe even if the host does not enforce its own
  // policy, spec Assumptions).
  const csp = [
    "default-src 'none'",
    `script-src ${digest(script)}`,
    `style-src ${digest(style)}`,
    'img-src data:',
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<title>Kimen surface</title>
<style>${style}</style>
</head>
<body>
<div id="kimen-surface"></div>
<script>${script}</script>
</body>
</html>
`;
  // Every document imports the stock glyphs and declares them as the only
  // names a spec may use (spec 069 S14), so those names are what it offers.
  return { catalog, components, html, icons: [...stockSurfaceIconNames], packages, tags };
}
