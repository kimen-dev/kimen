import { describe, expect, it } from 'vitest';

import {
  checkPageWeight,
  compressedSizes,
  measurePage,
  PAGE_STYLESHEETS,
  PAGES,
  pageScript,
  pageStylesheet,
  sizeGateEsbuild,
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

describe('page-weight', () => {
  it('measures a page with a button and a page with ten common components', () => {
    expect(PAGES).toEqual({
      button: ['ki-button'],
      tenComponents: [
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
    });
    expect(Object.isFrozen(PAGES) && Object.isFrozen(PAGES.button)).toBe(true);
    expect(PAGE_STYLESHEETS).toEqual(['@kimen/tokens/css', '@kimen/tokens/css/base']);
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
    expect(pageStylesheet()).toBe(
      "@import '@kimen/tokens/css';\n@import '@kimen/tokens/css/base';\n",
    );
  });

  it('compresses with gzip 9 and brotli 11', () => {
    const sizes = compressedSizes('a'.repeat(1000));
    expect(sizes.raw).toBe(1000);
    expect(sizes.gzip).toBeLessThan(40);
    expect(sizes.brotli).toBeLessThan(sizes.gzip);
    expect(compressedSizes('é').raw).toBe(2);
  });

  it('bundles the script and the stylesheet for production and adds them up', async () => {
    const esbuild = fakeEsbuild({ js: () => 'x'.repeat(300), css: () => 'y'.repeat(100) });
    const sizes = await measurePage(['ki-button'], { esbuild, packageRoot });
    const js = compressedSizes('x'.repeat(300));
    const css = compressedSizes('y'.repeat(100));
    expect(sizes).toEqual({
      js,
      css,
      total: { raw: 400, gzip: js.gzip + css.gzip, brotli: js.brotli + css.brotli },
    });
    const common = {
      absWorkingDir: packageRoot,
      bundle: true,
      legalComments: 'none',
      logLevel: 'silent',
      minify: true,
      write: false,
    };
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
          contents: pageStylesheet(),
          loader: 'css',
          resolveDir: packageRoot,
          sourcefile: 'page.css',
        },
      },
    ]);
  });

  it('passes a page at its budget and fails one byte over', async () => {
    const esbuild = fakeEsbuild({ js: (contents) => contents, css: () => '' });
    const button = (await measurePage(PAGES.button, { esbuild, packageRoot })).total.brotli;
    const ten = (await measurePage(PAGES.tenComponents, { esbuild, packageRoot })).total.brotli;
    const results = await checkPageWeight({
      budgets: { button, tenComponents: ten - 1 },
      esbuild,
      packageRoot,
    });
    expect(results.map(({ page, limit, passed, tags }) => ({ page, limit, passed, tags }))).toEqual(
      [
        { page: 'button', limit: button, passed: true, tags: PAGES.button },
        { page: 'tenComponents', limit: ten - 1, passed: false, tags: PAGES.tenComponents },
      ],
    );
  });

  it.each([
    [{}],
    [{ button: 1 }],
    [{ button: 0, tenComponents: 1 }],
    [{ button: 1.5, tenComponents: 1 }],
  ])('refuses a missing or invalid budget %#', async (budgets) => {
    await expect(
      checkPageWeight({
        budgets,
        esbuild: fakeEsbuild({ js: () => '', css: () => '' }),
        packageRoot,
      }),
    ).rejects.toThrowError(
      /^page-weight: no brotli budget for the (?:button|tenComponents) page$/u,
    );
  });

  it("uses the size gate's own esbuild", () => {
    const esbuild = sizeGateEsbuild(new URL('../../packages/elements/', import.meta.url).pathname);
    expect(typeof esbuild.build).toBe('function');
    expect(esbuild.version).toMatch(/^\d+\.\d+\.\d+$/u);
  });
});
