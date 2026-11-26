import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { describe, expect, it, onTestFinished } from 'vitest';

import {
  bundleFile,
  bundleLoaderApplications,
  LOADER_APPLICATION,
  LOADER_BUNDLERS,
  LOADER_PAGE,
  loaderBundleEvidence,
  runLoaderBundleSmoke,
  workspaceBundlers,
} from '../consumer-loader-bundles.mjs';

// @spec:018-project-integrity-hardening#S8 (the lazy loader through an application's bundler)
const origin = 'https://loader.kimen.invalid';

async function temporaryRoot() {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'kimen-consumer-loader-')));
  onTestFinished(() => rm(root, { force: true, recursive: true }));
  return root;
}

async function put(root, path, contents) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, 'utf8');
  return target;
}

const passing = {
  bundler: 'vite',
  engine: 'webkit',
  observation: { hydrated: true, shadowButtonRendered: true },
  requested: ['index.html', 'assets/index-a.js', 'assets/ki-button.entry-b.js'],
  blocked: new Set(),
  errors: [],
};

describe('consumer loader bundles', () => {
  it('bundles the loader application with the workspace esbuild and Vite', async () => {
    expect(LOADER_BUNDLERS).toEqual(['esbuild', 'vite']);
    expect(Object.isFrozen(LOADER_BUNDLERS)).toBe(true);
    const bundlers = workspaceBundlers();
    expect(typeof (await bundlers.esbuild()).build).toBe('function');
    expect(typeof (await bundlers.vite()).build).toBe('function');
  });

  it('writes the application into the consumer and runs each bundler on it', async () => {
    const consumerDirectory = await temporaryRoot();
    const application = join(consumerDirectory, 'loader-application');
    const calls = [];
    const fake = (name) => async () => ({
      build: async (options) => {
        calls.push([name, options]);
        expect(await readFile(join(application, 'main.js'), 'utf8')).toBe(LOADER_APPLICATION);
      },
    });

    const bundles = await bundleLoaderApplications(
      { consumerDirectory },
      { bundlers: { esbuild: fake('esbuild'), vite: fake('vite') } },
    );

    expect(LOADER_APPLICATION).toContain(
      "import { defineCustomElements } from '@kimen/elements/loader';",
    );
    expect(LOADER_APPLICATION).toContain('defineCustomElements();');
    expect(LOADER_APPLICATION).toContain("document.createElement('ki-button')");
    const html = await readFile(join(application, 'index.html'), 'utf8');
    expect(html).toBe(LOADER_PAGE);
    expect(LOADER_PAGE).toContain('<body><script type="module" src="./main.js"></script></body>');
    expect(LOADER_PAGE.startsWith('<!doctype html>\n<html lang="en">\n')).toBe(true);
    expect(LOADER_PAGE.endsWith('</html>\n')).toBe(true);
    expect(bundles).toEqual([
      { bundler: 'esbuild', directory: join(application, 'dist/esbuild') },
      { bundler: 'vite', directory: join(application, 'dist/vite') },
    ]);
    expect(calls).toEqual([
      [
        'esbuild',
        {
          absWorkingDir: application,
          bundle: true,
          entryPoints: ['main.js'],
          format: 'esm',
          logLevel: 'silent',
          minify: true,
          outdir: join(application, 'dist/esbuild'),
          platform: 'browser',
          splitting: true,
          target: 'es2022',
        },
      ],
      [
        'vite',
        {
          build: { emptyOutDir: true, outDir: join(application, 'dist/vite') },
          cacheDir: join(application, '.vite'),
          configFile: false,
          envDir: false,
          logLevel: 'silent',
          root: application,
        },
      ],
    ]);
    // esbuild leaves the page to the application: the bundle gets one.
    expect(await readFile(join(application, 'dist/esbuild/index.html'), 'utf8')).toBe(html);
  });

  it('names the bundler that could not bundle the loader', async () => {
    const consumerDirectory = await temporaryRoot();
    const broken = async () => ({
      build: async () => {
        throw new Error('No loader is configured for ".map" files');
      },
    });
    await expect(
      bundleLoaderApplications(
        { consumerDirectory },
        { bundlers: { esbuild: broken, vite: broken } },
      ),
    ).rejects.toThrowError(
      'consumer-loader: esbuild could not bundle @kimen/elements/loader: No loader is configured for ".map" files',
    );
  });

  it('serves only regular files inside the bundle, on the loader origin', async () => {
    const root = await temporaryRoot();
    const directory = join(root, 'bundle');
    await put(directory, 'index.html', '<!doctype html>');
    await put(directory, 'assets/a.js', 'export {};');
    await put(directory, 'assets/a.css', '');
    await put(directory, 'assets/font.woff2', '');
    await put(directory, 'assets/a.js.map', '{}');
    await put(root, 'outside.js', 'export {};');
    await symlink(join(root, 'outside.js'), join(directory, 'escape.js'));

    expect(await bundleFile(directory, `${origin}/`)).toBe(join(directory, 'index.html'));
    expect(await bundleFile(directory, `${origin}/index.html`)).toBe(join(directory, 'index.html'));
    expect(await bundleFile(directory, `${origin}/assets/a.js`)).toBe(
      join(directory, 'assets/a.js'),
    );
    expect(await bundleFile(directory, `${origin}/assets/a.css`)).toBe(
      join(directory, 'assets/a.css'),
    );
    expect(await bundleFile(directory, `${origin}/assets/font.woff2`)).toBe(
      join(directory, 'assets/font.woff2'),
    );
    for (const url of [
      `${origin}/assets/a.js?x=1`,
      `${origin}/assets/a.js#x`,
      `${origin}/assets/a.js.map`,
      `${origin}/assets/missing.js`,
      `${origin}/escape.js`,
      `${origin}/%2E%2E/outside.js`,
      `${origin}/assets`,
      `${origin}/%E0%A4%A`,
      'https://attacker.invalid/assets/a.js',
      'http://loader.kimen.invalid/assets/a.js',
      'not a url',
    ]) {
      expect(await bundleFile(directory, url), url).toBeNull();
    }
  });

  it('passes only a hydrated button rendered from its chunk with nothing blocked or thrown', () => {
    expect(loaderBundleEvidence(passing)).toEqual({
      bundler: 'vite',
      engine: 'webkit',
      componentChunkLoaded: true,
      shadowButtonRendered: true,
      hydrated: true,
      blockedRequests: [],
      pageErrors: [],
    });
    expect(
      loaderBundleEvidence({ ...passing, requested: ['main.js', 'ki-button.entry-c.js'] })
        .componentChunkLoaded,
    ).toBe(true);
    for (const variant of [
      { requested: ['index.html', 'assets/index-a.js'] },
      { requested: ['assets/my-ki-button.js'] },
      { requested: ['assets/ki-button2-abc.js', 'assets/ki-card-def.js'] },
      { requested: ['assets/ki-button.entry-b.css'] },
      { observation: { hydrated: true, shadowButtonRendered: false } },
      { observation: { hydrated: false, shadowButtonRendered: true } },
      { observation: { hydrated: 'yes', shadowButtonRendered: 1 } },
      { blocked: new Set([`${origin}/assets/ki-button.entry.js`]) },
      { errors: ['TypeError: Failed to fetch dynamically imported module'] },
    ]) {
      expect(
        () => loaderBundleEvidence({ ...passing, ...variant }),
        JSON.stringify(variant),
      ).toThrowError(
        /^consumer-loader: the vite bundle did not render ki-button from its chunk: \{/u,
      );
    }
  });
});

// A Playwright stand-in: `goto` sends each context's script through its routes.
function fakePlaywright({ scripts, observation, launchError = null, waitError = false }) {
  const state = {
    closedBrowser: false,
    closedContexts: 0,
    contexts: [],
    fulfilled: [],
    aborted: [],
  };
  const browser = {
    newContext: async (options) => {
      const context = { options, routes: [], sockets: [] };
      const script = scripts[state.contexts.length] ?? [];
      state.contexts.push(context);
      const listeners = new Map();
      return {
        routeWebSocket: async (pattern, handler) => context.sockets.push({ pattern, handler }),
        route: async (pattern, handler) => context.routes.push({ pattern, handler }),
        close: async () => {
          state.closedContexts += 1;
        },
        newPage: async () => ({
          on: (name, listener) => listeners.set(name, listener),
          goto: async (url, options) => {
            context.goto = { url, options };
            for (const step of script) {
              if (step.webSocket) {
                await context.sockets[0].handler({
                  url: () => step.webSocket,
                  close: async ({ code }) => state.aborted.push(`ws:${String(code)}`),
                });
              } else if (step.pageError) {
                listeners.get('pageerror')(new Error(step.pageError));
              } else if (step.console) {
                listeners.get('console')({
                  type: () => step.console[0],
                  text: () => step.console[1],
                });
              } else {
                await context.routes[0].handler({
                  request: () => ({ url: () => step }),
                  abort: async (reason) => state.aborted.push(`${reason}:${step}`),
                  fulfill: async ({ body, contentType, status }) =>
                    state.fulfilled.push({ url: step, body: String(body), contentType, status }),
                });
              }
            }
          },
          waitForFunction: async (predicate, argument, options) => {
            context.wait = { argument, options, predicate: typeof predicate };
            if (waitError) throw new Error('timed out');
          },
          evaluate: async () => observation,
        }),
      };
    },
    close: async () => {
      state.closedBrowser = true;
    },
  };
  const engine = {
    launch: async (options) => {
      state.launch = options;
      if (launchError) throw new Error(launchError);
      return browser;
    },
  };
  return { state, playwright: { chromium: engine, firefox: engine, webkit: engine } };
}

describe('the loader bundle browser check', () => {
  async function bundles() {
    const root = await temporaryRoot();
    const esbuild = join(root, 'esbuild');
    const vite = join(root, 'vite');
    await put(esbuild, 'index.html', 'esbuild page');
    await put(esbuild, 'main.js', 'main');
    await put(esbuild, 'ki-button.entry-x.js', 'button');
    await put(vite, 'index.html', 'vite page');
    await put(vite, 'assets/index-y.js', 'index');
    await put(vite, 'assets/ki-button.entry-z.js', 'button');
    return [
      { bundler: 'esbuild', directory: esbuild },
      { bundler: 'vite', directory: vite },
    ];
  }
  const hydrated = { hydrated: true, shadowButtonRendered: true };
  const working = [
    [`${origin}/`, `${origin}/main.js`, `${origin}/ki-button.entry-x.js`],
    [
      `${origin}/`,
      `${origin}/assets/index-y.js`,
      `${origin}/assets/ki-button.entry-z.js`,
      { console: ['warning', 'not an error'] },
    ],
  ];

  it('opens each bundle alone, at the root of the loader origin, and returns its evidence', async () => {
    const list = await bundles();
    const fake = fakePlaywright({ observation: hydrated, scripts: working });

    const evidence = await runLoaderBundleSmoke(
      { bundles: list, engine: 'firefox' },
      { playwright: fake.playwright, timeout: 1234 },
    );

    expect(evidence).toEqual(
      ['esbuild', 'vite'].map((bundler) => ({
        bundler,
        engine: 'firefox',
        componentChunkLoaded: true,
        shadowButtonRendered: true,
        hydrated: true,
        blockedRequests: [],
        pageErrors: [],
      })),
    );
    expect(fake.state.launch).toEqual({ headless: true });
    expect(fake.state.contexts.map(({ options }) => options)).toEqual([
      { serviceWorkers: 'block' },
      { serviceWorkers: 'block' },
    ]);
    for (const context of fake.state.contexts) {
      expect(context.goto).toEqual({ url: `${origin}/`, options: { waitUntil: 'load' } });
      expect(context.wait).toEqual({
        argument: null,
        options: { timeout: 1234 },
        predicate: 'function',
      });
      expect(context.routes.map(({ pattern }) => pattern)).toEqual(['**/*']);
      expect(context.sockets.map(({ pattern }) => String(pattern))).toEqual(['/.*/u']);
    }
    expect(fake.state.fulfilled).toEqual([
      {
        url: `${origin}/`,
        body: 'esbuild page',
        contentType: 'text/html; charset=utf-8',
        status: 200,
      },
      {
        url: `${origin}/main.js`,
        body: 'main',
        contentType: 'text/javascript; charset=utf-8',
        status: 200,
      },
      {
        url: `${origin}/ki-button.entry-x.js`,
        body: 'button',
        contentType: 'text/javascript; charset=utf-8',
        status: 200,
      },
      {
        url: `${origin}/`,
        body: 'vite page',
        contentType: 'text/html; charset=utf-8',
        status: 200,
      },
      {
        url: `${origin}/assets/index-y.js`,
        body: 'index',
        contentType: 'text/javascript; charset=utf-8',
        status: 200,
      },
      {
        url: `${origin}/assets/ki-button.entry-z.js`,
        body: 'button',
        contentType: 'text/javascript; charset=utf-8',
        status: 200,
      },
    ]);
    expect(fake.state.closedContexts).toBe(2);
    expect(fake.state.closedBrowser).toBe(true);
  });

  it.each([
    [
      'a request outside the bundle',
      [[...working[0], 'https://attacker.invalid/x'], working[1]],
      /"blockedRequests":\["https:\/\/attacker\.invalid\/x"\]/u,
    ],
    [
      "the other bundle's chunk",
      [[...working[0], `${origin}/assets/ki-button.entry-z.js`], working[1]],
      /"blockedRequests":\["https:\/\/loader\.kimen\.invalid\/assets\/ki-button\.entry-z\.js"\]/u,
    ],
    [
      'a WebSocket',
      [[...working[0], { webSocket: 'wss://attacker.invalid/x' }], working[1]],
      /"blockedRequests":\["wss:\/\/attacker\.invalid\/x"\]/u,
    ],
    [
      'a page error',
      [[...working[0], { pageError: 'boom' }], working[1]],
      /"pageErrors":\["boom"\]/u,
    ],
    [
      'a console error',
      [[...working[0], { console: ['error', 'Constructor not found'] }], working[1]],
      /"pageErrors":\["Constructor not found"\]/u,
    ],
    [
      'no component chunk',
      [[`${origin}/`, `${origin}/main.js`], working[1]],
      /"componentChunkLoaded":false/u,
    ],
  ])('fails closed on %s and still closes the browser', async (_label, scripts, diagnostic) => {
    const fake = fakePlaywright({ observation: hydrated, scripts });
    await expect(
      runLoaderBundleSmoke(
        { bundles: await bundles(), engine: 'chromium' },
        { playwright: fake.playwright },
      ),
    ).rejects.toThrowError(diagnostic);
    expect(fake.state.closedBrowser).toBe(true);
    if (String(diagnostic).includes('wss')) expect(fake.state.aborted).toContain('ws:1008');
  });

  it('reports a button that never rendered after the wait gives up', async () => {
    const fake = fakePlaywright({
      observation: { hydrated: false, shadowButtonRendered: false },
      scripts: working,
      waitError: true,
    });
    await expect(
      runLoaderBundleSmoke(
        { bundles: await bundles(), engine: 'webkit' },
        { playwright: fake.playwright },
      ),
    ).rejects.toThrowError(
      /the esbuild bundle did not render ki-button.*"shadowButtonRendered":false/u,
    );
    expect(fake.state.contexts[0].wait.options).toEqual({ timeout: 30_000 });
  });

  it('refuses a browser that does not launch and a bundle set other than esbuild then Vite', async () => {
    const list = await bundles();
    await expect(
      runLoaderBundleSmoke(
        { bundles: list, engine: 'webkit' },
        { playwright: fakePlaywright({ launchError: 'missing', scripts: [] }).playwright },
      ),
    ).rejects.toThrowError(
      'consumer-loader: webkit could not launch from PLAYWRIGHT_BROWSERS_PATH: missing',
    );
    for (const wrong of [[list[0]], [list[1], list[0]], [...list, list[0]]]) {
      const fake = fakePlaywright({ observation: hydrated, scripts: working });
      await expect(
        runLoaderBundleSmoke({ bundles: wrong, engine: 'webkit' }, { playwright: fake.playwright }),
      ).rejects.toThrowError('consumer-loader: expected one bundle from each of esbuild, vite');
      expect(fake.state.launch).toBeUndefined();
    }
  });
});
