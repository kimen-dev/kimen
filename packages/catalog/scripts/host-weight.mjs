// The GenUI host weight gate (Art. IV): what a browser page downloads to
// validate and render agent specs. It packs @kimen/catalog exactly as npm
// publishes it, installs the tarball beside the zod it depends on, bundles
// for production an entry that imports `validateUiSpec` and `renderUiSpec`,
// and fails when the bundle outgrows its budget (the `genuiHost` base in
// scripts/lib/bundle-size-budget.mjs) or carries a module no such host needs:
//
// - the catalog's guidance prose, or the `catalogData` that joins it back:
//   descriptions are for the model that writes specs, never for the page
//   that checks them (src/guidance.ts);
// - classic zod, any zod locale but English, or zod's JSON Schema
//   converters: the boundary parses with zod/mini (src/zod-defaults.ts),
//   and `import { z } from 'zod'` would bring all of classic zod back.
//
// Run from packages/catalog after its build: `node scripts/host-weight.mjs`.
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, realpath, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { brotliCompressSync, gzipSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, '..');

/** The entry a host writes: both entry points referenced, so neither is shaken out. */
export const HOST_ENTRY = [
  "import { renderUiSpec, validateUiSpec } from '@kimen/catalog';",
  'globalThis.kimenGenUiHost = { renderUiSpec, validateUiSpec };',
  '',
].join('\n');

/** Bundle inputs no host that validates and renders may carry, with the reason. */
export const FORBIDDEN_INPUTS = Object.freeze([
  [/@kimen\/catalog\/dist\/generated\/catalog-guidance\.js$/u, 'the catalog guidance prose'],
  [/@kimen\/catalog\/dist\/generated\/catalog\.js$/u, 'catalogData, which joins the prose back'],
  [/@kimen\/catalog\/dist\/guidance\.js$/u, 'the join of the guidance prose'],
  [/\/zod\/v4\/classic\//u, 'classic zod (the boundary parses with zod/mini)'],
  [/\/zod\/v4\/locales\/(?!en\.js$)[^/]+$/u, 'a zod locale other than English'],
  [
    /\/zod\/v4\/core\/(?:json-schema-processors|to-json-schema)\.js$/u,
    'the zod JSON Schema converters',
  ],
]);

/** Raw, gzip (level 9) and brotli (default quality 11) bytes, as every size budget measures. */
export function measure(bytes) {
  return {
    raw: bytes.length,
    gzip: gzipSync(bytes, { level: 9 }).length,
    brotli: brotliCompressSync(bytes).length,
  };
}

// A bundle input from its package directory on, wherever the store keeps it.
const fromPackage = (input) => {
  const at = input.lastIndexOf('node_modules/');
  return at === -1 ? input : input.slice(at);
};
const SHOWN = 3;

/**
 * Every reason the bundle fails: the forbidden inputs (by the paths in its
 * esbuild metafile), one line per reason naming the first few, and each
 * metric over its budget. Empty means it passes.
 */
export function hostWeightViolations({ inputs, sizes, budget }) {
  const violations = [];
  const found = new Map();
  for (const input of inputs) {
    const forbidden = FORBIDDEN_INPUTS.find(([pattern]) => pattern.test(input));
    if (forbidden !== undefined) {
      found.set(forbidden[1], [...(found.get(forbidden[1]) ?? []), fromPackage(input)]);
    }
  }
  for (const [reason, paths] of found) {
    const more = paths.length > SHOWN ? ` and ${String(paths.length - SHOWN)} more` : '';
    violations.push(`${reason}: ${paths.slice(0, SHOWN).join(', ')}${more}`);
  }
  for (const metric of ['raw', 'gzip', 'brotli']) {
    if (!Number.isSafeInteger(budget?.[metric])) {
      violations.push(`the genuiHost budget declares no ${metric} limit`);
    } else if (sizes[metric] > budget[metric]) {
      violations.push(`${metric} ${sizes[metric]} B is over the ${budget[metric]} B budget`);
    }
  }
  return violations;
}

/** The packed catalog in a scratch consumer, beside the zod version it depends on. */
async function installPackedCatalog(scratch) {
  const packed = JSON.parse(
    execFileSync(
      'npm',
      ['pack', '--offline', '--ignore-scripts', '--json', '--pack-destination', scratch],
      { cwd: packageRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ),
  );
  const installed = join(scratch, 'node_modules/@kimen/catalog');
  await mkdir(installed, { recursive: true });
  execFileSync('tar', [
    '-xzf',
    join(scratch, packed[0].filename),
    '-C',
    installed,
    '--strip-components',
    '1',
  ]);
  const manifest = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
  const zod = await realpath(join(packageRoot, 'node_modules/zod'));
  const zodVersion = JSON.parse(await readFile(join(zod, 'package.json'), 'utf8')).version;
  if (manifest.dependencies?.zod !== zodVersion) {
    throw new Error(
      `the packed catalog depends on zod ${String(manifest.dependencies?.zod)}, but ${zodVersion} is installed`,
    );
  }
  await symlink(zod, join(scratch, 'node_modules/zod'), 'dir');
}

async function bundleHost(scratch) {
  const { build } = await import('esbuild');
  const result = await build({
    absWorkingDir: scratch,
    bundle: true,
    define: { 'process.env.NODE_ENV': '"production"' },
    format: 'esm',
    legalComments: 'none',
    logLevel: 'error',
    metafile: true,
    minify: true,
    platform: 'browser',
    stdin: { contents: HOST_ENTRY, loader: 'js', resolveDir: scratch, sourcefile: 'host.js' },
    target: 'es2022',
    treeShaking: true,
    write: false,
  });
  return {
    bytes: Buffer.from(result.outputFiles[0].contents),
    inputs: Object.values(result.metafile.outputs).flatMap((output) => Object.keys(output.inputs)),
  };
}

function readBudget() {
  const budgets = JSON.parse(
    execFileSync(
      process.execPath,
      [resolve(packageRoot, '../../scripts/lib/bundle-size-budget.mjs')],
      {
        encoding: 'utf8',
      },
    ),
  );
  return budgets.genuiHost;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const scratch = await mkdtemp(join(tmpdir(), 'kimen-genui-host-'));
  try {
    await installPackedCatalog(scratch);
    const { bytes, inputs } = await bundleHost(scratch);
    const sizes = measure(bytes);
    const budget = readBudget();
    const violations = hostWeightViolations({ budget, inputs, sizes });
    const summary = ['raw', 'gzip', 'brotli']
      .map((metric) => `${metric} ${sizes[metric]}/${String(budget?.[metric])} B`)
      .join(', ');
    if (violations.length > 0) {
      process.stderr.write(`GenUI host weight: FAIL (${summary})\n${violations.join('\n')}\n`);
      process.exitCode = 1;
    } else {
      process.stdout.write(`GenUI host weight: PASS (${summary})\n`);
    }
  } finally {
    await rm(scratch, { force: true, recursive: true });
  }
}
