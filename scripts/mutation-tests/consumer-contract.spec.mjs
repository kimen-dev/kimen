import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, onTestFinished } from 'vitest';

import * as consumerContractModule from '../consumer-contract.mjs';

import {
  browserContentType,
  browserDocument,
  browserRequestTarget,
  browserSnippetContract,
  createBrowserModuleGraph,
  createInstallInvocation,
  executableBrowserSnippets,
  exportedTarget,
  extractExecutableSnippets,
  extractInstallExamples,
  loadInstalledPackage,
  moduleSpecifiers,
  packageAndSubpath,
  parseArguments,
  resolvePackageFile,
  selectedBrowserEngine,
} from '../consumer-contract.mjs';

// @spec:018-project-integrity-hardening#S8
const workspaceElements = fileURLToPath(new URL('../../packages/elements/', import.meta.url));

async function temporaryRoot() {
  const root = await mkdtemp(join(tmpdir(), 'kimen-consumer-mutation-'));
  onTestFinished(() => rm(root, { force: true, recursive: true }));
  return root;
}

async function put(root, path, contents) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, 'utf8');
  return target;
}

function fakePlaywrightBoundary() {
  const state = {
    browserClosed: false,
    documentBody: '',
    fulfilledModules: 0,
    scriptAdded: false,
    themeReadBeforeScript: false,
  };
  const tokens = new Map();
  const dataset = {};
  const button = {};
  const host = {
    shadowRoot: { querySelector: (selector) => (selector === 'button' ? button : null) },
    tagName: 'KI-BUTTON',
  };
  const definedElements = new Map();
  const documentElement = {
    dataset,
    style: {
      setProperty: (name, value) => tokens.set(name, value),
    },
  };
  let renderedHost = host;
  const document = {
    body: {
      append: (element) => {
        renderedHost = element;
      },
    },
    createElement: (name) =>
      name === 'ki-button'
        ? {
            ...host,
            textContent: '',
          }
        : { tagName: name.toUpperCase() },
    documentElement,
    querySelector: (selector) => (selector === 'ki-button' ? renderedHost : null),
  };
  let httpHandler;
  let webSocketHandler;

  const dispatchHttp = async (url) => {
    const outcome = { aborted: false, fulfilled: false };
    await httpHandler({
      abort: async () => {
        outcome.aborted = true;
      },
      fulfill: async ({ body, contentType, status }) => {
        expect(status).toBe(200);
        expect(typeof contentType).toBe('string');
        outcome.fulfilled = true;
        if (url.endsWith('/index.html')) state.documentBody = String(body);
        else state.fulfilledModules += 1;
      },
      request: () => ({ url: () => url }),
    });
    return outcome;
  };

  class FakeWebSocket {
    constructor(url) {
      this.url = url;
      this.listeners = new Map();
      globalThis.queueMicrotask(async () => {
        await webSocketHandler({
          close: async () => this.emit('close'),
          url: () => url,
        });
        this.emit('error');
      });
    }

    addEventListener(name, listener) {
      this.listeners.set(name, listener);
    }

    emit(name) {
      this.listeners.get(name)?.();
    }
  }

  const browserGlobals = {
    customElements: {
      get: (name) => definedElements.get(name),
    },
    document,
    fetch: async (url) => {
      const outcome = await dispatchHttp(url);
      if (outcome.aborted) throw new Error('blocked request');
      return { ok: true };
    },
    getComputedStyle: (element) => {
      if (element === documentElement) {
        state.themeReadBeforeScript ||= !state.scriptAdded;
        return { getPropertyValue: (name) => tokens.get(name) ?? '' };
      }
      if (element === button) {
        return {
          backgroundColor:
            tokens.get('--ki-button-secondary-neutral-rest-bg') ?? 'rgba(0, 0, 0, 0)',
          color: tokens.get('--ki-button-secondary-neutral-rest-fg') ?? 'rgba(0, 0, 0, 0)',
        };
      }
      return { getPropertyValue: () => '' };
    },
    requestAnimationFrame: (callback) => {
      callback();
      return 1;
    },
    WebSocket: FakeWebSocket,
  };

  const withGlobals = async (callback, argument) => {
    const previous = new Map();
    for (const [name, value] of Object.entries(browserGlobals)) {
      previous.set(name, globalThis[name]);
      globalThis[name] = value;
    }
    try {
      return await callback(argument);
    } finally {
      for (const [name, value] of previous) {
        if (value === undefined) Reflect.deleteProperty(globalThis, name);
        else globalThis[name] = value;
      }
    }
  };

  const page = {
    addScriptTag: async ({ content, type }) => {
      expect(type).toBe('module');
      state.scriptAdded = true;
      const moduleUrls = [
        ...new Set(
          [
            ...state.documentBody.matchAll(
              /https:\/\/consumer\.kimen\.invalid\/modules\/\d+\/[^"<]+/gu,
            ),
          ].map((match) => match[0]),
        ),
      ];
      for (const url of moduleUrls) {
        const outcome = await dispatchHttp(url);
        if (outcome.aborted) throw new Error(`module request blocked: ${url}`);
      }
      for (const match of content.matchAll(/kimenSnippet(\d+)/gu)) {
        dataset[`kimenSnippet${match[1]}`] = 'executed';
      }
      definedElements.set('ki-button', Object.freeze({}));
    },
    addStyleTag: async ({ content }) => {
      for (const match of content.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/giu)) {
        tokens.set(match[1], match[2].trim());
      }
    },
    evaluate: (callback, argument) => withGlobals(callback, argument),
    goto: async (url) => {
      const outcome = await dispatchHttp(url);
      expect(outcome).toEqual({ aborted: false, fulfilled: true });
    },
    on: (name, listener) => {
      expect(name).toBe('pageerror');
      expect(listener).toBeTypeOf('function');
    },
    waitForFunction: async (callback, argument) => {
      expect(await withGlobals(callback, argument)).toBeTruthy();
    },
  };
  const context = {
    newPage: async () => page,
    route: async (_pattern, handler) => {
      httpHandler = handler;
    },
    routeWebSocket: async (_pattern, handler) => {
      webSocketHandler = handler;
    },
  };
  const browser = {
    close: async () => {
      state.browserClosed = true;
    },
    newContext: async ({ serviceWorkers }) => {
      expect(serviceWorkers).toBe('block');
      return context;
    },
  };
  const launch = async ({ headless }) => {
    expect(headless).toBe(true);
    return browser;
  };
  return {
    playwright: { chromium: { launch }, firefox: { launch }, webkit: { launch } },
    state,
  };
}

const validBrowserObservation = Object.freeze({
  backgroundColor: 'rgb(12, 34, 56)',
  color: 'rgb(250, 251, 252)',
  customElementDefined: true,
  executedSnippetCount: 2,
  overriddenBackgroundColor: 'rgb(1, 2, 3)',
  overriddenColor: 'rgb(254, 253, 252)',
  shadowButtonRendered: true,
  tagName: 'ki-button',
});

const validBrowserPolicy = Object.freeze({
  engine: 'chromium',
  httpRequestPolicyEnforced: true,
  sentinelsResolved: true,
  webSocketPolicyEnforced: true,
});

describe('packed consumer mutation boundary', () => {
  it('S8 orchestrates the exact packed guidance through install, compile, browser, and report boundaries', async () => {
    expect(consumerContractModule.executeConsumerContract).toBeTypeOf('function');
    const llms = Buffer.from(
      [
        'Install with `pnpm add @kimen/elements @kimen/tokens`.',
        '```ts',
        "import { defineCustomElement } from '@kimen/elements/ki-button';",
        "import '@kimen/tokens/css';",
        'defineCustomElement();',
        '```',
        '```js',
        "document.body.append(document.createElement('ki-button'));",
        '```',
      ].join('\n'),
    );
    const options = {
      'elements-tarball': '/candidate/elements.tgz',
      'tokens-tarball': '/candidate/tokens.tgz',
      llms: '/candidate/llms.txt',
      'consumer-dir': '/outside/consumer',
      'cache-dir': '/outside/cache',
      report: '/outside/report.json',
    };
    const calls = [];
    let reportContents = null;
    const installed = new Map([
      [
        '@kimen/elements',
        {
          metadata: { name: '@kimen/elements' },
          packageRoot: '/outside/consumer/node_modules/@kimen/elements',
        },
      ],
      [
        '@kimen/tokens',
        {
          metadata: { name: '@kimen/tokens' },
          packageRoot: '/outside/consumer/node_modules/@kimen/tokens',
        },
      ],
    ]);
    const runtime = {
      selectBrowserEngine: () => {
        calls.push('engine');
        return 'webkit';
      },
      requireRegularFile: async (path, label) => calls.push(`regular:${label}:${path}`),
      mkdir: async (path) => calls.push(`mkdir:${path}`),
      readFile: async (path) => {
        calls.push(`read:${path}`);
        return llms;
      },
      readPackedLlmsFromTarball: () => {
        calls.push('archive');
        return llms;
      },
      installTarballs: async (_options, examples) => {
        calls.push(`install:${examples.length}`);
        return {
          consumerDirectory: '/outside/consumer',
          installationRuns: [{ command: examples[0].command, manager: 'pnpm', status: 'passed' }],
        };
      },
      loadInstalledPackage: async (_consumerDirectory, name) => {
        calls.push(`package:${name}`);
        return installed.get(name);
      },
      realpath: async (path) => path,
      assertImportsAreExported: async (snippets) => calls.push(`exports:${snippets.length}`),
      compileSnippets: async (snippets) => {
        calls.push(`compile:${snippets.length}`);
        return snippets.map(({ language }, index) => ({
          index: index + 1,
          language,
          status: 'passed',
        }));
      },
      runBrowserSmoke: async ({ engine, expectedSnippetCount }) => {
        calls.push(`browser:${engine}:${expectedSnippetCount}`);
        return { engine, executedSnippetCount: expectedSnippetCount, themeResolved: true };
      },
      writeFile: async (path, contents) => {
        calls.push(`write:${path}`);
        reportContents = contents;
      },
    };

    const report = await consumerContractModule.executeConsumerContract(options, runtime);

    expect(calls).toEqual([
      'engine',
      'regular:elements tarball:/candidate/elements.tgz',
      'regular:tokens tarball:/candidate/tokens.tgz',
      'regular:llms.txt:/candidate/llms.txt',
      'mkdir:/outside',
      'read:/candidate/llms.txt',
      'archive',
      'install:1',
      'package:@kimen/elements',
      'package:@kimen/tokens',
      'regular:packed llms.txt:/outside/consumer/node_modules/@kimen/elements/llms.txt',
      'read:/outside/consumer/node_modules/@kimen/elements/llms.txt',
      'exports:2',
      'compile:2',
      'browser:webkit:2',
      'write:/outside/report.json',
    ]);
    expect(report).toMatchObject({
      schemaVersion: 1,
      browser: { engine: 'webkit', executedSnippetCount: 2, themeResolved: true },
      packages: [
        { name: '@kimen/elements', source: 'tarball', workspaceLinked: false },
        { name: '@kimen/tokens', source: 'tarball', workspaceLinked: false },
      ],
      snippets: [
        { index: 1, language: 'ts', status: 'passed' },
        { index: 2, language: 'js', status: 'passed' },
      ],
    });
    expect(JSON.parse(reportContents)).toEqual(report);
  });

  it('S8 orchestration rejects mismatched external guidance before install', async () => {
    expect(consumerContractModule.executeConsumerContract).toBeTypeOf('function');
    let installed = false;
    const options = {
      'elements-tarball': '/candidate/elements.tgz',
      'tokens-tarball': '/candidate/tokens.tgz',
      llms: '/candidate/llms.txt',
      'consumer-dir': '/outside/consumer',
      'cache-dir': '/outside/cache',
      report: '/outside/report.json',
    };
    const runtime = {
      selectBrowserEngine: () => 'chromium',
      requireRegularFile: async () => undefined,
      mkdir: async () => undefined,
      readFile: async () => Buffer.from('external'),
      readPackedLlmsFromTarball: () => Buffer.from('packed'),
      installTarballs: async () => {
        installed = true;
      },
    };

    await expect(consumerContractModule.executeConsumerContract(options, runtime)).rejects.toThrow(
      /llms.*bytes.*tarball/iu,
    );
    expect(installed).toBe(false);
  });

  it('S8 exercises browser routing, pre-snippet theme sentinels, rendering and scoped network evidence through an injected browser', async () => {
    expect(consumerContractModule.runBrowserSmoke).toBeTypeOf('function');
    const root = await temporaryRoot();
    const consumer = join(root, 'consumer');
    const elementsRoot = join(consumer, 'node_modules/@kimen/elements');
    const tokensRoot = join(consumer, 'node_modules/@kimen/tokens');
    const elementsMetadata = {
      name: '@kimen/elements',
      version: '1.0.0',
      exports: { './ki-button': './dist/ki-button.js' },
    };
    const tokensMetadata = {
      name: '@kimen/tokens',
      version: '1.0.0',
      exports: { './css': './dist/tokens.css' },
    };
    await Promise.all([
      put(elementsRoot, 'package.json', JSON.stringify(elementsMetadata)),
      put(elementsRoot, 'dist/ki-button.js', 'export const defineCustomElement = () => {};\n'),
      put(tokensRoot, 'package.json', JSON.stringify(tokensMetadata)),
      put(
        tokensRoot,
        'dist/tokens.css',
        ':root { --ki-button-secondary-neutral-rest-bg: rgb(12, 34, 56); --ki-button-secondary-neutral-rest-fg: rgb(250, 251, 252); }\n',
      ),
    ]);
    const fake = fakePlaywrightBoundary();

    const result = await consumerContractModule.runBrowserSmoke(
      {
        browserSource: [
          "globalThis.document.documentElement.dataset['kimenSnippet1'] = 'executed';",
          "globalThis.document.documentElement.dataset['kimenSnippet2'] = 'executed';",
        ].join('\n'),
        consumerDirectory: consumer,
        elementSpecifier: '@kimen/elements/ki-button',
        engine: 'chromium',
        expectedSnippetCount: 2,
        installedPackages: new Map([
          ['@kimen/elements', { metadata: elementsMetadata, packageRoot: elementsRoot }],
          ['@kimen/tokens', { metadata: tokensMetadata, packageRoot: tokensRoot }],
        ]),
        tokenCssSpecifier: '@kimen/tokens/css',
      },
      { loadPlaywright: () => fake.playwright },
    );

    expect(result).toEqual({
      customElementDefined: true,
      engine: 'chromium',
      executedSnippetCount: 2,
      httpRequestPolicyEnforced: true,
      networkPolicyScope: ['http(s)-requests', 'websocket'],
      shadowButtonRendered: true,
      tagName: 'ki-button',
      themeCustomPropertiesResolved: true,
      themeResolved: true,
      themeTokenOverrideResolved: true,
      webSocketPolicyEnforced: true,
    });
    expect(fake.state).toMatchObject({
      browserClosed: true,
      fulfilledModules: 1,
      scriptAdded: true,
      themeReadBeforeScript: true,
    });
  });

  it('S8 derives complete passing evidence only from distinct resolved theme colors and exact overrides', () => {
    const evidence = consumerContractModule.createBrowserEvidence(
      validBrowserObservation,
      validBrowserPolicy,
    );

    expect(evidence).toEqual({
      customElementDefined: true,
      engine: 'chromium',
      executedSnippetCount: 2,
      httpRequestPolicyEnforced: true,
      networkPolicyScope: ['http(s)-requests', 'websocket'],
      shadowButtonRendered: true,
      tagName: 'ki-button',
      themeCustomPropertiesResolved: true,
      themeResolved: true,
      themeTokenOverrideResolved: true,
      webSocketPolicyEnforced: true,
    });
    expect(consumerContractModule.requirePassingBrowserEvidence(evidence, 2)).toBe(evidence);
  });

  it.each([
    ['wrong tag', {}, {}, { tagName: 'div' }],
    ['undefined custom element', {}, {}, { customElementDefined: false }],
    ['missing shadow button', {}, {}, { shadowButtonRendered: false }],
    ['wrong snippet count', {}, {}, { executedSnippetCount: 1 }],
    ['missing theme sentinel', {}, { sentinelsResolved: false }, {}],
    ['null background', { backgroundColor: null }, {}, {}],
    ['null foreground', { color: null }, {}, {}],
    ['empty background', { backgroundColor: '' }, {}, {}],
    ['empty foreground', { color: '' }, {}, {}],
    ['transparent background', { backgroundColor: 'rgba(0, 0, 0, 0)' }, {}, {}],
    ['same background and foreground', { backgroundColor: 'rgb(250, 251, 252)' }, {}, {}],
    ['unchanged background override', { backgroundColor: 'rgb(1, 2, 3)' }, {}, {}],
    ['unchanged foreground override', { color: 'rgb(254, 253, 252)' }, {}, {}],
    ['wrong background override', { overriddenBackgroundColor: 'rgb(4, 5, 6)' }, {}, {}],
    ['wrong foreground override', { overriddenColor: 'rgb(251, 250, 249)' }, {}, {}],
    ['unblocked HTTP request', {}, { httpRequestPolicyEnforced: false }, {}],
    ['unblocked WebSocket', {}, { webSocketPolicyEnforced: false }, {}],
  ])('S8 rejects browser evidence with %s', (_case, observation, policy, resultOverride) => {
    const evidence = {
      ...consumerContractModule.createBrowserEvidence(
        { ...validBrowserObservation, ...observation },
        { ...validBrowserPolicy, ...policy },
      ),
      ...resultOverride,
    };

    expect(() => consumerContractModule.requirePassingBrowserEvidence(evidence, 2)).toThrow(
      /browser smoke failed closed/iu,
    );
  });

  it('S8 validates regular files, UTF-8 bytes, and command outcomes at process boundaries', async () => {
    const root = await temporaryRoot();
    const regular = await put(root, 'candidate.tgz', 'candidate');
    await expect(consumerContractModule.requireRegularFile(regular, 'candidate')).resolves.toBe(
      undefined,
    );
    await expect(consumerContractModule.requireRegularFile(root, 'candidate')).rejects.toThrow(
      /regular file/iu,
    );
    await expect(
      consumerContractModule.requireRegularFile(join(root, 'missing.tgz'), 'candidate'),
    ).rejects.toThrow(/regular file/iu);
    expect(consumerContractModule.decodeUtf8(Buffer.from('hello'), 'guidance')).toBe('hello');
    expect(() => consumerContractModule.decodeUtf8(Buffer.from([0xff]), 'guidance')).toThrow(
      /valid UTF-8/iu,
    );

    const calls = [];
    expect(
      consumerContractModule.runCommand(
        'tool',
        ['arg'],
        { cwd: root },
        (command, arguments_, options) => {
          calls.push({ arguments_, command, options });
          return { status: 0, stderr: '', stdout: 'ok' };
        },
      ),
    ).toMatchObject({ status: 0, stdout: 'ok' });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      arguments_: ['arg'],
      command: 'tool',
      options: { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
    });
    expect(() =>
      consumerContractModule.runCommand('tool', [], {}, () => ({
        status: 1,
        stderr: 'failed command',
        stdout: '',
      })),
    ).toThrow(/failed command/iu);
    expect(() =>
      consumerContractModule.runCommand('tool', [], {}, () => ({
        error: new Error('spawn failed'),
        status: null,
        stderr: undefined,
        stdout: undefined,
      })),
    ).toThrow(/spawn failed/iu);
    expect(() =>
      consumerContractModule.runCommand('tool', [], {}, () => ({
        status: 2,
        stderr: undefined,
        stdout: undefined,
      })),
    ).toThrow(/tool exited 2/iu);
  });

  it('S8 inspects exactly one regular packed llms entry before extracting its bytes', () => {
    const guidance = Buffer.from('# packed guidance\n');
    const calls = [];
    const invoke = (command, arguments_, options) => {
      calls.push({ arguments_, command, options });
      const operation = arguments_[0];
      if (operation === '-tzf') {
        return { status: 0, stderr: Buffer.alloc(0), stdout: Buffer.from('package/llms.txt\n') };
      }
      if (operation === '-tvzf') {
        return {
          status: 0,
          stderr: Buffer.alloc(0),
          stdout: Buffer.from('-rw-r--r-- user group 18 Jan 1 00:00 package/llms.txt\n'),
        };
      }
      return { status: 0, stderr: Buffer.alloc(0), stdout: guidance };
    };

    expect(
      consumerContractModule.readPackedLlmsFromTarball('/candidate/elements.tgz', invoke),
    ).toEqual(guidance);
    expect(calls.map(({ arguments_ }) => arguments_)).toEqual([
      ['-tzf', '/candidate/elements.tgz'],
      ['-tvzf', '/candidate/elements.tgz', 'package/llms.txt'],
      ['-xOzf', '/candidate/elements.tgz', 'package/llms.txt'],
    ]);
    expect(calls.every(({ command }) => command === 'tar')).toBe(true);
    expect(calls.every(({ options }) => options.encoding === null)).toBe(true);

    expect(() =>
      consumerContractModule.readPackedLlmsFromTarball('/candidate/elements.tgz', () => ({
        status: 1,
        stderr: Buffer.from('bad archive'),
        stdout: Buffer.alloc(0),
      })),
    ).toThrow(/bad archive/iu);
    expect(() =>
      consumerContractModule.readPackedLlmsFromTarball('/candidate/elements.tgz', () => ({
        status: 0,
        stderr: Buffer.alloc(0),
        stdout: Buffer.from('package/other.txt\n'),
      })),
    ).toThrow(/exactly one/iu);
    let metadataCall = 0;
    expect(() =>
      consumerContractModule.readPackedLlmsFromTarball('/candidate/elements.tgz', () => {
        metadataCall += 1;
        return {
          status: 0,
          stderr: Buffer.alloc(0),
          stdout:
            metadataCall === 1
              ? Buffer.from('package/llms.txt\n')
              : Buffer.from('lrwxr-xr-x user group 18 Jan 1 00:00 package/llms.txt\n'),
        };
      }),
    ).toThrow(/regular file/iu);
    expect(() =>
      consumerContractModule.readPackedLlmsFromTarball('/candidate/elements.tgz', () => ({
        error: new Error('tar spawn failed'),
        status: null,
        stderr: undefined,
        stdout: undefined,
      })),
    ).toThrow(/could not inspect/iu);
    expect(() =>
      consumerContractModule.readPackedLlmsFromTarball('/candidate/elements.tgz', () => ({
        status: 0,
        stderr: Buffer.alloc(0),
        stdout: Buffer.from('package/llms.txt\npackage/llms.txt\n'),
      })),
    ).toThrow(/exactly one/iu);
  });

  it('S8 validates documented imports against installed exports and compiles every JS/TS snippet through injected process IO', async () => {
    const root = await temporaryRoot();
    const consumer = join(root, 'consumer');
    const elementsRoot = join(consumer, 'node_modules/@kimen/elements');
    const tokensRoot = join(consumer, 'node_modules/@kimen/tokens');
    await Promise.all([
      put(elementsRoot, 'dist/ki-button.js', 'export const defineCustomElement = () => {};\n'),
      put(tokensRoot, 'dist/tokens.css', ':root {}\n'),
      mkdir(consumer, { recursive: true }),
    ]);
    const installed = new Map([
      [
        '@kimen/elements',
        {
          metadata: {
            name: '@kimen/elements',
            exports: { './ki-button': './dist/ki-button.js' },
          },
          packageRoot: elementsRoot,
        },
      ],
      [
        '@kimen/tokens',
        {
          metadata: { name: '@kimen/tokens', exports: { './css': './dist/tokens.css' } },
          packageRoot: tokensRoot,
        },
      ],
    ]);
    const snippets = [
      {
        language: 'ts',
        source:
          "import { defineCustomElement } from '@kimen/elements/ki-button';\nimport '@kimen/tokens/css';\ndefineCustomElement();",
      },
      { language: 'js', source: "document.createElement('ki-button');" },
    ];

    await expect(
      consumerContractModule.assertImportsAreExported(
        snippets.map(({ source }) => source),
        installed,
      ),
    ).resolves.toBe(undefined);
    await expect(
      consumerContractModule.assertImportsAreExported(
        ["import '@kimen/elements/private';"],
        installed,
      ),
    ).rejects.toThrow(/non-exported/iu);

    const compilerCalls = [];
    const report = await consumerContractModule.compileSnippets(snippets, consumer, installed, {
      runCommand: (command, arguments_, options) => {
        compilerCalls.push({ arguments_, command, options });
        return { status: 0 };
      },
    });

    expect(report).toEqual([
      { index: 1, language: 'ts', status: 'passed' },
      { index: 2, language: 'js', status: 'passed' },
    ]);
    expect(compilerCalls).toHaveLength(2);
    expect(compilerCalls[0].arguments_).not.toContain('--allowJs');
    expect(compilerCalls[1].arguments_).toEqual(
      expect.arrayContaining(['--allowJs', '--checkJs', join(consumer, 'llms-snippet-2.js')]),
    );
    expect(await readFile(join(consumer, 'kimen-side-effects.d.ts'), 'utf8')).toBe(
      'declare module "@kimen/tokens/css";\n',
    );
    expect(await readFile(join(consumer, 'llms-snippet-1.ts'), 'utf8')).toContain(
      'defineCustomElement();',
    );
  });

  it('S8 installs every documented tarball command into an empty external consumer with isolated offline caches', async () => {
    const root = await temporaryRoot();
    const options = {
      'cache-dir': join(root, 'cache'),
      'consumer-dir': join(root, 'consumer'),
      'elements-tarball': join(root, 'elements.tgz'),
      'tokens-tarball': join(root, 'tokens.tgz'),
    };
    const examples = consumerContractModule.extractInstallExamples(
      'Run `pnpm add @kimen/elements @kimen/tokens` and `npm install @kimen/elements @kimen/tokens`.',
    );
    const installCalls = [];

    const result = await consumerContractModule.installTarballs(options, examples, {
      runCommand: (command, arguments_, { cwd, env }) => {
        installCalls.push({ arguments_, command, cwd, env });
        return { status: 0 };
      },
    });

    expect(result).toEqual({
      consumerDirectory: await realpath(options['consumer-dir']),
      installationRuns: [
        {
          command: 'pnpm add @kimen/elements @kimen/tokens',
          manager: 'pnpm',
          status: 'passed',
        },
        {
          command: 'npm install @kimen/elements @kimen/tokens',
          manager: 'npm',
          status: 'passed',
        },
      ],
    });
    expect(installCalls.map(({ command }) => command)).toEqual(['pnpm', 'npm']);
    expect(installCalls[0].arguments_).toEqual([
      'add',
      options['elements-tarball'],
      options['tokens-tarball'],
    ]);
    expect(installCalls[1].arguments_).toEqual([
      'install',
      options['elements-tarball'],
      options['tokens-tarball'],
    ]);
    expect(installCalls.every(({ cwd }) => cwd === result.consumerDirectory)).toBe(true);
    expect(installCalls.every(({ env }) => env.npm_config_offline === 'true')).toBe(true);
    expect(installCalls.every(({ env }) => env.npm_config_ignore_scripts === 'true')).toBe(true);
    expect(
      installCalls.every(
        ({ env }) =>
          env.NPM_CONFIG_CACHE === join(options['cache-dir'], 'npm') &&
          env.npm_config_cache === join(options['cache-dir'], 'npm'),
      ),
    ).toBe(true);
    expect(
      installCalls.every(
        ({ env }) =>
          env.NPM_CONFIG_STORE_DIR === join(options['cache-dir'], 'pnpm-store') &&
          env.npm_config_store_dir === join(options['cache-dir'], 'pnpm-store'),
      ),
    ).toBe(true);
    expect(
      installCalls.every(
        ({ env }) =>
          env.NPM_CONFIG_OFFLINE === 'true' &&
          env.NPM_CONFIG_IGNORE_SCRIPTS === 'true' &&
          env.XDG_CACHE_HOME === join(options['cache-dir'], 'xdg'),
      ),
    ).toBe(true);
    expect(
      JSON.parse(await readFile(join(result.consumerDirectory, 'package.json'), 'utf8')),
    ).toEqual({ name: 'kimen-clean-consumer', private: true, type: 'module' });
  });

  it('S8 installation rejects dirty, symlinked, nested-cache, and workspace-resolving consumers', async () => {
    const dirtyRoot = await temporaryRoot();
    const dirtyConsumer = join(dirtyRoot, 'consumer');
    await put(dirtyConsumer, 'stale.txt', 'stale');
    const base = {
      'cache-dir': join(dirtyRoot, 'cache'),
      'consumer-dir': dirtyConsumer,
      'elements-tarball': join(dirtyRoot, 'elements.tgz'),
      'tokens-tarball': join(dirtyRoot, 'tokens.tgz'),
    };
    const examples = [
      {
        command: 'pnpm add @kimen/elements @kimen/tokens',
        packages: ['@kimen/elements', '@kimen/tokens'],
      },
    ];
    await expect(
      consumerContractModule.installTarballs(base, examples, { runCommand: () => ({ status: 0 }) }),
    ).rejects.toThrow(/empty|clean/iu);

    const symlinkRoot = await temporaryRoot();
    const target = join(symlinkRoot, 'target');
    const consumerLink = join(symlinkRoot, 'consumer');
    await mkdir(target);
    await symlink(target, consumerLink, 'dir');
    await expect(
      consumerContractModule.installTarballs(
        { ...base, 'cache-dir': join(symlinkRoot, 'cache'), 'consumer-dir': consumerLink },
        examples,
        { runCommand: () => ({ status: 0 }) },
      ),
    ).rejects.toThrow(/symbolic link/iu);

    const nestedRoot = await temporaryRoot();
    const nestedConsumer = join(nestedRoot, 'consumer');
    await expect(
      consumerContractModule.installTarballs(
        {
          ...base,
          'cache-dir': join(nestedConsumer, 'cache'),
          'consumer-dir': nestedConsumer,
        },
        examples,
        { runCommand: () => ({ status: 0 }) },
      ),
    ).rejects.toThrow(/cache directory.*outside/iu);

    const workspaceRoot = await temporaryRoot();
    const externalConsumer = join(workspaceRoot, 'consumer');
    await expect(
      consumerContractModule.installTarballs(
        {
          ...base,
          'cache-dir': join(workspaceRoot, 'cache'),
          'consumer-dir': externalConsumer,
        },
        examples,
        {
          realpath: async (path) =>
            path === externalConsumer
              ? workspaceElements
              : path === join(workspaceRoot, 'cache')
                ? join(workspaceRoot, 'cache')
                : realpath(path),
          runCommand: () => ({ status: 0 }),
        },
      ),
    ).rejects.toThrow(/outside the workspace/iu);
  });

  it('S8 selects only the exact supported browser engines', () => {
    const original = process.env.KIMEN_BROWSER_ENGINE;
    try {
      delete process.env.KIMEN_BROWSER_ENGINE;
      expect(selectedBrowserEngine()).toBe('chromium');
      for (const engine of ['chromium', 'firefox', 'webkit']) {
        process.env.KIMEN_BROWSER_ENGINE = engine;
        expect(selectedBrowserEngine()).toBe(engine);
      }
      process.env.KIMEN_BROWSER_ENGINE = 'safari';
      expect(() => selectedBrowserEngine()).toThrow(/chromium.*firefox.*webkit.*safari/iu);
    } finally {
      if (original === undefined) delete process.env.KIMEN_BROWSER_ENGINE;
      else process.env.KIMEN_BROWSER_ENGINE = original;
    }
  });

  it('S8 requires every unique CLI path option exactly once', () => {
    const argv = [
      '--elements-tarball',
      'elements.tgz',
      '--tokens-tarball',
      'tokens.tgz',
      '--llms',
      'llms.txt',
      '--consumer-dir',
      'consumer',
      '--cache-dir',
      'cache',
      '--report',
      'report.json',
    ];
    expect(Object.keys(parseArguments(argv)).sort()).toEqual([
      'cache-dir',
      'consumer-dir',
      'elements-tarball',
      'llms',
      'report',
      'tokens-tarball',
    ]);
    expect(() => parseArguments(argv.slice(0, -2))).toThrow(/invalid arguments/iu);
    expect(() => parseArguments([...argv, '--report', 'again'])).toThrow(/invalid arguments/iu);
    expect(() => parseArguments(['--unknown', 'x'])).toThrow(/invalid arguments/iu);
  });

  it('S8 exposes the complete default runtime for CLI execution and recognizes only its own module path', () => {
    const override = () => 'firefox';
    const runtime = consumerContractModule.consumerRuntime({ selectBrowserEngine: override });
    expect(Object.keys(runtime).sort()).toEqual([
      'assertImportsAreExported',
      'compileSnippets',
      'installTarballs',
      'loadInstalledPackage',
      'mkdir',
      'readFile',
      'readPackedLlmsFromTarball',
      'realpath',
      'requireRegularFile',
      'runBrowserSmoke',
      'selectBrowserEngine',
      'writeFile',
    ]);
    expect(runtime.selectBrowserEngine).toBe(override);
    expect(
      consumerContractModule.isDirectExecution(
        fileURLToPath(new URL('../consumer-contract.mjs', import.meta.url)),
        new URL('../consumer-contract.mjs', import.meta.url).href,
      ),
    ).toBe(true);
    expect(
      consumerContractModule.isDirectExecution(
        fileURLToPath(new URL('./consumer-contract.spec.mjs', import.meta.url)),
        new URL('../consumer-contract.mjs', import.meta.url).href,
      ),
    ).toBe(false);
    expect(consumerContractModule.isDirectExecution(undefined)).toBe(false);
  });

  it('S8 extracts every executable TypeScript and JavaScript fence with its language', () => {
    expect(
      extractExecutableSnippets(
        '# docs\n```js\nfirstJs();\n```\n```javascript\nsecondJs();\n```\n```ts\nfirstTs();\n```\n```typescript\nsecondTs();\n```\n',
      ),
    ).toEqual([
      { language: 'js', source: 'firstJs();' },
      { language: 'js', source: 'secondJs();' },
      { language: 'ts', source: 'firstTs();' },
      { language: 'ts', source: 'secondTs();' },
    ]);
    expect(() => extractExecutableSnippets('```html\n<div></div>\n```\n')).toThrow(
      /no executable/iu,
    );
    expect(() =>
      extractExecutableSnippets(
        '```js\naccepted();\n```\n```tsx\nconst skipped = <button />;\n```\n',
      ),
    ).toThrow(/unsupported executable fence.*tsx/iu);
    expect(() => extractExecutableSnippets(null)).toThrow(/fenced examples must be text/iu);
    expect(() => extractExecutableSnippets('```ts title="example"\naccepted();\n```\n')).toThrow(
      /unsupported executable fence/iu,
    );
  });

  it.each([
    'cjs',
    'cts',
    'ecmascript',
    'jsx',
    'mjs',
    'mts',
    'node',
    'tsx',
  ])('S8 fails closed for unsupported executable fence %s', (language) => {
    expect(() =>
      extractExecutableSnippets(
        `\`\`\`js\naccepted();\n\`\`\`\n\`\`\`${language}\nskipped();\n\`\`\`\n`,
      ),
    ).toThrow(new RegExp(`unsupported executable fence.*${language}`, 'iu'));
  });

  it.each([
    '```js\naccepted();\n```\n```ts\nunclosed();\n',
    '```js\naccepted();\n```\n~~~tsx\nskipped();\n~~~\n',
    '```js\naccepted();\n```\n````ts\nskipped();\n````\n',
    '```js\naccepted();\n```\n   ```ts\nskipped();\n   ```\n',
  ])('S8 rejects malformed or alternate executable Markdown fences', (source) => {
    expect(() => extractExecutableSnippets(source)).toThrow(/fence/iu);
  });

  it('S8 observes every install example and binds its final package set to both tarballs', () => {
    expect(
      extractInstallExamples(
        'Install with `pnpm add @kimen/elements` then `pnpm add @kimen/tokens`.',
      ),
    ).toEqual([
      { command: 'pnpm add @kimen/elements', packages: ['@kimen/elements'] },
      { command: 'pnpm add @kimen/tokens', packages: ['@kimen/tokens'] },
    ]);
    expect(
      extractInstallExamples('```sh\n$ npm install @kimen/elements @kimen/tokens\n```\n'),
    ).toEqual([
      {
        command: 'npm install @kimen/elements @kimen/tokens',
        packages: ['@kimen/elements', '@kimen/tokens'],
      },
    ]);
    expect(() => extractInstallExamples('No package command here.')).toThrow(
      /installation example/iu,
    );
    expect(() => extractInstallExamples('Run `pnpm add @kimen/elements @kimen/wrong`.')).toThrow(
      /@kimen\/wrong/iu,
    );
    expect(() => extractInstallExamples('Run `pnpm add @kimen/elements`.')).toThrow(
      /@kimen\/tokens/iu,
    );
    expect(() => extractInstallExamples('Run `pnpm add @kimen/tokens`.')).toThrow(
      /@kimen\/elements/iu,
    );
    expect(() => extractInstallExamples(null)).toThrow(/installation examples must be text/iu);
    expect(() => extractInstallExamples('Run `pnpm add`.')).toThrow(/no packages/iu);
    expect(() =>
      extractInstallExamples(
        'Run `pnpm add @kimen/elements @kimen/tokens`.\n```powershell\nnpm install @kimen/elements @kimen/tokens\n```\n',
      ),
    ).toThrow(/unsupported installation fence.*powershell/iu);
  });

  it.each([
    '',
    'bash',
    'console',
    'sh',
    'shell',
    'zsh',
  ])('S8 observes the supported installation fence %s', (language) => {
    expect(
      extractInstallExamples(
        `\`\`\`${language}\n$ npm install @kimen/elements @kimen/tokens\n\`\`\`\n`,
      ),
    ).toEqual([
      {
        command: 'npm install @kimen/elements @kimen/tokens',
        packages: ['@kimen/elements', '@kimen/tokens'],
      },
    ]);
  });

  it.each([
    'pnpm install @kimen/elements @kimen/tokens',
    'npm add @kimen/elements @kimen/tokens',
    'yarn install @kimen/elements @kimen/tokens',
    'bun install @kimen/elements @kimen/tokens',
  ])('S8 rejects unsupported package-manager guidance %s', (command) => {
    expect(() => extractInstallExamples(`Run \`${command}\`.`)).toThrow(
      /unsupported installation command/iu,
    );
  });

  it.each([
    [
      'pnpm add @kimen/elements @kimen/tokens',
      'pnpm',
      ['add', '/candidate/elements.tgz', '/candidate/tokens.tgz'],
    ],
    [
      'npm install @kimen/elements @kimen/tokens',
      'npm',
      ['install', '/candidate/elements.tgz', '/candidate/tokens.tgz'],
    ],
    [
      'yarn add @kimen/elements @kimen/tokens',
      'yarn',
      ['add', '/candidate/elements.tgz', '/candidate/tokens.tgz'],
    ],
    [
      'bun add @kimen/elements @kimen/tokens',
      'bun',
      ['add', '/candidate/elements.tgz', '/candidate/tokens.tgz'],
    ],
  ])('S8 substitutes tarball paths into documented command %s', (command, executable, arguments_) => {
    const example = extractInstallExamples(`Run \`${command}\`.`)[0];
    expect(
      createInstallInvocation(
        example,
        new Map([
          ['@kimen/elements', '/candidate/elements.tgz'],
          ['@kimen/tokens', '/candidate/tokens.tgz'],
        ]),
      ),
    ).toEqual({ executable, arguments: arguments_ });
  });

  it('S8 rejects unsupported invocation actions and packages without candidate tarballs', () => {
    const tarballs = new Map([['@kimen/elements', '/candidate/elements.tgz']]);
    expect(() =>
      createInstallInvocation(
        {
          command: 'pnpm install @kimen/elements @kimen/tokens',
          packages: ['@kimen/elements', '@kimen/tokens'],
        },
        tarballs,
      ),
    ).toThrow(/unsupported installation command/iu);
    expect(() =>
      createInstallInvocation(
        {
          command: 'pnpm add @kimen/elements @kimen/tokens',
          packages: ['@kimen/elements', '@kimen/tokens'],
        },
        tarballs,
      ),
    ).toThrow(/no candidate tarball/iu);
  });

  it.each([
    ['@kimen/elements', { name: '@kimen/elements', subpath: '.' }],
    ['@kimen/elements/ki-button', { name: '@kimen/elements', subpath: './ki-button' }],
    ['plain', { name: 'plain', subpath: '.' }],
    ['plain/subpath', { name: 'plain', subpath: './subpath' }],
    ['@broken', null],
  ])('S8 parses package specifier %s', (specifier, expected) => {
    expect(packageAndSubpath(specifier)).toEqual(expected);
  });

  it('S8 resolves exact and safe wildcard package exports', () => {
    const metadata = {
      exports: {
        '.': './dist/index.js',
        './fallback': { default: './dist/fallback.js' },
        './ki-*': { types: './dist/ki-*.d.ts', import: './dist/ki-*.js' },
        './ki-special-*': { import: './dist/special/*.js' },
      },
    };
    expect(exportedTarget(metadata, '.')).toBe('./dist/index.js');
    expect(exportedTarget(metadata, './fallback')).toBe('./dist/fallback.js');
    expect(exportedTarget(metadata, './ki-button')).toBe('./dist/ki-button.js');
    expect(exportedTarget(metadata, './ki-special-card')).toBe('./dist/special/card.js');
    expect(exportedTarget(metadata, './absent')).toBeNull();
    expect(exportedTarget({ exports: './dist/index.js' }, '.')).toBe('./dist/index.js');
    expect(exportedTarget({ exports: './dist/index.js' }, './x')).toBeNull();
    expect(exportedTarget({ exports: null }, '.')).toBeNull();
    expect(exportedTarget({ exports: { './x-*': './dist/static.js' } }, './x-a')).toBeNull();
  });

  it('S8 parses minified imports, re-exports, and dynamic imports with syntax awareness', () => {
    expect(
      moduleSpecifiers(
        'import{x}from"@scope/minified";export{y}from"./re-export.js";import("dynamic");',
      ),
    ).toEqual(['@scope/minified', './re-export.js', 'dynamic']);
    expect(() => moduleSpecifiers('import {')).toThrow(/cannot be parsed/iu);
  });

  it('S8 binds the documented direct import, registration call, and one theme stylesheet', () => {
    const snippets = [
      "import { defineCustomElement as defineButton } from '@kimen/elements/ki-button';\nimport '@kimen/tokens/css';",
      'defineButton();',
    ];
    expect(browserSnippetContract(snippets)).toEqual({
      elementSpecifier: '@kimen/elements/ki-button',
      tokenCssSpecifier: '@kimen/tokens/css',
    });
    expect(() => browserSnippetContract([snippets[0]])).toThrow(/registration call/iu);
    expect(() => browserSnippetContract(['const noImport = true;'])).toThrow(
      /defineCustomElement/iu,
    );
    expect(() =>
      browserSnippetContract([
        `${snippets[0]}\nimport '@kimen/tokens/css/material3';\ndefineButton();`,
      ]),
    ).toThrow(/exactly one/iu);
  });

  it('S8 transpiles documented TypeScript while removing only the browser-incompatible CSS import', () => {
    const source = executableBrowserSnippets(
      [
        "import { defineCustomElement } from '@kimen/elements/ki-button';\nimport '@kimen/tokens/css';\nconst button: HTMLElement = document.createElement('ki-button');\ndefineCustomElement();",
      ],
      '@kimen/tokens/css',
    );
    expect(source).toContain('@kimen/elements/ki-button');
    expect(source).toContain('defineCustomElement();');
    expect(source).not.toContain('@kimen/tokens/css');
    expect(source).not.toContain(': HTMLElement');
    expect(source.indexOf('requestAnimationFrame')).toBeGreaterThanOrEqual(0);
    expect(source.indexOf('dataset')).toBeGreaterThan(source.indexOf('requestAnimationFrame'));
  });

  it('S8 assigns deterministic browser content types', () => {
    expect(browserContentType('theme.css')).toBe('text/css; charset=utf-8');
    expect(browserContentType('index.html')).toBe('text/html; charset=utf-8');
    expect(browserContentType('manifest.json')).toBe('application/json; charset=utf-8');
    expect(browserContentType('component.js')).toBe('text/javascript; charset=utf-8');
  });

  it('S8 serves the import map from a same-origin document without script-tag injection', () => {
    const document = browserDocument({
      '@kimen/elements/ki-button':
        'https://consumer.kimen.invalid/modules/0/ki-button.js?</script><script>bad()</script>',
    });
    expect(document).toContain('<script type="importmap">');
    expect(document).toContain('\\u003c/script>\\u003cscript>bad()\\u003c/script>');
    expect(document).not.toContain('</script><script>bad()</script>');
  });

  it('S8 permits only the exact document and same-origin module graph requests', () => {
    const documentUrl = 'https://consumer.kimen.invalid/index.html';
    const roots = [
      {
        files: new Map([
          [
            'https://consumer.kimen.invalid/modules/0/ki-button.js',
            '/consumer/node_modules/@kimen/elements/ki-button.js',
          ],
        ]),
        root: '/consumer/node_modules/@kimen/elements',
        urlPrefix: 'https://consumer.kimen.invalid/modules/0/',
      },
    ];

    expect(browserRequestTarget(documentUrl, documentUrl, roots)).toEqual({ kind: 'document' });
    expect(
      browserRequestTarget(
        'https://consumer.kimen.invalid/modules/0/ki-button.js',
        documentUrl,
        roots,
      ),
    ).toMatchObject({
      kind: 'module',
      path: '/consumer/node_modules/@kimen/elements/ki-button.js',
    });
    expect(
      browserRequestTarget('https://attacker.invalid/exfiltrate', documentUrl, roots),
    ).toBeNull();
    expect(
      browserRequestTarget('https://consumer.kimen.invalid/undeclared.js', documentUrl, roots),
    ).toBeNull();
    expect(
      browserRequestTarget(
        'https://consumer.kimen.invalid/modules/0/private.js',
        documentUrl,
        roots,
      ),
    ).toBeNull();
    expect(
      browserRequestTarget(
        'http://consumer.kimen.invalid/modules/0/ki-button.js',
        documentUrl,
        roots,
      ),
    ).toBeNull();
  });

  it('S8 resolves only regular package-relative files that remain inside the package', async () => {
    const fixture = await temporaryRoot();
    const root = join(fixture, 'package');
    await put(root, 'dist/index.js', 'export {};\n');
    await put(fixture, 'outside.js', 'outside\n');
    const physicalRoot = await realpath(root);
    await expect(resolvePackageFile(root, './dist/index.js', 'entry')).resolves.toMatchObject({
      root: physicalRoot,
    });
    await expect(resolvePackageFile(root, '../outside.js', 'entry')).rejects.toThrow(
      /package-relative|escapes|absent/iu,
    );
    await expect(resolvePackageFile(root, '/absolute.js', 'entry')).rejects.toThrow(
      /package-relative/iu,
    );
    await expect(resolvePackageFile(root, './missing.js', 'entry')).rejects.toThrow(/absent/iu);
  });

  it('S8 discovers a minified bare dependency in the installed package module graph', async () => {
    const root = await temporaryRoot();
    const packageRoot = join(root, 'node_modules/@kimen/elements');
    const metadata = {
      name: '@kimen/elements',
      exports: {
        './ki-button': './dist/ki-button.js',
        './runtime': './dist/runtime.js',
      },
    };
    await put(
      packageRoot,
      'dist/ki-button.js',
      "import{x}from'@kimen/elements/runtime';export const defineCustomElement=x;\n",
    );
    await put(packageRoot, 'dist/runtime.js', 'export const x = () => {};\n');

    const graph = await createBrowserModuleGraph({
      consumerDirectory: root,
      elementSpecifier: '@kimen/elements/ki-button',
      elementTarget: './dist/ki-button.js',
      elements: { metadata, packageRoot },
    });

    expect(Object.keys(graph.importMap).sort()).toEqual([
      '@kimen/elements/ki-button',
      '@kimen/elements/runtime',
    ]);
    expect(graph.roots).toHaveLength(1);
  });

  it('S8 resolves a transitive package from the importing pnpm virtual root, not a root hoist', async () => {
    const root = await temporaryRoot();
    const consumer = join(root, 'consumer');
    const virtualStore = join(consumer, 'node_modules/.pnpm');
    const elementsRoot = join(virtualStore, '@kimen+elements@1.0.0/node_modules/@kimen/elements');
    const dependencyRoot = join(virtualStore, 'dependency@2.0.0/node_modules/dependency');
    const dependencyLink = join(virtualStore, '@kimen+elements@1.0.0/node_modules/dependency');
    const metadata = {
      name: '@kimen/elements',
      version: '1.0.0',
      exports: { './ki-button': './dist/ki-button.js' },
    };
    await put(elementsRoot, 'package.json', JSON.stringify(metadata));
    await put(elementsRoot, 'dist/ki-button.js', "import 'dependency/entry';\n");
    await put(
      dependencyRoot,
      'package.json',
      JSON.stringify({
        name: 'dependency',
        version: '2.0.0',
        exports: { './entry': './entry.js' },
      }),
    );
    await put(dependencyRoot, 'entry.js', 'export const value = 2;\n');
    await mkdir(dirname(dependencyLink), { recursive: true });
    await symlink(dependencyRoot, dependencyLink, 'dir');

    const graph = await createBrowserModuleGraph({
      consumerDirectory: consumer,
      elementSpecifier: '@kimen/elements/ki-button',
      elementTarget: './dist/ki-button.js',
      elements: { metadata, packageRoot: elementsRoot },
    });

    expect(Object.keys(graph.importMap).sort()).toEqual([
      '@kimen/elements/ki-button',
      'dependency/entry',
    ]);
    expect(graph.roots.map(({ name }) => name).sort()).toEqual(['@kimen/elements', 'dependency']);
  });

  it('S8 rejects a package name that resolves to different pnpm roots or versions', async () => {
    const root = await temporaryRoot();
    const consumer = join(root, 'consumer');
    const modules = join(consumer, 'node_modules');
    const virtualStore = join(modules, '.pnpm');
    const elementsRoot = join(virtualStore, '@kimen+elements@1.0.0/node_modules/@kimen/elements');
    const firstRoot = join(virtualStore, 'first@1.0.0/node_modules/first');
    const secondRoot = join(virtualStore, 'second@1.0.0/node_modules/second');
    const sharedV1 = join(virtualStore, 'shared@1.0.0/node_modules/shared');
    const sharedV2 = join(virtualStore, 'shared@2.0.0/node_modules/shared');
    const metadata = {
      name: '@kimen/elements',
      version: '1.0.0',
      exports: { './ki-button': './dist/ki-button.js' },
    };
    await Promise.all([
      put(elementsRoot, 'package.json', JSON.stringify(metadata)),
      put(elementsRoot, 'dist/ki-button.js', "import 'first';\nimport 'second';\n"),
      put(
        firstRoot,
        'package.json',
        JSON.stringify({ name: 'first', version: '1.0.0', exports: './index.js' }),
      ),
      put(firstRoot, 'index.js', "import 'shared/value';\n"),
      put(
        secondRoot,
        'package.json',
        JSON.stringify({ name: 'second', version: '1.0.0', exports: './index.js' }),
      ),
      put(secondRoot, 'index.js', "import 'shared/value';\n"),
      put(
        sharedV1,
        'package.json',
        JSON.stringify({
          name: 'shared',
          version: '1.0.0',
          exports: { './value': './value.js' },
        }),
      ),
      put(sharedV1, 'value.js', 'export const value = 1;\n'),
      put(
        sharedV2,
        'package.json',
        JSON.stringify({
          name: 'shared',
          version: '2.0.0',
          exports: { './value': './value.js' },
        }),
      ),
      put(sharedV2, 'value.js', 'export const value = 2;\n'),
    ]);
    const links = [
      [join(modules, 'first'), firstRoot],
      [join(modules, 'second'), secondRoot],
      [join(modules, 'shared'), sharedV1],
      [join(virtualStore, 'first@1.0.0/node_modules/shared'), sharedV1],
      [join(virtualStore, 'second@1.0.0/node_modules/shared'), sharedV2],
    ];
    await Promise.all(links.map(([link]) => mkdir(dirname(link), { recursive: true })));
    await Promise.all(links.map(([link, target]) => symlink(target, link, 'dir')));

    await expect(
      createBrowserModuleGraph({
        consumerDirectory: consumer,
        elementSpecifier: '@kimen/elements/ki-button',
        elementTarget: './dist/ki-button.js',
        elements: { metadata, packageRoot: elementsRoot },
      }),
    ).rejects.toThrow(/ambiguous.*shared.*1\.0\.0.*2\.0\.0|shared.*(?:root|version).*ambiguous/iu);
  });

  it('S8 permits a pnpm-style package symlink whose realpath stays inside consumer node_modules', async () => {
    const root = await temporaryRoot();
    const packageRoot = join(
      root,
      'consumer/node_modules/.pnpm/@kimen+elements@1.0.0/node_modules/@kimen/elements',
    );
    const link = join(root, 'consumer/node_modules/@kimen/elements');
    await put(packageRoot, 'package.json', '{"name":"@kimen/elements"}\n');
    await mkdir(dirname(link), { recursive: true });
    await symlink(packageRoot, link, 'dir');

    await expect(
      loadInstalledPackage(join(root, 'consumer'), '@kimen/elements'),
    ).resolves.toMatchObject({ packageRoot: await realpath(packageRoot) });
  });

  it('S8 rejects an installed package symlink whose realpath escapes consumer node_modules', async () => {
    const root = await temporaryRoot();
    const packageRoot = join(root, 'workspace-package');
    const link = join(root, 'consumer/node_modules/@kimen/elements');
    await put(packageRoot, 'package.json', '{"name":"@kimen/elements"}\n');
    await mkdir(dirname(link), { recursive: true });
    await symlink(packageRoot, link, 'dir');

    await expect(loadInstalledPackage(join(root, 'consumer'), '@kimen/elements')).rejects.toThrow(
      /node_modules|workspace/iu,
    );
  });

  it('S8 rejects a workspace-linked package even when linked from consumer node_modules', async () => {
    const root = await temporaryRoot();
    const link = join(root, 'consumer/node_modules/@kimen/elements');
    await mkdir(dirname(link), { recursive: true });
    await symlink(workspaceElements, link, 'dir');

    await expect(loadInstalledPackage(join(root, 'consumer'), '@kimen/elements')).rejects.toThrow(
      /source workspace/iu,
    );
  });
});
