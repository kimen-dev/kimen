// Generates the self-contained MCP Apps surface document (spec 030 FR-002,
// FR-007, FR-011, FR-013). The document is the WHOLE surface: an MCP server
// can hand a host nothing but this resource, so everything a Kimen surface
// needs is inline in it —
//
//   one <style>   the default token stylesheet and the page contract
//                 (@kimen/tokens), minified
//   one <script>  every catalog component definition and the selected glyphs
//                 (@kimen/elements), the guarded renderer and its validator
//                 (@kimen/catalog) and the host bridge (this package)
//
// and its content policy names exactly those two elements by digest: nothing
// else in the document can run or style, and nothing is fetchable.
//
// Deterministic: a pure transform of the dependency builds — no network, no
// date, no randomness, no machine path — so regeneration is byte-identical and
// a host's cached audit stays valid (S2). `--check` rebuilds in memory and
// fails unless the result equals the packaged document.
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync } from 'node:zlib';

import { catalogData, NATIVE_PRIMITIVE_TAGS } from '@kimen/catalog';
import { build, transform } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, '..');
const runtimeModule = resolve(packageRoot, 'src/surface-runtime.ts');
const outFile = resolve(packageRoot, 'src/generated/surface-document.ts');
const inventoryFile = resolve(packageRoot, 'src/generated/surface-packages.json');

// Build outputs of the workspace packages the document embeds. Like the
// catalog generator, this reads them by workspace path: they are build-time
// inputs of a prebuilt document, not runtime dependencies of the adapter (the
// Nx project declares both as implicit dependencies, so they are built first).
const elementsComponents = resolve(packageRoot, '../elements/dist/components');
const tokenStylesheets = ['tokens.css', 'base.css'].map((file) =>
  resolve(packageRoot, '../tokens/dist/css', file),
);
const catalogDist = dirname(fileURLToPath(import.meta.resolve('@kimen/catalog')));
const { bundledNpmPackages } = await import(
  new URL('../../../scripts/lib/bundled-package-inventory.mjs', import.meta.url).href
);
const { STOCK_SURFACE_ICON_SELECTION, stockSurfaceIconModules, stockSurfaceIconSelectionPlugin } =
  await import(new URL('../../../scripts/lib/stock-surface-icons.mjs', import.meta.url).href);

// The registered set IS the catalog (FR-011, Art. I): every component the
// guarded renderer may render gets its definition, and nothing is hand-listed.
// The native primitives (spec 037) are platform elements and need none.
const tags = Object.keys(catalogData.components)
  .filter((tag) => !NATIVE_PRIMITIVE_TAGS.includes(tag))
  .sort();
const componentModules = tags.map((tag) => {
  const file = resolve(elementsComponents, `${tag}.js`);
  if (!/^ki-[a-z0-9-]+$/u.test(tag) || !existsSync(file)) {
    throw new Error(
      `adapter-mcp-apps: catalog component "${tag}" has no built definition at ${file} — build @kimen/elements first`,
    );
  }
  return file;
});

// The document entry. Import order is evaluation order: the validator is
// configured before the catalog module that builds its schemas is evaluated.
const VALIDATOR_CONFIG = 'kimen-surface:validator-config';
const entry = [
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

async function bundleScript() {
  const result = await build({
    absWorkingDir: packageRoot,
    bundle: true,
    format: 'iife',
    legalComments: 'none',
    // Stencil's runtime carries the lazy loader's `import()` of per-component
    // chunks. This build registers the standalone definitions, so there are no
    // chunks and the call is unreachable; esbuild says so on every build.
    //
    // A side-effect import that the elements package does not declare in
    // `sideEffects` is one esbuild removes: a component's own glyph went
    // missing from the document that way. Fail the build instead.
    logOverride: { 'empty-glob': 'silent', 'ignored-bare-import': 'error' },
    metafile: true,
    minify: true,
    platform: 'browser',
    plugins: [tsExtensionPlugin, validatorPlugin, stockSurfaceIconSelectionPlugin(packageRoot)],
    stdin: {
      contents: entry,
      loader: 'js',
      resolveDir: packageRoot,
      sourcefile: 'surface-entry.js',
    },
    target: 'es2022',
    write: false,
  });
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

async function generateDocument() {
  const [{ script, packages }, style] = await Promise.all([bundleScript(), bundleStyle()]);

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
  return { html, packages };
}

const { html, packages } = await generateDocument();
const inventory = `${JSON.stringify(packages, null, 2)}\n`;
const module = `/**
 * GENERATED by scripts/generate-surface.mjs — do not edit.
 *
 * The self-contained MCP Apps surface document (spec 030): one HTML document
 * with every catalog component definition, the guarded renderer and the
 * default token stylesheet inlined, and a content policy that references no
 * external origin and admits only that script and that stylesheet, by digest.
 * Regeneration is byte-identical (S2).
 */
export const SURFACE_DOCUMENT = ${JSON.stringify(html)};
`;

const bytes = Buffer.from(html, 'utf8');
const size = `${bytes.length} B raw, ${gzipSync(bytes, { level: 9 }).length} B gzip, ${brotliCompressSync(bytes).length} B brotli, ${tags.length} components`;

if (process.argv.includes('--check')) {
  const packaged = existsSync(outFile) ? await readFile(outFile, 'utf8') : undefined;
  const packagedInventory = existsSync(inventoryFile)
    ? await readFile(inventoryFile, 'utf8')
    : undefined;
  if (packaged !== module || packagedInventory !== inventory) {
    console.error(
      'adapter-mcp-apps: the generated surface document or bundle inventory is stale — rebuild the package',
    );
    process.exit(1);
  }
  console.log(`adapter-mcp-apps: surface-document.ts is reproducible (${size})`);
} else {
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, module, 'utf8');
  await writeFile(inventoryFile, inventory, 'utf8');
  console.log(`adapter-mcp-apps: generated surface-document.ts (${size})`);
}
