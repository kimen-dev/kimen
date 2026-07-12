// @spec:018-project-integrity-hardening#S8
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  browserSnippetContract,
  createBrowserModuleGraph,
  executableBrowserSnippets,
  extractExecutableSnippets,
  extractInstallExamples,
  moduleSpecifiers,
  readPackedLlmsFromTarball,
} from '../consumer-contract.mjs';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const consumerContract = join(repositoryRoot, 'scripts/consumer-contract.mjs');
const fixtureVersion = '9.8.7';
const hiddenImport = '@kimen/elements/dist/private.js';

const elementsModule = `
import{installButton}from'@kimen/elements/runtime';

const buttonStyles = \`
  button {
    background: var(--ki-button-secondary-neutral-rest-bg);
    color: var(--ki-button-secondary-neutral-rest-fg);
  }
\`;

export function defineCustomElement() {
  if (customElements.get('ki-button')) return;
  installButton(buttonStyles);
}
`;

const elementsRuntime = `
export function installButton(buttonStyles) {
  customElements.define(
    'ki-button',
    class extends HTMLElement {
      connectedCallback() {
        if (this.shadowRoot) return;
        const root = this.attachShadow({ mode: 'open' });
        root.innerHTML = \`<style>\${buttonStyles}</style><button part="button"><slot></slot></button>\`;
      }
    },
  );
}
`;

const elementsDeclaration = `export declare function defineCustomElement(): void;\n`;

const tokensCss = `
:root {
  --ki-button-secondary-neutral-rest-bg: rgb(12, 34, 56);
  --ki-button-secondary-neutral-rest-fg: rgb(250, 251, 252);
}
`;

function packageJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeFixtureFile(root, path, contents) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, 'utf8');
}

function fixtureEnvironment(fixture) {
  return {
    CI: 'true',
    COREPACK_HOME: fixture.corepackHome,
    HOME: fixture.home,
    LC_ALL: 'C',
    npm_config_audit: 'false',
    npm_config_cache: fixture.npmCache,
    npm_config_fund: 'false',
    npm_config_offline: 'true',
    PATH: process.env.PATH,
    PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH,
    PNPM_HOME: fixture.pnpmHome,
    XDG_CACHE_HOME: fixture.xdgCache,
  };
}

function diagnostic(result) {
  return `${result.stdout}\n${result.stderr}`;
}

test('@spec:018-project-integrity-hardening S8 parses minified, re-exported, and dynamic ESM specifiers', () => {
  assert.deepEqual(
    moduleSpecifiers(
      'import{x}from"@scope/minified";export{y}from"./re-export.js";import("dynamic-package");',
    ),
    ['@scope/minified', './re-export.js', 'dynamic-package'],
  );
});

test('@spec:018-project-integrity-hardening S8 derives executable browser code from the documented registration snippet', () => {
  const snippets = [
    [
      "import { defineCustomElement as defineKiButton } from '@kimen/elements/ki-button';",
      "import '@kimen/tokens/css';",
      'defineKiButton();',
    ].join('\n'),
    "const button: HTMLElement = document.createElement('ki-button');\ndocument.body.append(button);",
  ];

  const contract = browserSnippetContract(snippets);
  const source = executableBrowserSnippets(snippets, contract.tokenCssSpecifier);

  assert.deepEqual(contract, {
    elementSpecifier: '@kimen/elements/ki-button',
    tokenCssSpecifier: '@kimen/tokens/css',
  });
  assert.match(source, /defineKiButton\(\)/u);
  assert.match(source, /document\.createElement\('ki-button'\)/u);
  assert.doesNotMatch(source, /@kimen\/tokens\/css/u);
  assert.doesNotMatch(source, /: HTMLElement/u);
});

test('@spec:018-project-integrity-hardening S8 rejects unsupported JS or TS fences instead of silently skipping them', () => {
  assert.throws(
    () =>
      extractExecutableSnippets(
        '```js\naccepted();\n```\n```tsx\nconst skipped = <button />;\n```\n',
      ),
    /unsupported executable fence.*tsx/iu,
  );
});

test('@spec:018-project-integrity-hardening S8 rejects unterminated or alternate Markdown fences instead of omitting executable code', () => {
  const validSnippet = '```js\naccepted();\n```\n';

  assert.throws(
    () => extractExecutableSnippets(`${validSnippet}\n\`\`\`ts\nunclosed();\n`),
    /unterminated|unclosed|fence/iu,
  );
  assert.throws(
    () => extractExecutableSnippets(`${validSnippet}\n~~~tsx\nskipped();\n~~~\n`),
    /unsupported.*fence|fence.*unsupported/iu,
  );
  assert.throws(
    () => extractExecutableSnippets(`${validSnippet}\n\`\`\`\`ts\nskipped();\n\`\`\`\`\n`),
    /unsupported.*fence|fence.*unsupported/iu,
  );
});

test('@spec:018-project-integrity-hardening S8 rejects an install command hidden in an unsupported fence', () => {
  assert.throws(
    () =>
      extractInstallExamples(
        'Install with `pnpm add @kimen/elements @kimen/tokens`.\n```powershell\nnpm install @kimen/elements @kimen/tokens\n```\n',
      ),
    /unsupported installation fence.*powershell/iu,
  );
});

test('@spec:018-project-integrity-hardening S8 rejects installation guidance in unterminated or alternate fences', () => {
  const validInstall = 'Install with `pnpm add @kimen/elements @kimen/tokens`.\n';

  assert.throws(
    () =>
      extractInstallExamples(
        `${validInstall}\n~~~shell\nnpm install @kimen/elements @kimen/tokens\n~~~\n`,
      ),
    /fence/iu,
  );
  assert.throws(
    () =>
      extractInstallExamples(
        `${validInstall}\n\`\`\`shell\nnpm install @kimen/elements @kimen/tokens\n`,
      ),
    /unterminated|fence/iu,
  );
});

test('@spec:018-project-integrity-hardening S8 delays each browser completion marker until an async error checkpoint', () => {
  const source = executableBrowserSnippets(
    ["Promise.reject(new Error('late snippet failure'));"],
    '@kimen/tokens/css',
  );
  const checkpoint = source.indexOf('requestAnimationFrame');
  const completionMarker = source.indexOf('dataset');

  assert.ok(checkpoint >= 0, source);
  assert.ok(completionMarker > checkpoint, source);
});

test('@spec:018-project-integrity-hardening S8 rejects imported registration that is never executed', () => {
  assert.throws(
    () =>
      browserSnippetContract([
        "import { defineCustomElement } from '@kimen/elements/ki-button';\nimport '@kimen/tokens/css';",
      ]),
    /registration call/iu,
  );
});

test('@spec:018-project-integrity-hardening S8 maps a minified bare dependency before browser launch', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'kimen-browser-module-graph-'));
  t.after(() => rm(root, { force: true, recursive: true }));
  const packageRoot = join(root, 'node_modules/@kimen/elements');
  const metadata = {
    name: '@kimen/elements',
    exports: {
      './ki-button': './dist/ki-button.js',
      './runtime': './dist/runtime.js',
    },
  };
  await Promise.all([
    writeFixtureFile(packageRoot, 'package.json', packageJson(metadata)),
    writeFixtureFile(
      packageRoot,
      'dist/ki-button.js',
      "import{x}from'@kimen/elements/runtime';export const defineCustomElement=x;\n",
    ),
    writeFixtureFile(packageRoot, 'dist/runtime.js', 'export const x = () => {};\n'),
  ]);

  const graph = await createBrowserModuleGraph({
    consumerDirectory: root,
    elementSpecifier: '@kimen/elements/ki-button',
    elementTarget: './dist/ki-button.js',
    elements: { metadata, packageRoot },
  });

  assert.deepEqual(Object.keys(graph.importMap).sort(), [
    '@kimen/elements/ki-button',
    '@kimen/elements/runtime',
  ]);
  assert.equal(graph.roots.length, 1);
});

test('@spec:018-project-integrity-hardening S8 resolves an unhoisted pnpm dependency from the importing package virtual root', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'kimen-browser-pnpm-graph-'));
  t.after(() => rm(root, { force: true, recursive: true }));
  const consumer = join(root, 'consumer');
  const virtualStore = join(consumer, 'node_modules/.pnpm');
  const elementsRoot = join(virtualStore, '@kimen+elements@1.0.0/node_modules/@kimen/elements');
  const stencilRoot = join(virtualStore, '@stencil+core@4.43.5/node_modules/@stencil/core');
  const elementsLink = join(consumer, 'node_modules/@kimen/elements');
  const stencilLink = join(virtualStore, '@kimen+elements@1.0.0/node_modules/@stencil/core');
  const elementsMetadata = {
    name: '@kimen/elements',
    version: '1.0.0',
    exports: { './ki-button': './dist/ki-button.js' },
  };

  await Promise.all([
    writeFixtureFile(elementsRoot, 'package.json', packageJson(elementsMetadata)),
    writeFixtureFile(
      elementsRoot,
      'dist/ki-button.js',
      "import '@stencil/core/internal/client';\nexport const defineCustomElement = () => {};\n",
    ),
    writeFixtureFile(
      stencilRoot,
      'package.json',
      packageJson({
        name: '@stencil/core',
        version: '4.43.5',
        exports: { './internal/client': './internal/client/index.js' },
      }),
    ),
    writeFixtureFile(stencilRoot, 'internal/client/index.js', 'export const BUILD = {};\n'),
  ]);
  await Promise.all([
    mkdir(dirname(elementsLink), { recursive: true }),
    mkdir(dirname(stencilLink), { recursive: true }),
  ]);
  await Promise.all([
    symlink(elementsRoot, elementsLink, 'dir'),
    symlink(stencilRoot, stencilLink, 'dir'),
  ]);

  const graph = await createBrowserModuleGraph({
    consumerDirectory: consumer,
    elementSpecifier: '@kimen/elements/ki-button',
    elementTarget: './dist/ki-button.js',
    elements: { metadata: elementsMetadata, packageRoot: elementsRoot },
  });

  assert.deepEqual(Object.keys(graph.importMap).sort(), [
    '@kimen/elements/ki-button',
    '@stencil/core/internal/client',
  ]);
  assert.equal(graph.roots.length, 2);
  const stencilPhysicalRoot = await realpath(stencilRoot);
  assert.equal(
    graph.roots.some(({ root: packageRoot }) => packageRoot === stencilPhysicalRoot),
    true,
  );
});

test('@spec:018-project-integrity-hardening S8 rejects one bare package name resolving to ambiguous pnpm roots or versions', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'kimen-browser-pnpm-ambiguous-'));
  t.after(() => rm(root, { force: true, recursive: true }));
  const consumer = join(root, 'consumer');
  const modules = join(consumer, 'node_modules');
  const virtualStore = join(modules, '.pnpm');
  const elementsRoot = join(virtualStore, '@kimen+elements@1.0.0/node_modules/@kimen/elements');
  const packageARoot = join(virtualStore, 'package-a@1.0.0/node_modules/package-a');
  const packageBRoot = join(virtualStore, 'package-b@1.0.0/node_modules/package-b');
  const sharedV1Root = join(virtualStore, 'shared@1.0.0/node_modules/shared');
  const sharedV2Root = join(virtualStore, 'shared@2.0.0/node_modules/shared');
  const elementsMetadata = {
    name: '@kimen/elements',
    version: '1.0.0',
    exports: { './ki-button': './dist/ki-button.js' },
  };

  await Promise.all([
    writeFixtureFile(elementsRoot, 'package.json', packageJson(elementsMetadata)),
    writeFixtureFile(
      elementsRoot,
      'dist/ki-button.js',
      "import 'package-a';\nimport 'package-b';\nexport const defineCustomElement = () => {};\n",
    ),
    writeFixtureFile(
      packageARoot,
      'package.json',
      packageJson({ name: 'package-a', version: '1.0.0', exports: './index.js' }),
    ),
    writeFixtureFile(packageARoot, 'index.js', "import 'shared/value';\n"),
    writeFixtureFile(
      packageBRoot,
      'package.json',
      packageJson({ name: 'package-b', version: '1.0.0', exports: './index.js' }),
    ),
    writeFixtureFile(packageBRoot, 'index.js', "import 'shared/value';\n"),
    writeFixtureFile(
      sharedV1Root,
      'package.json',
      packageJson({
        name: 'shared',
        version: '1.0.0',
        exports: { './value': './value.js' },
      }),
    ),
    writeFixtureFile(sharedV1Root, 'value.js', 'export const value = 1;\n'),
    writeFixtureFile(
      sharedV2Root,
      'package.json',
      packageJson({
        name: 'shared',
        version: '2.0.0',
        exports: { './value': './value.js' },
      }),
    ),
    writeFixtureFile(sharedV2Root, 'value.js', 'export const value = 2;\n'),
  ]);

  const links = [
    [join(modules, '@kimen/elements'), elementsRoot],
    [join(modules, 'package-a'), packageARoot],
    [join(modules, 'package-b'), packageBRoot],
    [join(modules, 'shared'), sharedV1Root],
    [join(virtualStore, 'package-a@1.0.0/node_modules/shared'), sharedV1Root],
    [join(virtualStore, 'package-b@1.0.0/node_modules/shared'), sharedV2Root],
  ];
  await Promise.all(links.map(([link]) => mkdir(dirname(link), { recursive: true })));
  await Promise.all(links.map(([link, target]) => symlink(target, link, 'dir')));

  await assert.rejects(
    createBrowserModuleGraph({
      consumerDirectory: consumer,
      elementSpecifier: '@kimen/elements/ki-button',
      elementTarget: './dist/ki-button.js',
      elements: { metadata: elementsMetadata, packageRoot: elementsRoot },
    }),
    /ambiguous.*shared.*1\.0\.0.*2\.0\.0|shared.*(?:root|version).*ambiguous/iu,
  );
});

function packLocalPackage(fixture, packageDirectory) {
  const result = spawnSync(
    'npm',
    [
      'pack',
      packageDirectory,
      '--json',
      '--ignore-scripts',
      '--pack-destination',
      fixture.tarballs,
    ],
    {
      cwd: fixture.root,
      encoding: 'utf8',
      env: fixtureEnvironment(fixture),
    },
  );

  assert.equal(result.status, 0, diagnostic(result));
  const metadata = JSON.parse(result.stdout);
  assert.equal(metadata.length, 1, result.stdout);
  return join(fixture.tarballs, metadata[0].filename);
}

async function createConsumerFixture(
  t,
  {
    importPath = '@kimen/elements/ki-button',
    includeRegistration = true,
    includeRuntime = true,
    installCommands = null,
    installPackages = ['@kimen/elements', '@kimen/tokens'],
    javascriptSnippet = [
      "const button = document.createElement('ki-button');",
      "button.textContent = 'Continue';",
      'document.body.append(button);',
    ].join('\n'),
    packedLlms = true,
    tokenStyles = tokensCss,
  } = {},
) {
  const root = await mkdtemp(join(tmpdir(), 'kimen-consumer-contract-'));
  t.after(() => rm(root, { force: true, recursive: true }));

  const fixture = {
    root,
    consumer: join(root, 'consumer'),
    corepackHome: join(root, 'corepack'),
    elementsPackage: join(root, 'packages/elements'),
    home: join(root, 'home'),
    llms: join(root, 'llms.txt'),
    npmCache: join(root, 'cache/npm'),
    pnpmHome: join(root, 'pnpm-home'),
    report: join(root, 'consumer-report.json'),
    tarballs: join(root, 'tarballs'),
    tokensPackage: join(root, 'packages/tokens'),
    xdgCache: join(root, 'cache/xdg'),
  };

  const documentedInstallCommands = installCommands ?? [`pnpm add ${installPackages.join(' ')}`];

  const llmsText = [
    '# @kimen/elements fixture',
    '',
    ...documentedInstallCommands.map((command) => `Install with \`${command}\`.`),
    '',
    'Register the component and load the default onmars theme:',
    '',
    '```ts',
    `import { defineCustomElement as defineKiButton } from '${importPath}';`,
    "import '@kimen/tokens/css';",
    '',
    ...(includeRegistration ? ['defineKiButton();'] : []),
    '```',
    '',
    'Create the documented element after registration:',
    '',
    '```javascript',
    javascriptSnippet,
    '```',
    '',
    'The onmars tokens are the default theme.',
    '',
  ].join('\n');

  await Promise.all([
    mkdir(fixture.consumer, { recursive: true }),
    mkdir(fixture.corepackHome, { recursive: true }),
    mkdir(fixture.home, { recursive: true }),
    mkdir(fixture.npmCache, { recursive: true }),
    mkdir(fixture.pnpmHome, { recursive: true }),
    mkdir(fixture.tarballs, { recursive: true }),
    mkdir(fixture.xdgCache, { recursive: true }),
    writeFixtureFile(
      fixture.elementsPackage,
      'package.json',
      packageJson({
        name: '@kimen/elements',
        version: fixtureVersion,
        type: 'module',
        files: packedLlms ? ['dist', 'llms.txt'] : ['dist'],
        exports: {
          './ki-*': {
            types: './dist/ki-*.d.ts',
            import: './dist/ki-*.js',
          },
          './runtime': './dist/runtime.js',
        },
      }),
    ),
    writeFixtureFile(fixture.elementsPackage, 'dist/ki-button.js', elementsModule),
    writeFixtureFile(fixture.elementsPackage, 'dist/ki-button.d.ts', elementsDeclaration),
    ...(includeRuntime
      ? [writeFixtureFile(fixture.elementsPackage, 'dist/runtime.js', elementsRuntime)]
      : []),
    writeFixtureFile(fixture.elementsPackage, 'llms.txt', llmsText),
    writeFixtureFile(fixture.elementsPackage, 'dist/private.js', elementsModule),
    writeFixtureFile(fixture.elementsPackage, 'dist/private.d.ts', elementsDeclaration),
    writeFixtureFile(
      fixture.tokensPackage,
      'package.json',
      packageJson({
        name: '@kimen/tokens',
        version: fixtureVersion,
        type: 'module',
        files: ['dist'],
        exports: {
          './css': './dist/tokens.css',
        },
      }),
    ),
    writeFixtureFile(fixture.tokensPackage, 'dist/tokens.css', tokenStyles),
    writeFile(fixture.llms, llmsText, 'utf8'),
  ]);

  fixture.elementsTarball = packLocalPackage(fixture, fixture.elementsPackage);
  fixture.tokensTarball = packLocalPackage(fixture, fixture.tokensPackage);
  return fixture;
}

function runConsumerContract(fixture, environment = {}) {
  return spawnSync(
    process.execPath,
    [
      consumerContract,
      '--elements-tarball',
      fixture.elementsTarball,
      '--tokens-tarball',
      fixture.tokensTarball,
      '--llms',
      fixture.llms,
      '--consumer-dir',
      fixture.consumer,
      '--cache-dir',
      join(fixture.root, 'cache/consumer-contract'),
      '--report',
      fixture.report,
    ],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: { ...fixtureEnvironment(fixture), ...environment },
    },
  );
}

test('@spec:018-project-integrity-hardening S8 compiles every exported llms snippet from tarballs and renders a themed ki-button', async (t) => {
  const fixture = await createConsumerFixture(t);

  const result = runConsumerContract(fixture);

  assert.equal(result.status, 0, diagnostic(result));
  const report = JSON.parse(await readFile(fixture.report, 'utf8'));
  assert.equal(report.schemaVersion, 1);
  assert.deepEqual(report.installationExamples, [
    {
      command: 'pnpm add @kimen/elements @kimen/tokens',
      packages: ['@kimen/elements', '@kimen/tokens'],
    },
  ]);
  assert.deepEqual(report.installationRuns, [
    {
      command: 'pnpm add @kimen/elements @kimen/tokens',
      manager: 'pnpm',
      status: 'passed',
    },
  ]);
  assert.deepEqual(
    report.packages.map(({ name, source, workspaceLinked }) => ({
      name,
      source,
      workspaceLinked,
    })),
    [
      { name: '@kimen/elements', source: 'tarball', workspaceLinked: false },
      { name: '@kimen/tokens', source: 'tarball', workspaceLinked: false },
    ],
  );
  assert.equal(report.snippets.length, 2);
  assert.deepEqual(
    report.snippets.map(({ language, status }) => ({ language, status })),
    [
      { language: 'ts', status: 'passed' },
      { language: 'js', status: 'passed' },
    ],
  );
  assert.deepEqual(
    {
      customElementDefined: report.browser.customElementDefined,
      engine: report.browser.engine,
      executedSnippetCount: report.browser.executedSnippetCount,
      shadowButtonRendered: report.browser.shadowButtonRendered,
      tagName: report.browser.tagName,
      themeResolved: report.browser.themeResolved,
      themeCustomPropertiesResolved: report.browser.themeCustomPropertiesResolved,
      httpRequestPolicyEnforced: report.browser.httpRequestPolicyEnforced,
      networkPolicyScope: report.browser.networkPolicyScope,
      webSocketPolicyEnforced: report.browser.webSocketPolicyEnforced,
    },
    {
      customElementDefined: true,
      engine: 'chromium',
      executedSnippetCount: 2,
      shadowButtonRendered: true,
      tagName: 'ki-button',
      themeResolved: true,
      themeCustomPropertiesResolved: true,
      httpRequestPolicyEnforced: true,
      networkPolicyScope: ['http(s)-requests', 'websocket'],
      webSocketPolicyEnforced: true,
    },
  );

  const installedElements = join(fixture.consumer, 'node_modules/@kimen/elements/package.json');
  const installedPackage = JSON.parse(await readFile(installedElements, 'utf8'));
  assert.equal(installedPackage.version, fixtureVersion);
  assert.equal(
    await readFile(join(dirname(installedElements), 'dist/private.js'), 'utf8'),
    elementsModule,
  );

  const installedRealpath = await realpath(dirname(installedElements));
  const fixtureRealpath = await realpath(fixture.root);
  assert.equal(
    relative(repositoryRoot, installedRealpath).split(sep)[0] === '..',
    true,
    `installed package escaped into the workspace: ${installedRealpath}`,
  );
  assert.equal(installedRealpath.startsWith(fixtureRealpath + sep), true);
});

test('@spec:018-project-integrity-hardening S8 executes every documented pnpm and npm install after replacing package names with tarballs', async (t) => {
  const fixture = await createConsumerFixture(t, {
    importPath: hiddenImport,
    installCommands: [
      'pnpm add @kimen/elements @kimen/tokens',
      'npm install @kimen/elements @kimen/tokens',
    ],
  });

  const result = runConsumerContract(fixture);

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /non-exported|not exported/iu);
  await Promise.all([
    readFile(join(fixture.consumer, 'pnpm-lock.yaml'), 'utf8'),
    readFile(join(fixture.consumer, 'package-lock.json'), 'utf8'),
  ]);
});

test('@spec:018-project-integrity-hardening S8 rejects a physically packed llms import that is absent from package exports', async (t) => {
  const fixture = await createConsumerFixture(t, { importPath: hiddenImport });

  const result = runConsumerContract(fixture);

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /not exported|non-exported|package exports/i);
  assert.match(diagnostic(result), new RegExp(hiddenImport.replaceAll('.', '\\.')));
});

test('@spec:018-project-integrity-hardening S8 rejects unknown browser engines before consuming the candidate', async (t) => {
  const fixture = await createConsumerFixture(t);

  const result = runConsumerContract(fixture, { KIMEN_BROWSER_ENGINE: 'safari' });

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /KIMEN_BROWSER_ENGINE.*chromium.*firefox.*webkit.*safari/iu);
  await assert.rejects(readFile(fixture.report, 'utf8'));
});

test('@spec:018-project-integrity-hardening S8 rejects an llms file that is not the one shipped in the elements tarball', async (t) => {
  const fixture = await createConsumerFixture(t);
  await writeFile(fixture.llms, '# stale external guidance\n', 'utf8');

  const result = runConsumerContract(fixture);

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /llms.*(?:tarball|packed|bytes|mismatch)/iu);
});

test('@spec:018-project-integrity-hardening S8 rejects installation guidance for a package not backed by the tarballs', async (t) => {
  const fixture = await createConsumerFixture(t, {
    installPackages: ['@kimen/elements', '@kimen/wrong'],
  });

  const result = runConsumerContract(fixture);

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /installation.*@kimen\/wrong|@kimen\/wrong.*installation/iu);
});

test('@spec:018-project-integrity-hardening S8 rejects a pre-populated consumer directory', async (t) => {
  const fixture = await createConsumerFixture(t);
  await writeFile(join(fixture.consumer, 'stale-lock.json'), '{}\n', 'utf8');

  const result = runConsumerContract(fixture);

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /consumer directory.*(?:empty|clean)/iu);
});

test('@spec:018-project-integrity-hardening S8 rejects a clean-consumer path that is a symbolic link', async (t) => {
  const fixture = await createConsumerFixture(t);
  await rm(fixture.consumer, { force: true, recursive: true });
  await symlink(fixture.home, fixture.consumer, 'dir');

  const result = runConsumerContract(fixture);

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /consumer directory.*symbolic link/iu);
});

test('@spec:018-project-integrity-hardening S8 rejects guidance that imports registration but never calls it', async (t) => {
  const fixture = await createConsumerFixture(t, { includeRegistration: false });

  const result = runConsumerContract(fixture);

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /defineCustomElement|registration.*call/iu);
});

test('@spec:018-project-integrity-hardening S8 rejects a minified bare runtime import whose export target is absent', async (t) => {
  const fixture = await createConsumerFixture(t, { includeRuntime: false });

  const result = runConsumerContract(fixture);

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /runtime.*(?:absent|missing|export target)/iu);
});

test('@spec:018-project-integrity-hardening S8 rejects a documented theme stylesheet without the consumed button tokens', async (t) => {
  const fixture = await createConsumerFixture(t, {
    tokenStyles:
      '/* --ki-button-secondary-neutral-rest-bg: hotpink; --ki-button-secondary-neutral-rest-fg: white; */\n:root { --unrelated-token: hotpink; }\n',
  });

  const result = runConsumerContract(fixture);

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /theme.*(?:token|stylesheet)|button.*token/iu);
});

test('@spec:018-project-integrity-hardening S8 rejects a snippet that tries to manufacture missing theme sentinels', async (t) => {
  const fixture = await createConsumerFixture(t, {
    javascriptSnippet: [
      "document.documentElement.style.setProperty('--ki-button-secondary-neutral-rest-bg', 'rgb(12, 34, 56)');",
      "document.documentElement.style.setProperty('--ki-button-secondary-neutral-rest-fg', 'rgb(250, 251, 252)');",
      "document.body.append(document.createElement('ki-button'));",
    ].join('\n'),
    tokenStyles: ':root { --unrelated-token: hotpink; }\n',
  });

  const result = runConsumerContract(fixture);

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /theme.*(?:sentinel|token|stylesheet)|button.*token/iu);
});

test('@spec:018-project-integrity-hardening S8 rejects an unhandled asynchronous snippet error even after registration', async (t) => {
  const fixture = await createConsumerFixture(t, {
    javascriptSnippet: [
      "document.body.append(document.createElement('ki-button'));",
      "Promise.reject(new Error('late snippet failure'));",
    ].join('\n'),
  });

  const result = runConsumerContract(fixture);

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /page error|unhandled|late snippet failure/iu);
});

test('@spec:018-project-integrity-hardening S8 rejects a tarball whose llms entry is a symbolic link', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'kimen-consumer-tar-entry-'));
  t.after(() => rm(root, { force: true, recursive: true }));
  const archiveRoot = join(root, 'archive');
  const packageRoot = join(archiveRoot, 'package');
  const archive = join(root, 'elements.tgz');
  await mkdir(packageRoot, { recursive: true });
  await writeFile(join(packageRoot, 'guidance.txt'), '# guidance\n', 'utf8');
  await symlink('guidance.txt', join(packageRoot, 'llms.txt'));
  const packed = spawnSync('tar', ['-czf', archive, '-C', archiveRoot, 'package'], {
    encoding: 'utf8',
  });
  assert.equal(packed.status, 0, diagnostic(packed));

  assert.throws(() => readPackedLlmsFromTarball(archive), /regular.*llms|llms.*regular/iu);
});

test('@spec:018-project-integrity-hardening S8 rejects an elements tarball that omits its documented llms file', async (t) => {
  const fixture = await createConsumerFixture(t, { packedLlms: false });

  const result = runConsumerContract(fixture);

  assert.notEqual(result.status, 0);
  assert.match(diagnostic(result), /packed llms|llms.*(?:missing|tarball)/iu);
});
