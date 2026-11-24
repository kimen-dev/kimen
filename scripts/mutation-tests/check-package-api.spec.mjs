import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { setImmediate } from 'node:timers/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, expect, it, onTestFinished, vi } from 'vitest';

// The command line of the package API gate (`node
// scripts/gates/check-package-api.mjs [--write]`), run in this process so the
// daily mutation run sees it. package-api-snapshot.spec.mjs covers
// checkPackageApi itself; here the gate's package list is replaced by
// packages built in a temporary folder, so the real snapshots under
// changes/api/packages are never read or written.

const { packages } = vi.hoisted(() => ({ packages: [] }));

vi.mock('../lib/package-api-snapshot.mjs', async (importOriginal) => ({
  ...(await importOriginal()),
  GENERATIVE_PACKAGES: packages,
}));

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const modulePath = fileURLToPath(new URL('../gates/check-package-api.mjs', import.meta.url));

async function put(root, path, contents) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, 'utf8');
}

/** A built package in a temporary folder, listed with paths relative to the repository root. */
async function aPackage(name) {
  const root = await mkdtemp(join(tmpdir(), 'kimen-package-api-cli-'));
  onTestFinished(() => rm(root, { force: true, recursive: true }));
  await put(
    root,
    'package/package.json',
    `${JSON.stringify({
      name,
      version: '0.0.0',
      exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' } },
    })}\n`,
  );
  await put(
    root,
    'package/dist/index.d.ts',
    'export declare function render(spec: unknown): boolean;\n',
  );
  return {
    name,
    directory: relative(repositoryRoot, join(root, 'package')),
    snapshot: relative(repositoryRoot, join(root, 'snapshot.json')),
    dataExports: {},
    snapshotFile: join(root, 'snapshot.json'),
  };
}

let output;
let exitCode;

/** Loads the gate as `node check-package-api.mjs ...args`; resolves once it reported. */
async function runGate(...args) {
  output.length = 0;
  vi.resetModules();
  const argv = process.argv;
  process.argv = [argv[0], modulePath, ...args];
  try {
    await import('../gates/check-package-api.mjs');
  } finally {
    process.argv = argv;
  }
  await vi.waitFor(
    () => {
      if (output.length === 0) throw new Error('the gate has not reported yet');
    },
    { timeout: 10_000, interval: 5 },
  );
  return { output: [...output], exitCode: process.exitCode };
}

beforeEach(() => {
  output = [];
  exitCode = process.exitCode;
  packages.length = 0;
  for (const stream of ['stdout', 'stderr']) {
    vi.spyOn(process[stream], 'write').mockImplementation((chunk) => {
      if (String(chunk).includes('package-api')) output.push([stream, String(chunk)]);
      return true;
    });
  }
});

afterEach(() => {
  process.exitCode = exitCode;
  vi.restoreAllMocks();
});

it('--write records every listed package and says how many it wrote', async () => {
  const fixture = await aPackage('@kimen/fixture');
  packages.push(fixture);

  const result = await runGate('--write');

  expect(result).toEqual({
    output: [['stdout', 'wrote package-api: 1 packages\n']],
    exitCode,
  });
  const snapshot = JSON.parse(await readFile(fixture.snapshotFile, 'utf8'));
  expect(snapshot.package).toBe('@kimen/fixture');
  expect(Object.keys(snapshot.modules['.'].symbols)).toEqual(['render']);
});

it('an unchanged surface passes and the gate names how many packages it checked', async () => {
  packages.push(await aPackage('@kimen/one'), await aPackage('@kimen/two'));
  await runGate('--write');

  const result = await runGate();

  expect(result).toEqual({
    output: [['stdout', 'PASS package-api: 2 packages\n']],
    exitCode,
  });
});

it('each problem is one BLOCKED line and the gate exits 1', async () => {
  const one = await aPackage('@kimen/one');
  const two = await aPackage('@kimen/two');
  packages.push(one, two);

  const result = await runGate();

  expect(result).toEqual({
    output: [
      [
        'stderr',
        `BLOCKED package-api: @kimen/one: no committed snapshot at ${one.snapshot}; run \`pnpm api:snapshot\` and commit it\n`,
      ],
      [
        'stderr',
        `BLOCKED package-api: @kimen/two: no committed snapshot at ${two.snapshot}; run \`pnpm api:snapshot\` and commit it\n`,
      ],
    ],
    exitCode: 1,
  });
});

it('an unknown argument is refused with the usage, writes nothing and exits 1', async () => {
  const fixture = await aPackage('@kimen/fixture');
  packages.push(fixture);

  for (const args of [['--check'], ['--write', '--dry-run'], ['write']]) {
    process.exitCode = exitCode;
    const result = await runGate(...args);

    expect(result).toEqual({
      output: [
        [
          'stderr',
          `check-package-api: unknown argument ${args.at(-1)}; usage: check-package-api.mjs [--write]\n`,
        ],
      ],
      exitCode: 1,
    });
  }
  await expect(readFile(fixture.snapshotFile, 'utf8')).rejects.toThrow(/ENOENT/u);
});

it('an error while reading a package is reported with exit code 1', async () => {
  const fixture = await aPackage('@kimen/fixture');
  packages.push({ ...fixture, directory: join(fixture.directory, 'missing') });

  const result = await runGate();

  expect(result.exitCode).toBe(1);
  expect(result.output).toHaveLength(1);
  expect(result.output[0][0]).toBe('stderr');
  expect(result.output[0][1]).toMatch(/^check-package-api: ENOENT: .*package\.json'\n$/u);
});

it('importing the gate as a module checks nothing', async () => {
  packages.push(await aPackage('@kimen/fixture'));
  const argv = process.argv;
  for (const replacement of [[argv[0], fileURLToPath(import.meta.url), '--bogus'], [argv[0]]]) {
    vi.resetModules();
    process.argv = replacement;
    try {
      await import('../gates/check-package-api.mjs');
    } finally {
      process.argv = argv;
    }
    await setImmediate();
  }

  expect(output).toEqual([]);
  expect(process.exitCode).toBe(exitCode);
});
