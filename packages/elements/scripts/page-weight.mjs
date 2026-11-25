#!/usr/bin/env node
// Page weight: a size gate of @kimen/elements (`pnpm --filter @kimen/elements
// size`). What a page that uses Kimen downloads, bundled for production the
// way an application bundles it and compressed with brotli: the JavaScript of
// its components and the token stylesheets every page loads. The
// per-component budgets (run-size-limit.mjs) and the stylesheet budgets
// (packages/tokens/.size-limit.mjs) measure each part alone; nothing else
// sees what they add up to on a page.
//
// Two pages: one ki-button, and the ten components of a typical form or
// settings page. Their budgets are in scripts/lib/bundle-size-budget.mjs.
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PAGES = Object.freeze({
  button: Object.freeze(['ki-button']),
  tenComponents: Object.freeze([
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
});

// The stylesheets every page loads: the default theme and the page contract.
export const PAGE_STYLESHEETS = Object.freeze(['@kimen/tokens/css', '@kimen/tokens/css/base']);

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

export const pageStylesheet = () =>
  `${PAGE_STYLESHEETS.map((specifier) => `@import '${specifier}';`).join('\n')}\n`;

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

/** Bundles one page as an application does and measures its script, its stylesheet and both. */
export async function measurePage(tags, { esbuild, packageRoot }) {
  const common = {
    absWorkingDir: packageRoot,
    bundle: true,
    legalComments: 'none',
    logLevel: 'silent',
    minify: true,
    write: false,
  };
  const [script, stylesheet] = await Promise.all([
    esbuild.build({
      ...common,
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
    }),
    esbuild.build({
      ...common,
      external: ['*.woff2'],
      stdin: {
        contents: pageStylesheet(),
        loader: 'css',
        resolveDir: packageRoot,
        sourcefile: 'page.css',
      },
    }),
  ]);
  const js = compressedSizes(script.outputFiles.map(({ text }) => text).join(''));
  const css = compressedSizes(stylesheet.outputFiles.map(({ text }) => text).join(''));
  return { js, css, total: add(js, css) };
}

/** Measures every page against its brotli budget; the result says which exceed it. */
export async function checkPageWeight({ budgets, esbuild, packageRoot }) {
  const results = [];
  for (const [page, tags] of Object.entries(PAGES)) {
    const limit = budgets[page];
    if (!Number.isSafeInteger(limit) || limit <= 0) {
      throw new Error(`page-weight: no brotli budget for the ${page} page`);
    }
    const sizes = await measurePage(tags, { esbuild, packageRoot });
    results.push({ page, tags, limit, ...sizes, passed: sizes.total.brotli <= limit });
  }
  return results;
}

async function main() {
  const packageRoot = fileURLToPath(new URL('..', import.meta.url));
  const { readBundleSizeBudgets } = await import(
    pathToFileURL(resolve(packageRoot, '../../scripts/lib/bundle-size-budget.mjs')).href
  );
  const results = await checkPageWeight({
    budgets: readBundleSizeBudgets().pages,
    esbuild: sizeGateEsbuild(packageRoot),
    packageRoot,
  });
  for (const { page, tags, limit, js, css, total, passed } of results) {
    process.stdout.write(
      `${passed ? 'PASS' : 'FAIL'} ${page} page (${tags.join(', ')}): ${String(total.brotli)} B brotli of ${String(limit)} B (JS ${String(js.brotli)} B, CSS ${String(css.brotli)} B; ${String(total.raw)} B minified)\n`,
    );
  }
  const failed = results.filter(({ passed }) => !passed);
  if (failed.length > 0) {
    throw new Error(`${failed.map(({ page }) => page).join(', ')} over budget`);
  }
  process.stdout.write(`GATE page-weight: PASS (${String(results.length)} pages)\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`GATE page-weight: FAIL — ${error.message}\n`);
    process.exitCode = 1;
  });
}
