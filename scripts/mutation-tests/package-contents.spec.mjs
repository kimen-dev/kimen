import { describe, expect, it } from 'vitest';

import {
  packageContentRules,
  packageContentViolation,
  reachablePaths,
} from '../lib/package-contents.mjs';

// @spec:018-project-integrity-hardening#S7

const entriesOf = (files) =>
  Object.entries(files).map(([path, contents]) => ({
    name: `package/${path}`,
    type: '0',
    bytes: Buffer.from(contents),
  }));

const manifestOf = (fields) => JSON.stringify({ name: '@kimen/emitter', ...fields });

// A package whose one entry point imports `imports` (relative paths from dist/).
const aPackage = (
  files = {},
  { imports = [], manifest = { exports: './dist/index.js' } } = {},
) => ({
  'package.json': manifestOf(manifest),
  LICENSE: 'licence\n',
  NOTICE: 'notices\n',
  'dist/index.js': `${imports.map((path) => `import './${path}';`).join('\n')}\nexport {};\n`,
  ...files,
});

const check = (files, { name = '@kimen/emitter', packed = 100 } = {}) =>
  packageContentViolation(name, entriesOf(files), packed);

const reached = (files, manifest, assets = []) =>
  [
    ...reachablePaths(
      new Map(Object.entries(files).map(([path, text]) => [path, Buffer.from(text)])),
      manifest,
      assets,
    ),
  ].sort();

const embedded = (sources) =>
  JSON.stringify({
    version: 3,
    sources,
    sourcesContent: sources.map(() => 'source'),
    mappings: '',
  });

describe('package content rules', () => {
  it('S7 accepts a package whose every file an entry point reaches', () => {
    expect(check(aPackage())).toBeUndefined();
  });

  it('S7 refuses a package without rules or without a readable manifest', () => {
    expect(check(aPackage(), { name: '@kimen/unknown' })).toBe(
      '@kimen/unknown has no package content rules',
    );
    expect(check({ ...aPackage(), 'package.json': '{' })).toBe(
      '@kimen/emitter tarball has no readable package/package.json',
    );
    expect(check({ ...aPackage(), 'package.json': 'null' })).toBe(
      '@kimen/emitter tarball has no readable package/package.json',
    );
    const withoutManifest = aPackage();
    delete withoutManifest['package.json'];
    expect(check(withoutManifest)).toBe(
      '@kimen/emitter tarball has no readable package/package.json',
    );
  });

  it.each([
    ['dist/tsconfig.tsbuildinfo', 'TypeScript build info', 'keep tsBuildInfoFile outside'],
    ['dist/types/home/runner/x.d.ts', 'an absolute build path', 'compile only the package sources'],
    ['home/x.js', 'an absolute build path', 'compile only the package sources'],
    ['dist/Users/dev/x.js', 'an absolute build path', 'compile only the package sources'],
    ['dist/C:/x.js', 'an absolute build path', 'compile only the package sources'],
    ['dist/c:', 'an absolute build path', 'compile only the package sources'],
    [
      'dist/types/.stencil/x.d.ts',
      'Stencil build cache',
      'compile only the package sources, so nothing',
    ],
    ['dist/ki-x.stories.js', 'stories', 'keep stories out of the compiled program'],
    ['dist/ki-x.stories.d.ts', 'stories', 'keep stories out of the compiled program'],
    ['dist/ki-x.spec.js', 'tests', 'keep tests out of the compiled program'],
    ['dist/ki-x.test.mjs', 'tests', 'keep tests out of the compiled program'],
    ['dist/__screenshots__/a.png', 'tests', 'keep tests out of the compiled program'],
    ['dist/__snapshots__/a.snap', 'tests', 'keep tests out of the compiled program'],
    ['dist/__tests__/a.js', 'tests', 'keep tests out of the compiled program'],
    ['dist/browser-tests/a.js', 'tests', 'keep tests out of the compiled program'],
    ['dist/test/a.js', 'tests', 'keep tests out of the compiled program'],
    ['dist/tests/a.js', 'tests', 'keep tests out of the compiled program'],
    ['dist/fixtures/a.svg', 'fixtures', 'keep fixtures out of the compiled program'],
    ['dist/__fixtures__/a.json', 'fixtures', 'keep fixtures out of the compiled program'],
    ['dist/gallery.js', 'galleries', 'keep galleries out of the compiled program'],
    ['dist/galleries.js.map', 'galleries', 'keep galleries out of the compiled program'],
    [
      'dist/size-limit/a.js',
      'size-limit entries',
      'keep size-limit entries out of the compiled program',
    ],
  ])('S7 refuses %s as %s', (path, label, remedy) => {
    const message = check(aPackage({ [path]: 'export {};\n' }));
    expect(message?.startsWith(`@kimen/emitter tarball ships ${label} package/`)).toBe(true);
    expect(message).toContain(`package/${path}; ${remedy}`);
  });

  it('S7 accepts paths that only resemble a forbidden one', () => {
    const lookalikes = [
      'latest.js',
      'contest.d.ts',
      'homepage.js',
      'users/profile.js',
      'coverage.js',
      'storiesbook.js',
      'gallery-card.js',
      'fixture.js',
      'size-limit.js',
      'tests.js',
      'stencil.js',
      'cfg/a:b.js',
    ];
    const files = aPackage(Object.fromEntries(lookalikes.map((path) => [`dist/${path}`, ''])), {
      imports: lookalikes,
    });
    expect(check(files)).toBeUndefined();
  });

  it('S7 names the first five offending paths and counts the rest', () => {
    const stories = Object.fromEntries(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => [`dist/${id}.stories.js`, '']),
    );
    expect(check(aPackage(stories))).toBe(
      '@kimen/emitter tarball ships stories package/dist/a.stories.js, package/dist/b.stories.js, package/dist/c.stories.js, package/dist/d.stories.js, package/dist/e.stories.js and 2 more; keep stories out of the compiled program',
    );
    const five = Object.fromEntries(
      ['a', 'b', 'c', 'd', 'e'].map((id) => [`dist/${id}.stories.js`, '']),
    );
    expect(check(aPackage(five))).not.toContain('more');
  });

  it.each([
    ["import('/home/runner/work/x').X", true],
    ['"/Users/dev/x"', true],
    ['(C:\\work\\x)', true],
    ['= C:/work/x', true],
    ['`/home/runner`', true],
    ['https://example.com/home/page', false],
    ['see docs/Users/guide', false],
    ['ratio 4:3/2', false],
  ])('S7 a declaration containing %s names an absolute path: %s', (text, refused) => {
    const files = aPackage({ 'dist/index.d.ts': `export type T = ${text};\n` });
    const message = check(files);
    if (refused) {
      expect(message).toBe(
        '@kimen/emitter tarball ships declarations naming an absolute build path in package/dist/index.d.ts; emit declarations only for the package sources',
      );
    } else {
      expect(message).toBeUndefined();
    }
  });

  it('S7 reads absolute paths only in declarations', () => {
    expect(
      check(aPackage({ 'dist/index.js': 'export const p = "/home/runner/x";\n' })),
    ).toBeUndefined();
    expect(
      check(
        aPackage(
          { 'dist/index.d.mts': 'export type T = "/home/runner/x";\n' },
          { manifest: { exports: { types: './dist/index.d.mts', default: './dist/index.js' } } },
        ),
      ),
    ).toContain('declarations naming an absolute build path in package/dist/index.d.mts;');
  });

  it.each([
    ['/repo/src/index.ts'],
    ['C:\\repo\\src\\index.ts'],
    ['c:/repo/src/index.ts'],
    ['file:///repo/src/index.ts'],
  ])('S7 refuses a source map whose sources name %s', (source) => {
    const files = aPackage({
      'dist/index.js': 'export {};\n//# sourceMappingURL=index.js.map\n',
      'dist/index.js.map': embedded([source]),
    });
    expect(check(files)).toBe(
      '@kimen/emitter tarball ships source maps naming an absolute build path in package/dist/index.js.map; map the sources relative to the output',
    );
  });

  it.each([
    ['no sourcesContent', JSON.stringify({ version: 3, sources: ['../src/a.ts'], mappings: '' })],
    [
      'fewer contents than sources',
      JSON.stringify({ sources: ['../src/a.ts', '../src/b.ts'], sourcesContent: ['a'] }),
    ],
    ['a null content', JSON.stringify({ sources: ['../src/a.ts'], sourcesContent: [null] })],
    [
      'sourcesContent not a list',
      JSON.stringify({ sources: ['../src/a.ts'], sourcesContent: 'a' }),
    ],
    ['sources not a list', JSON.stringify({ sources: 'a', sourcesContent: ['a'] })],
    ['invalid JSON', '{'],
    ['a null map', 'null'],
  ])('S7 refuses a source map with %s', (_case, map) => {
    const files = aPackage({
      'dist/index.js': 'export {};\n//# sourceMappingURL=index.js.map\n',
      'dist/index.js.map': map,
    });
    expect(check(files)).toBe(
      '@kimen/emitter tarball ships source maps without their sources package/dist/index.js.map; embed sourcesContent (inlineSources) in every published source map',
    );
  });

  it('S7 accepts a source map that embeds every source, including none', () => {
    const files = aPackage({
      'dist/index.js': 'export {};\n//# sourceMappingURL=index.js.map\n',
      'dist/index.js.map': embedded(['../src/a.ts', '../src/b.ts']),
      'dist/empty.js': '//# sourceMappingURL=empty.js.map\n',
      'dist/empty.js.map': embedded([]),
    });
    files['dist/index.js'] = `import './empty.js';\n${files['dist/index.js']}`;
    expect(check(files)).toBeUndefined();
  });

  it('S7 refuses a file nothing reaches, and names it', () => {
    expect(check(aPackage({ 'dist/orphan.js': 'export {};\n' }))).toBe(
      '@kimen/emitter tarball ships files no export, manifest field, metadata asset or import reaches package/dist/orphan.js; stop packing them, or declare the entry point that uses them',
    );
  });

  it('S7 holds each package within its packed and unpacked budget, inclusive', () => {
    const { packed, unpacked } = packageContentRules['@kimen/emitter'].budget;
    const files = aPackage();
    const size = Object.values(files).reduce((total, text) => total + Buffer.byteLength(text), 0);
    expect(check(files, { packed })).toBeUndefined();
    expect(check(files, { packed: packed + 1 })).toBe(
      `@kimen/emitter tarball is ${packed + 1} B, over its ${packed} B budget; raising it needs the founder's approval`,
    );
    const padding = 'a'.repeat(unpacked - size);
    const atBudget = { ...files, 'dist/index.js': `${files['dist/index.js']}${padding}` };
    expect(check(atBudget)).toBeUndefined();
    const overBudget = { ...files, 'dist/index.js': `${files['dist/index.js']}${padding}a` };
    expect(check(overBudget)).toBe(
      `@kimen/emitter unpacks to ${unpacked + 1} B, over its ${unpacked} B budget; raising it needs the founder's approval`,
    );
  });

  it('S7 gives every release package rules and a positive budget', () => {
    expect(Object.keys(packageContentRules)).toEqual([
      '@kimen/elements',
      '@kimen/tokens',
      '@kimen/mcp-server',
      '@kimen/catalog',
      '@kimen/emitter',
      '@kimen/adapter-a2ui',
      '@kimen/adapter-mcp-apps',
      '@kimen/react',
      '@kimen/vue',
      '@kimen/angular',
    ]);
    for (const { budget } of Object.values(packageContentRules)) {
      expect(budget.packed).toBeGreaterThan(0);
      expect(budget.unpacked).toBeGreaterThan(budget.packed);
    }
  });

  it('S7 ignores entries that are not files under package/', () => {
    const entries = [
      ...entriesOf(aPackage()),
      { name: 'package/dist/folder/', type: '5', bytes: Buffer.alloc(0) },
      { name: 'other/dist/orphan.js', type: '0', bytes: Buffer.from('export {};') },
    ];
    expect(packageContentViolation('@kimen/emitter', entries, 100)).toBeUndefined();
  });
});

describe('package reachability', () => {
  const always = ['LICENSE', 'NOTICE', 'README.md', 'package.json'];

  it('S7 starts from package.json, the legal files, the README and the declared assets', () => {
    const files = Object.fromEntries(
      [...always, 'COMPAT.md', 'llms/a.md', 'llms/deep/b.md', 'llmsx/c.md', 'other.md'].map(
        (path) => [path, ''],
      ),
    );
    expect(reached(files, {}, ['COMPAT.md', 'llms/', 'missing.txt'])).toEqual(
      [...always, 'COMPAT.md', 'llms/a.md', 'llms/deep/b.md'].sort(),
    );
  });

  it('S7 follows every manifest field and every exports leaf', () => {
    const targets = [
      'main.js',
      'module.js',
      'types.d.ts',
      'typings.d.ts',
      'browser.js',
      'custom-elements.json',
      'bin.mjs',
      'bin-a.mjs',
      'bin-b.mjs',
      'root.js',
      'root.d.ts',
      'nested.js',
      'array-a.js',
      'array-b.js',
    ];
    const files = Object.fromEntries(
      ['package.json', ...targets, 'unused.js'].map((path) => [path, '']),
    );
    const manifestWithBin = (bin) => ({
      main: './main.js',
      module: 'module.js',
      types: './types.d.ts',
      typings: './typings.d.ts',
      browser: './browser.js',
      customElements: 'custom-elements.json',
      bin,
      exports: {
        '.': { types: './root.d.ts', import: './root.js' },
        './nested': { node: { import: './nested.js' } },
        './array': ['./array-a.js', './array-b.js'],
        './skip': null,
      },
      unpkg: './unused.js',
      sideEffects: ['./unused.js'],
    });
    const all = reached(files, manifestWithBin({ a: './bin-a.mjs', b: './bin-b.mjs' }));
    expect(all).toEqual(['package.json', ...targets.filter((path) => path !== 'bin.mjs')].sort());
    expect(reached(files, manifestWithBin('./bin.mjs'))).toContain('bin.mjs');
    expect(reached(files, { main: 1, exports: './root.js' })).toEqual([
      'package.json',
      'root.d.ts',
      'root.js',
    ]);
  });

  it('S7 expands an exports pattern across directories', () => {
    const files = { 'icons/a.js': '', 'icons/b/c.js': '', 'icons/d.css': '', 'iconsx.js': '' };
    expect(reached(files, { exports: { './icons/*': './icons/*.js' } })).toEqual([
      'icons/a.js',
      'icons/b/c.js',
    ]);
  });

  it('S7 an exports wildcard names at least one character and may hold several stars', () => {
    const files = {
      'icons/.js': '',
      'icons/a.js': '',
      'aba.js': '',
      'a.js': '',
      'x-1-y-2.css': '',
      'x-y.css': '',
      'x--y-.css': '',
      'x-1-y.css': '',
    };
    expect(
      reached(files, {
        exports: { './icons/*': './icons/*.js', './a': './a*a.js', './x': './x-*-y-*.css' },
      }),
    ).toEqual(['aba.js', 'icons/a.js', 'x-1-y-2.css'].sort());
  });

  it('S7 a template substitution stays within one segment and may be empty', () => {
    const files = {
      'index.js': 'import(`./${a}.entry.js`); import(`./${a}/${b}-x.js`);',
      '.entry.js': '',
      'one.entry.js': '',
      'deep/two.entry.js': '',
      'p/q-x.js': '',
      'p/q/r-x.js': '',
      'p/-x.js': '',
      'p/q-y.js': '',
    };
    expect(reached(files, { exports: './index.js' })).toEqual(
      ['.entry.js', 'index.js', 'one.entry.js', 'p/-x.js', 'p/q-x.js'].sort(),
    );
  });

  it('S7 follows static, side-effect, re-export and minified imports, with or without an extension', () => {
    const files = {
      'index.js': [
        "import a from './a.js';",
        "import './b.js';",
        "export * from './c.js';",
        'import{d}from"./d.js";',
        "import e from './e';",
        "import f from './f';",
        "import g from './g';",
        "import zod from 'zod';",
        "import outside from '../outside.js';",
      ].join('\n'),
      'a.js': '',
      'b.js': '',
      'c.js': '',
      'd.js': '',
      'e.js': '',
      'f.mjs': '',
      'g/index.js': '',
      'h.js': '',
    };
    expect(reached(files, { exports: './index.js' })).toEqual(
      ['index.js', 'a.js', 'b.js', 'c.js', 'd.js', 'e.js', 'f.mjs', 'g/index.js'].sort(),
    );
  });

  it('S7 follows dynamic imports, past comments, and template-literal imports as patterns', () => {
    const files = {
      'index.js': [
        "import('./a.js');",
        "import( /* chunk */ // line\n './b.js?v=1#x');",
        'import(`./c.js`);',
        'import(`./${id}.entry.js${query ? "?" + query : ""}`);',
        'import(`./lazy/${id}`);',
        'import(variable);',
        "import('./unterminated);",
        'import("./multi\nline.js");',
      ].join('\n'),
      'a.js': '',
      'b.js': '',
      'c.js': '',
      'x.entry.js': '',
      'y.entry.js': '',
      'y.entry.js.map': embedded([]),
      'sub/z.entry.js': '',
      'lazy/one.js': '',
      'multi\nline.js': '',
    };
    expect(reached(files, { exports: './index.js' })).toEqual(
      [
        'index.js',
        'a.js',
        'b.js',
        'c.js',
        'x.entry.js',
        'y.entry.js',
        'y.entry.js.map',
        'lazy/one.js',
      ].sort(),
    );
  });

  it('S7 an escaped character or an unterminated template stays a plain path', () => {
    const files = {
      'index.js': 'import(`./a\\`b.js`); import(`./never',
      'a`b.js': '',
    };
    expect(reached(files, { exports: './index.js' })).toEqual(['a`b.js', 'index.js']);
  });

  it('S7 follows require() and new URL(…, import.meta.url) from scripts only', () => {
    const files = {
      'index.js':
        "require('./a.js'); new URL('./asset.svg', import.meta.url); new URL('./b.svg', base);",
      'index.d.ts': "require('./c.js'); new URL('./d.svg', import.meta.url);",
      'a.js': '',
      'asset.svg': '',
      'b.svg': '',
      'c.js': '',
      'd.svg': '',
    };
    expect(reached(files, { exports: './index.js' })).toEqual(
      ['a.js', 'asset.svg', 'index.d.ts', 'index.js'].sort(),
    );
  });

  it('S7 follows source-map links from scripts, declarations and stylesheets', () => {
    const files = {
      'index.js': 'export {};\n//# sourceMappingURL=index.js.map\n',
      'index.js.map': '',
      'index.d.ts': 'export {};\n//@ sourceMappingURL=maps/index.d.ts.map\n',
      'maps/index.d.ts.map': '',
      'a.css': 'a{}\n/*# sourceMappingURL=a.css.map */',
      'a.css.map': '',
      'b.css': '/*# sourceMappingURL=https://cdn.example/b.css.map */',
      'b.css.map': '',
    };
    expect(
      reached(files, { exports: { '.': './index.js', './a': './a.css', './b': './b.css' } }),
    ).toEqual(
      [
        'a.css',
        'a.css.map',
        'b.css',
        'index.d.ts',
        'index.js',
        'index.js.map',
        'maps/index.d.ts.map',
      ].sort(),
    );
  });

  it('S7 follows stylesheet imports and relative urls, never data, remote or root urls', () => {
    const files = {
      'index.css': [
        "@import './a.css';",
        '@import url("b.css");',
        '@import url(c.css);',
        "src: url('../fonts/f.woff2') format('woff2');",
        'src: url(g.woff2);',
        'background: url(data:image/png;base64,AAA);',
        'background: url(https://example.com/h.png);',
        'background: url(/root.png);',
        'background: url(#fragment);',
      ].join('\n'),
      'a.css': '',
      'b.css': '',
      'c.css': '',
      'g.woff2': '',
      'root.png': '',
    };
    const withFonts = {
      ...Object.fromEntries(Object.entries(files).map(([k, v]) => [`css/${k}`, v])),
      'fonts/f.woff2': '',
    };
    expect(reached(withFonts, { exports: './css/index.css' })).toEqual(
      [
        'css/a.css',
        'css/b.css',
        'css/c.css',
        'css/g.woff2',
        'css/index.css',
        'fonts/f.woff2',
      ].sort(),
    );
  });

  it('S7 resolves declaration imports to declaration files', () => {
    const files = {
      'index.d.ts': [
        "export * from './a.js';",
        "export type B = import('./b').B;",
        '/// <reference path="./c.d.ts" />',
        "export * from './dir';",
        "export * from './e.mjs';",
        "export * from './f.ts';",
        "export * from './g.json';",
      ].join('\n'),
      'a.d.ts': '',
      'b.d.ts': '',
      'c.d.ts': '',
      'dir/index.d.ts': '',
      'e.d.mts': '',
      'f.d.ts': '',
      'g.json': '',
    };
    expect(reached(files, { types: './index.d.ts' })).toEqual(Object.keys(files).sort());
  });

  it('S7 reaches a module with its declaration and a declaration with its module', () => {
    const files = {
      'a.js': '',
      'a.d.ts': '',
      'b.mjs': '',
      'b.d.mts': '',
      'c.d.cts': '',
      'c.cjs': '',
      'd.d.ts': '',
    };
    expect(
      reached(files, {
        exports: { './a': './a.js', './b': './b.mjs', './c': { types: './c.d.cts' } },
      }),
    ).toEqual(['a.d.ts', 'a.js', 'b.d.mts', 'b.mjs', 'c.cjs', 'c.d.cts'].sort());
  });
});
