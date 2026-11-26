import { describe, expect, it } from 'vitest';

import {
  checkPageWeight,
  compressedSizes,
  measureScript,
  measureStylesheet,
  PAGES,
  pageScript,
  pageStylesheet,
  sizeGateEsbuild,
  TOKEN_SETUPS,
} from '../../packages/elements/scripts/page-weight.mjs';

// The full-page weight gate of @kimen/elements.
const packageRoot = '/workspace/packages/elements';

// An esbuild stand-in that answers each build with the text it is given.
function fakeEsbuild(outputs) {
  const calls = [];
  return {
    calls,
    build: async (options) => {
      calls.push(options);
      const text = outputs[options.stdin.loader](options.stdin.contents);
      return { outputFiles: [{ text }] };
    },
  };
}

const common = {
  absWorkingDir: packageRoot,
  bundle: true,
  legalComments: 'none',
  logLevel: 'silent',
  minify: true,
  write: false,
};

const generous = { button: 1_000_000, tenComponents: 1_000_000 };

describe('page-weight', () => {
  it('measures a page with a button and a page with ten common components', () => {
    expect(PAGES).toEqual({
      button: { tags: ['ki-button'], sheets: ['ki-button'] },
      tenComponents: {
        tags: [
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
        ],
        sheets: [
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
        ],
      },
    });
    expect(
      Object.isFrozen(PAGES) && Object.isFrozen(PAGES.button) && Object.isFrozen(PAGES.button.tags),
    ).toBe(true);
    expect(Object.isFrozen(PAGES.tenComponents.sheets)).toBe(true);
  });

  it('measures the core and tag sheets first, then the full sheet', () => {
    expect(Object.keys(TOKEN_SETUPS)).toEqual(['pages', 'fullSheetPages']);
    expect(TOKEN_SETUPS.pages.label).toBe('core and tag sheets');
    expect(TOKEN_SETUPS.pages.stylesheets(['ki-select', 'ki-option'])).toEqual([
      '@kimen/tokens/css/core',
      '@kimen/tokens/css/ki-select',
      '@kimen/tokens/css/ki-option',
      '@kimen/tokens/css/base',
    ]);
    expect(TOKEN_SETUPS.fullSheetPages.label).toBe('full sheet');
    expect(TOKEN_SETUPS.fullSheetPages.stylesheets(['ki-select'])).toEqual([
      '@kimen/tokens/css',
      '@kimen/tokens/css/base',
    ]);
    expect(Object.isFrozen(TOKEN_SETUPS) && Object.isFrozen(TOKEN_SETUPS.pages)).toBe(true);
  });

  it('writes the application module and stylesheet of a page', () => {
    expect(pageScript(['ki-button', 'ki-card'])).toBe(
      [
        "import { defineCustomElement as define0 } from '@kimen/elements/ki-button';",
        "import { defineCustomElement as define1 } from '@kimen/elements/ki-card';",
        'define0();',
        'define1();',
        '',
      ].join('\n'),
    );
    expect(pageStylesheet(['@kimen/tokens/css/core', '@kimen/tokens/css/base'])).toBe(
      "@import '@kimen/tokens/css/core';\n@import '@kimen/tokens/css/base';\n",
    );
  });

  it('compresses with gzip 9 and brotli 11', () => {
    const sizes = compressedSizes('a'.repeat(1000));
    expect(sizes.raw).toBe(1000);
    expect(sizes.gzip).toBeLessThan(40);
    expect(sizes.brotli).toBeLessThan(sizes.gzip);
    expect(compressedSizes('é').raw).toBe(2);
  });

  it('bundles the script and the stylesheet for production', async () => {
    const esbuild = fakeEsbuild({ js: () => 'x'.repeat(300), css: () => 'y'.repeat(100) });
    const script = await measureScript(['ki-button'], { esbuild, packageRoot });
    const stylesheet = await measureStylesheet(['@kimen/tokens/css'], { esbuild, packageRoot });
    expect(script).toEqual(compressedSizes('x'.repeat(300)));
    expect(stylesheet).toEqual(compressedSizes('y'.repeat(100)));
    expect(esbuild.calls).toEqual([
      {
        ...common,
        define: { 'process.env.NODE_ENV': '"production"' },
        format: 'esm',
        platform: 'browser',
        stdin: {
          contents: pageScript(['ki-button']),
          loader: 'js',
          resolveDir: packageRoot,
          sourcefile: 'page.js',
        },
        target: 'es2022',
      },
      {
        ...common,
        external: ['*.woff2'],
        stdin: {
          contents: pageStylesheet(['@kimen/tokens/css']),
          loader: 'css',
          resolveDir: packageRoot,
          sourcefile: 'page.css',
        },
      },
    ]);
  });

  it('adds up each page with each token setup and bundles each page script once', async () => {
    const esbuild = fakeEsbuild({ js: (contents) => contents, css: (contents) => contents });
    const results = await checkPageWeight({
      budgets: { pages: generous, fullSheetPages: generous },
      esbuild,
      packageRoot,
    });
    expect(results.map(({ page, target, setup }) => [page, target, setup])).toEqual([
      ['button', 'pages', 'core and tag sheets'],
      ['tenComponents', 'pages', 'core and tag sheets'],
      ['button', 'fullSheetPages', 'full sheet'],
      ['tenComponents', 'fullSheetPages', 'full sheet'],
    ]);
    const [button] = results;
    const js = compressedSizes(pageScript(PAGES.button.tags));
    const css = compressedSizes(pageStylesheet(TOKEN_SETUPS.pages.stylesheets(['ki-button'])));
    expect(button).toMatchObject({
      tags: PAGES.button.tags,
      stylesheets: [
        '@kimen/tokens/css/core',
        '@kimen/tokens/css/ki-button',
        '@kimen/tokens/css/base',
      ],
      limit: generous.button,
      js,
      css,
      total: { raw: js.raw + css.raw, gzip: js.gzip + css.gzip, brotli: js.brotli + css.brotli },
      passed: true,
    });
    expect(results[3].stylesheets).toEqual(['@kimen/tokens/css', '@kimen/tokens/css/base']);
    expect(esbuild.calls.filter(({ stdin }) => stdin.loader === 'js')).toHaveLength(2);
    expect(esbuild.calls.filter(({ stdin }) => stdin.loader === 'css')).toHaveLength(4);
  });

  it('passes a page at its budget and fails one byte over, in each setup', async () => {
    const esbuild = fakeEsbuild({ js: (contents) => contents, css: (contents) => contents });
    const measured = await checkPageWeight({
      budgets: { pages: generous, fullSheetPages: generous },
      esbuild,
      packageRoot,
    });
    const brotli = (page, target) =>
      measured.find((result) => result.page === page && result.target === target).total.brotli;
    const results = await checkPageWeight({
      budgets: {
        pages: {
          button: brotli('button', 'pages'),
          tenComponents: brotli('tenComponents', 'pages') - 1,
        },
        fullSheetPages: {
          button: brotli('button', 'fullSheetPages') - 1,
          tenComponents: brotli('tenComponents', 'fullSheetPages'),
        },
      },
      esbuild,
      packageRoot,
    });
    expect(results.map(({ page, target, passed }) => [page, target, passed])).toEqual([
      ['button', 'pages', true],
      ['tenComponents', 'pages', false],
      ['button', 'fullSheetPages', false],
      ['tenComponents', 'fullSheetPages', true],
    ]);
  });

  it.each([
    [{}],
    [{ pages: generous }],
    [{ pages: { button: 1 }, fullSheetPages: generous }],
    [{ pages: { button: 0, tenComponents: 1 }, fullSheetPages: generous }],
    [{ pages: generous, fullSheetPages: { button: 1.5, tenComponents: 1 } }],
  ])('refuses a missing or invalid budget %#', async (budgets) => {
    await expect(
      checkPageWeight({
        budgets,
        esbuild: fakeEsbuild({ js: () => '', css: () => '' }),
        packageRoot,
      }),
    ).rejects.toThrowError(
      /^page-weight: no brotli budget for the (?:button|tenComponents) page in (?:pages|fullSheetPages)$/u,
    );
  });

  it("uses the size gate's own esbuild", () => {
    const esbuild = sizeGateEsbuild(new URL('../../packages/elements/', import.meta.url).pathname);
    expect(typeof esbuild.build).toBe('function');
    expect(esbuild.version).toMatch(/^\d+\.\d+\.\d+$/u);
  });
});
