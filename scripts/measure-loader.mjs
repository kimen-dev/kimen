#!/usr/bin/env node
// node scripts/measure-loader.mjs <packed-elements-tarball>
// Measure the JavaScript each loader page actually requests, compressed
// individually with Brotli quality 11.
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, relative, resolve } from 'node:path';
import { brotliCompressSync, constants } from 'node:zlib';

import { PAGES } from '../packages/elements/scripts/page-weight.mjs';

import {
  bundleFile,
  bundleLoaderApplications,
  loadPlaywright,
} from './consumer-loader-bundles.mjs';

const origin = 'https://loader.kimen.invalid';

function application(tags) {
  return [
    "import { defineCustomElements } from '@kimen/elements/loader';",
    '',
    'defineCustomElements();',
    ...tags.map(
      (tag) =>
        `document.body.append(Object.assign(document.createElement('${tag}'), { textContent: 'x' }));`,
    ),
    '',
  ].join('\n');
}

async function measure({ browser, directory, tags }) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const requested = new Set();
  const errors = [];
  try {
    await context.route('**/*', async (route) => {
      const url = route.request().url();
      const file = await bundleFile(directory, url);
      if (file === null) return route.abort();
      const script = extname(file) === '.js';
      if (script) requested.add(file);
      await route.fulfill({
        body: await readFile(file),
        contentType: script ? 'text/javascript' : 'text/html',
      });
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
    await page.waitForFunction(
      (expected) =>
        expected.every((tag) =>
          globalThis.document.querySelector(tag)?.classList.contains('hydrated'),
        ),
      tags,
      { timeout: 60_000 },
    );
    await page.waitForLoadState('networkidle');
    if (errors.length > 0) throw new Error(errors.join('\n'));
  } finally {
    await context.close();
  }
  const sizes = {};
  for (const file of [...requested].sort()) {
    const bytes = await readFile(file);
    sizes[relative(directory, file)] = {
      raw: bytes.length,
      brotli: brotliCompressSync(bytes, {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: 11,
          [constants.BROTLI_PARAM_SIZE_HINT]: bytes.length,
        },
      }).length,
    };
  }
  return {
    files: Object.keys(sizes).length,
    totalRaw: Object.values(sizes).reduce((sum, { raw }) => sum + raw, 0),
    totalBrotli: Object.values(sizes).reduce((sum, { brotli }) => sum + brotli, 0),
    sizes,
  };
}

async function main(tarball) {
  if (!tarball) throw new Error('Usage: node scripts/measure-loader.mjs <packed-elements-tarball>');
  const consumerDirectory = await mkdtemp(join(tmpdir(), 'kimen-measure-loader-'));
  try {
    const installed = join(consumerDirectory, 'node_modules/@kimen/elements');
    await mkdir(installed, { recursive: true });
    execFileSync('tar', ['-xzf', resolve(tarball), '-C', installed, '--strip-components=1']);
    const all = (await readdir(join(installed, 'dist/components')))
      .filter((file) => /^ki-[a-z0-9-]+\.d\.ts$/u.test(file))
      .map((file) => file.slice(0, -'.d.ts'.length))
      .sort();
    const pages = {
      loaderOnly: [],
      ...Object.fromEntries(Object.entries(PAGES).map(([name, { tags }]) => [name, tags])),
      all,
    };
    const { chromium } = loadPlaywright();
    const browser = await chromium.launch({ headless: true });
    try {
      const results = {};
      for (const [name, tags] of Object.entries(pages)) {
        const bundles = await bundleLoaderApplications({
          consumerDirectory,
          name,
          source: application(tags),
        });
        for (const { bundler, directory } of bundles) {
          results[`${name}/${bundler}`] = await measure({ browser, directory, tags });
        }
      }
      process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
    } finally {
      await browser.close();
    }
  } finally {
    await rm(consumerDirectory, { force: true, recursive: true });
  }
}

await main(process.argv[2]);
