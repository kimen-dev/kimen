// The lazy loader as an application bundles it, at release (the consumer
// contract, scripts/consumer-contract.mjs, runs this in every engine).
//
// Bundle the installed loader with esbuild and Vite, then serve each build
// to a browser that can fetch only its own output. A one-button page must
// render that button from its own chunk and leave other component chunks idle.
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const origin = 'https://loader.kimen.invalid';

export const LOADER_BUNDLERS = Object.freeze(['esbuild', 'vite']);

export const LOADER_APPLICATION = `import { defineCustomElements } from '@kimen/elements/loader';

defineCustomElements();
const button = document.createElement('ki-button');
button.textContent = 'Continue';
document.body.append(button);
`;

// The page of the application and of its esbuild bundle (Vite writes its own).
export const LOADER_PAGE = [
  '<!doctype html>',
  '<html lang="en">',
  '<head><meta charset="utf-8"><title>Kimen loader</title></head>',
  '<body><script type="module" src="./main.js"></script></body>',
  '</html>',
  '',
].join('\n');

// Both bundlers retain the component name before the hash.
const COMPONENT_CHUNK = /(?:^|\/)ki-[^/]+\.js$/u;
const BUTTON_CHUNK = /(?:^|\/)ki-button(?:2)?[.-][^/]*\.js$/u;

function fail(message) {
  throw new Error(`consumer-loader: ${message}`);
}

/** The workspace's own esbuild and Vite, as the release harness installs them. */
export function workspaceBundlers(root = repositoryRoot) {
  const fromRoot = createRequire(join(root, 'package.json'));
  return {
    esbuild: async () => createRequire(join(root, 'packages/mcp-server/package.json'))('esbuild'),
    // Vite is the one vitest runs on.
    vite: async () => {
      const fromVitest = createRequire(fromRoot.resolve('vitest/package.json'));
      return import(pathToFileURL(fromVitest.resolve('vite')).href);
    },
  };
}

const builders = {
  async esbuild(esbuild, application, output) {
    await esbuild.build({
      absWorkingDir: application,
      bundle: true,
      entryPoints: ['main.js'],
      format: 'esm',
      logLevel: 'silent',
      minify: true,
      outdir: output,
      platform: 'browser',
      splitting: true,
      target: 'es2022',
    });
    await writeFile(join(output, 'index.html'), LOADER_PAGE);
  },
  async vite(vite, application, output) {
    await vite.build({
      build: { emptyOutDir: true, outDir: output },
      cacheDir: join(application, '.vite'),
      configFile: false,
      envDir: false,
      logLevel: 'silent',
      root: application,
    });
  },
};

/**
 * Writes the loader application into `consumerDirectory`, an installed
 * consumer, and bundles it with each of `LOADER_BUNDLERS`. Returns where each
 * bundle was written.
 */
export async function bundleLoaderApplications(
  { consumerDirectory, name = 'loader-application', source = LOADER_APPLICATION },
  { bundlers = workspaceBundlers() } = {},
) {
  const application = join(consumerDirectory, name);
  await mkdir(application, { recursive: true });
  await Promise.all([
    writeFile(join(application, 'main.js'), source),
    writeFile(join(application, 'index.html'), LOADER_PAGE),
  ]);
  const bundles = [];
  for (const bundler of LOADER_BUNDLERS) {
    const output = join(application, 'dist', bundler);
    await mkdir(output, { recursive: true });
    try {
      await builders[bundler](await bundlers[bundler](), application, output);
    } catch (error) {
      fail(`${bundler} could not bundle @kimen/elements/loader: ${error.message}`);
    }
    bundles.push({ bundler, directory: await realpath(output) });
  }
  return bundles;
}

const CONTENT_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.woff2', 'font/woff2'],
]);

/**
 * The file of `directory` that `url` names on the loader origin, or null.
 * Only a regular file inside the directory is served; a query, a fragment or
 * a path that leaves the directory is refused.
 */
export async function bundleFile(directory, url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.origin !== origin || parsed.search !== '' || parsed.hash !== '') return null;
  let path;
  try {
    path = decodeURIComponent(parsed.pathname);
  } catch {
    return null;
  }
  const candidate = resolve(directory, `.${path === '/' ? '/index.html' : path}`);
  const real = await realpath(candidate).catch(() => null);
  if (real === null || !real.startsWith(`${directory}${sep}`)) return null;
  return CONTENT_TYPES.has(extname(real)) ? real : null;
}

/** The evidence of one bundle; refuses anything short of a rendered button loaded from its chunk. */
export function loaderBundleEvidence({ bundler, engine, observation, requested, blocked, errors }) {
  const otherComponentChunks = requested.filter(
    (path) => COMPONENT_CHUNK.test(path) && !BUTTON_CHUNK.test(path),
  );
  const evidence = {
    bundler,
    engine,
    componentChunkLoaded: requested.some((path) => BUTTON_CHUNK.test(path)),
    shadowButtonRendered: observation.shadowButtonRendered === true,
    hydrated: observation.hydrated === true,
    blockedRequests: [...blocked],
    pageErrors: [...errors],
  };
  if (
    !evidence.componentChunkLoaded ||
    !evidence.shadowButtonRendered ||
    !evidence.hydrated ||
    otherComponentChunks.length > 0 ||
    evidence.blockedRequests.length > 0 ||
    evidence.pageErrors.length > 0
  ) {
    fail(
      `the ${bundler} bundle did not render ki-button from its chunk: ${JSON.stringify({ ...evidence, otherComponentChunks })}`,
    );
  }
  return evidence;
}

const loadPlaywright = () =>
  createRequire(join(repositoryRoot, 'packages/elements/package.json'))('playwright');

/**
 * Opens each bundle in `engine`, served alone at the root of its own origin,
 * and returns the evidence that it rendered ki-button from the component's
 * chunk without any request outside the bundle.
 */
export async function runLoaderBundleSmoke(
  { bundles, engine },
  { playwright = loadPlaywright(), timeout = 30_000 } = {},
) {
  if (bundles.map(({ bundler }) => bundler).join() !== LOADER_BUNDLERS.join()) {
    fail(`expected one bundle from each of ${LOADER_BUNDLERS.join(', ')}`);
  }
  let browser;
  try {
    browser = await playwright[engine].launch({ headless: true });
  } catch (error) {
    fail(`${engine} could not launch from PLAYWRIGHT_BROWSERS_PATH: ${error.message}`);
  }
  try {
    const evidence = [];
    for (const { bundler, directory } of bundles) {
      const context = await browser.newContext({ serviceWorkers: 'block' });
      const requested = [];
      const blocked = new Set();
      const errors = [];
      await context.routeWebSocket(/.*/u, async (webSocket) => {
        blocked.add(webSocket.url());
        await webSocket.close({ code: 1008, reason: 'the loader check blocks browser egress' });
      });
      await context.route('**/*', async (route) => {
        const url = route.request().url();
        const file = await bundleFile(directory, url);
        if (file === null) {
          blocked.add(url);
          await route.abort('blockedbyclient');
          return;
        }
        requested.push(relative(directory, file).split(sep).join('/'));
        await route.fulfill({
          body: await readFile(file),
          contentType: CONTENT_TYPES.get(extname(file)),
          status: 200,
        });
      });
      const tab = await context.newPage();
      tab.on('pageerror', (error) => errors.push(error.message));
      tab.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await tab.goto(`${origin}/`, { waitUntil: 'load' });
      await tab
        .waitForFunction(
          () =>
            globalThis.document.querySelector('ki-button')?.shadowRoot?.querySelector('button') !=
            null,
          null,
          { timeout },
        )
        .catch(() => undefined);
      const observation = await tab.evaluate(() => {
        const host = globalThis.document.querySelector('ki-button');
        return {
          hydrated: host?.classList.contains('hydrated') ?? false,
          shadowButtonRendered: host?.shadowRoot?.querySelector('button') != null,
        };
      });
      await context.close();
      evidence.push(
        loaderBundleEvidence({ bundler, engine, observation, requested, blocked, errors }),
      );
    }
    return evidence;
  } finally {
    await browser.close();
  }
}
