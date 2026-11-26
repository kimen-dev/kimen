// Measures what a page that registers @kimen/elements/loader downloads, the
// way scripts/consumer-loader-bundles.mjs bundles it (esbuild with splitting,
// Vite build), served to Chromium. Usage:
//   node measure-loader.mjs <repo root> <elements tarball> <label>
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { extname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { brotliCompressSync, constants } from 'node:zlib';

const [repoRoot, tarball, label] = process.argv.slice(2);
const { workspaceBundlers } = await import(
  pathToFileURL(join(repoRoot, 'scripts/consumer-loader-bundles.mjs')).href
);
const playwright = createRequire(join(repoRoot, 'packages/elements/package.json'))('playwright');

const brotli = (bytes) =>
  brotliCompressSync(bytes, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 11,
      [constants.BROTLI_PARAM_SIZE_HINT]: bytes.length,
    },
  }).length;

const PAGES = {
  // The loader alone: what a page pays before it uses any component.
  loaderOnly: [],
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
};

const consumer = await realpath(await mkdtemp(join(tmpdir(), `kimen-loader-weight-${label}-`)));
const installed = join(consumer, 'node_modules/@kimen/elements');
await mkdir(installed, { recursive: true });
execFileSync('tar', ['-xzf', tarball, '-C', installed, '--strip-components=1']);
await writeFile(join(consumer, 'package.json'), '{ "type": "module", "private": true }\n');

// Every component the package publishes, one element each.
const { readdir } = await import('node:fs/promises');
PAGES.all = (await readdir(join(installed, 'dist/components')))
  .filter((file) => /^ki-[a-z0-9-]+\.d\.ts$/u.test(file))
  .map((file) => file.slice(0, -'.d.ts'.length))
  .sort();
if (process.env.PAGES) {
  for (const name of Object.keys(PAGES))
    if (!process.env.PAGES.split(',').includes(name)) delete PAGES[name];
}

const bundlers = workspaceBundlers(repoRoot);
const page = (script) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>w</title></head><body><script type="module" src="./${script}"></script></body></html>\n`;

const results = {};
for (const [name, tags] of Object.entries(PAGES)) {
  const application = join(consumer, `app-${name}`);
  await mkdir(application, { recursive: true });
  const main = [
    "import { defineCustomElements } from '@kimen/elements/loader';",
    '',
    'defineCustomElements();',
    ...tags.map(
      (tag) =>
        `document.body.append(Object.assign(document.createElement('${tag}'), { textContent: 'x' }));`,
    ),
    '',
  ].join('\n');
  await writeFile(join(application, 'main.js'), main);
  await writeFile(join(application, 'index.html'), page('main.js'));
  for (const bundler of ['esbuild', 'vite']) {
    const output = join(application, 'dist', bundler);
    await mkdir(output, { recursive: true });
    if (bundler === 'esbuild') {
      const esbuild = await bundlers.esbuild();
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
      await writeFile(join(output, 'index.html'), page('main.js'));
    } else {
      const vite = await bundlers.vite();
      await vite.build({
        build: { emptyOutDir: true, outDir: output },
        cacheDir: join(application, '.vite'),
        configFile: false,
        envDir: false,
        logLevel: 'silent',
        root: application,
      });
    }
    const directory = await realpath(output);
    const browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext();
    const requested = [];
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      const path = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const file = resolve(directory, `.${path}`);
      if (!file.startsWith(`${directory}${sep}`)) return route.abort();
      try {
        const body = await readFile(file);
        if (extname(file) === '.js') requested.push(relative(directory, file));
        await route.fulfill({
          body,
          status: 200,
          contentType: extname(file) === '.js' ? 'text/javascript' : 'text/html',
        });
      } catch {
        await route.abort();
      }
    });
    const tab = await context.newPage();
    const errors = [];
    tab.on('pageerror', (error) => errors.push(error.message));
    await tab.goto('https://weight.kimen.invalid/', { waitUntil: 'networkidle' });
    await tab
      .waitForFunction(
        (expected) =>
          expected.every((tag) =>
            globalThis.document.querySelector(tag)?.classList.contains('hydrated'),
          ),
        tags,
        { timeout: 60_000 },
      )
      .catch(() => errors.push('not every tag hydrated'));
    await tab.waitForTimeout(500);
    await browser.close();
    const files = [...new Set(requested)].sort();
    const sizes = Object.fromEntries(
      await Promise.all(
        files.map(async (file) => {
          const bytes = await readFile(join(directory, file));
          return [file, { raw: bytes.length, brotli: brotli(bytes) }];
        }),
      ),
    );
    const entry =
      bundler === 'esbuild'
        ? 'main.js'
        : files.find((file) => /index-[^/]*\.js$/u.test(file) || /^assets\/index/u.test(file));
    results[`${name}/${bundler}`] = {
      files: files.length,
      totalBrotli: Object.values(sizes).reduce((sum, { brotli: b }) => sum + b, 0),
      totalRaw: Object.values(sizes).reduce((sum, { raw }) => sum + raw, 0),
      entry,
      entryBrotli: sizes[entry]?.brotli,
      entryRaw: sizes[entry]?.raw,
      errors,
      sizes,
    };
  }
}
process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
