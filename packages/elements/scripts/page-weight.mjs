#!/usr/bin/env node
// Page weight: a size gate of @kimen/elements (`pnpm --filter @kimen/elements
// size`). What a page that uses Kimen downloads, bundled for production the
// way an application bundles it and compressed with brotli: the JavaScript of
// its components and the token stylesheets it loads. The per-component
// budgets (run-size-limit.mjs) and the stylesheet budgets
// (packages/tokens/.size-limit.mjs) measure each part alone; nothing else
// sees what they add up to on a page.
//
// Two pages: one ki-button, and the ten components of a typical form or
// settings page. Each is measured with two token setups. The primary figure
// is the documented default: the core sheet and one sheet per tag the page
// writes (spec 166, the default since 2026-11-26). The second is the full
// sheet, the simple alternative, so a regression there still shows. Their
// budgets are in scripts/lib/bundle-size-budget.mjs, `pages` and
// `fullSheetPages`.
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

// `tags` are the components the page registers; `sheets` are the tags its
// markup writes, which are those and the children it slots into them. A tag
// sheet already carries the tokens of the tags its component renders itself.
export const PAGES = Object.freeze({
  button: Object.freeze({
    tags: Object.freeze(['ki-button']),
    sheets: Object.freeze(['ki-button']),
  }),
  tenComponents: Object.freeze({
    tags: Object.freeze([
      'ki-button',
      'ki-input',
      'ki-select',
      'ki-checkbox',
      'ki-dialog',
      'ki-card',
      'ki-tabs',
      'ki-alert',
      'ki-toast',
      'ki-table',
    ]),
    // The same page as the token budgets' (packages/tokens/size-limit).
    sheets: Object.freeze([
      'ki-button',
      'ki-input',
      'ki-select',
      'ki-option',
      'ki-checkbox',
      'ki-dialog',
      'ki-card',
      'ki-tabs',
      'ki-tab',
      'ki-tab-panel',
      'ki-alert',
      'ki-toast',
      'ki-toaster',
      'ki-table',
    ]),
  }),
});

// Each token setup by the budget it answers to, the primary one first.
export const TOKEN_SETUPS = Object.freeze({
  pages: Object.freeze({
    label: 'core and tag sheets',
    stylesheets: (sheets) => [
      '@kimen/tokens/css/core',
      ...sheets.map((tag) => `@kimen/tokens/css/${tag}`),
      '@kimen/tokens/css/base',
    ],
  }),
  fullSheetPages: Object.freeze({
    label: 'full sheet',
    stylesheets: () => ['@kimen/tokens/css', '@kimen/tokens/css/base'],
  }),
});

/** The application module of a page: registers each of `tags` from its own subpath. */
export function pageScript(tags) {
  return [
    ...tags.map(
      (tag, index) =>
        `import { defineCustomElement as define${String(index)} } from '@kimen/elements/${tag}';`,
    ),
    ...tags.map((_tag, index) => `define${String(index)}();`),
    '',
  ].join('\n');
}

/** The application stylesheet of a page: imports each of `specifiers` in order. */
export const pageStylesheet = (specifiers) =>
  `${specifiers.map((specifier) => `@import '${specifier}';`).join('\n')}\n`;

/** Raw, gzip (level 9) and brotli (quality 11) bytes of `text`. */
export function compressedSizes(text) {
  const bytes = Buffer.from(text, 'utf8');
  return {
    raw: bytes.length,
    gzip: gzipSync(bytes, { level: 9 }).length,
    brotli: brotliCompressSync(bytes, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 11,
        [constants.BROTLI_PARAM_SIZE_HINT]: bytes.length,
      },
    }).length,
  };
}

const add = (left, right) => ({
  raw: left.raw + right.raw,
  gzip: left.gzip + right.gzip,
  brotli: left.brotli + right.brotli,
});

/** The production bundler of the elements size gate. */
export function sizeGateEsbuild(packageRoot) {
  const require = createRequire(resolve(packageRoot, 'package.json'));
  const preset = createRequire(require.resolve('@size-limit/preset-small-lib'));
  return createRequire(preset.resolve('@size-limit/esbuild'))('esbuild');
}

const common = (packageRoot) => ({
  absWorkingDir: packageRoot,
  bundle: true,
  legalComments: 'none',
  logLevel: 'silent',
  minify: true,
  write: false,
});

const outputText = (result) => result.outputFiles.map(({ text }) => text).join('');

/** Bundles the script of a page that registers `tags`, as an application does, and measures it. */
export async function measureScript(tags, { esbuild, packageRoot }) {
  const script = await esbuild.build({
    ...common(packageRoot),
    define: { 'process.env.NODE_ENV': '"production"' },
    format: 'esm',
    platform: 'browser',
    stdin: {
      contents: pageScript(tags),
      loader: 'js',
      resolveDir: packageRoot,
      sourcefile: 'page.js',
    },
    target: 'es2022',
  });
  return compressedSizes(outputText(script));
}

/** Bundles the stylesheet of a page that imports `specifiers`, as an application does, and measures it. */
export async function measureStylesheet(specifiers, { esbuild, packageRoot }) {
  const stylesheet = await esbuild.build({
    ...common(packageRoot),
    external: ['*.woff2'],
    stdin: {
      contents: pageStylesheet(specifiers),
      loader: 'css',
      resolveDir: packageRoot,
      sourcefile: 'page.css',
    },
  });
  return compressedSizes(outputText(stylesheet));
}

/**
 * Measures every page with every token setup against that setup's brotli
 * budget, the primary setup first; the result says which exceed it.
 */
export async function checkPageWeight({ budgets, esbuild, packageRoot }) {
  const context = { esbuild, packageRoot };
  const scripts = new Map();
  const results = [];
  for (const [target, setup] of Object.entries(TOKEN_SETUPS)) {
    for (const [page, { tags, sheets }] of Object.entries(PAGES)) {
      const limit = budgets[target]?.[page];
      if (!Number.isSafeInteger(limit) || limit <= 0) {
        throw new Error(`page-weight: no brotli budget for the ${page} page in ${target}`);
      }
      if (!scripts.has(page)) scripts.set(page, await measureScript(tags, context));
      const js = scripts.get(page);
      const stylesheets = setup.stylesheets(sheets);
      const css = await measureStylesheet(stylesheets, context);
      const total = add(js, css);
      results.push({
        page,
        target,
        setup: setup.label,
        tags,
        stylesheets,
        limit,
        js,
        css,
        total,
        passed: total.brotli <= limit,
      });
    }
  }
  return results;
}

async function main() {
  const packageRoot = fileURLToPath(new URL('..', import.meta.url));
  const { readBundleSizeBudgets } = await import(
    pathToFileURL(resolve(packageRoot, '../../scripts/lib/bundle-size-budget.mjs')).href
  );
  const { pages, fullSheetPages } = readBundleSizeBudgets();
  const results = await checkPageWeight({
    budgets: { pages, fullSheetPages },
    esbuild: sizeGateEsbuild(packageRoot),
    packageRoot,
  });
  for (const { page, setup, tags, limit, js, css, total, passed } of results) {
    process.stdout.write(
      `${passed ? 'PASS' : 'FAIL'} ${page} page (${tags.join(', ')}), ${setup}: ${String(total.brotli)} B brotli of ${String(limit)} B (JS ${String(js.brotli)} B, CSS ${String(css.brotli)} B; ${String(total.raw)} B minified)\n`,
    );
  }
  const failed = results.filter(({ passed }) => !passed);
  if (failed.length > 0) {
    throw new Error(
      `${failed.map(({ page, setup }) => `${page} (${setup})`).join(', ')} over budget`,
    );
  }
  process.stdout.write(`GATE page-weight: PASS (${String(results.length)} page measures)\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`GATE page-weight: FAIL — ${error.message}\n`);
    process.exitCode = 1;
  });
}
