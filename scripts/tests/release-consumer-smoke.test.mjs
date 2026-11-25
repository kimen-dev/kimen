// @spec:151-release-automation
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  frameworkVersions,
  GENERATIVE_CONSUMER,
  inspectTarball,
  probeGenerativeModules,
  probeWrapperConsumer,
  runGenerativeProbe,
  smokeGenerativeConsumer,
  verifyInstalledPackages,
  WRAPPER_CONSUMERS,
} from '../release/consumer-smoke.mjs';

const version = '1.2.3';

async function temporaryDirectory(t, prefix) {
  const directory = await realpath(await mkdtemp(join(tmpdir(), prefix)));
  t.after(() => rm(directory, { force: true, recursive: true }));
  return directory;
}

// One tarball as npm packs it, from a manifest and an index module.
async function packTarball(t, manifest) {
  const directory = await temporaryDirectory(t, 'kimen-consumer-smoke-package-');
  await writeFile(join(directory, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(join(directory, 'index.js'), 'export {};\n');
  const result = spawnSync('npm', ['pack', '--ignore-scripts', '--json'], {
    cwd: directory,
    encoding: 'utf8',
    env: {
      HOME: directory,
      LC_ALL: 'C',
      PATH: process.env.PATH,
      npm_config_cache: join(directory, '.npm-cache'),
      npm_config_offline: 'true',
    },
  });
  assert.equal(result.status, 0, result.stderr);
  return join(directory, JSON.parse(result.stdout)[0].filename);
}

const generativeManifest = (name, extra = {}) => ({
  name,
  version,
  type: 'module',
  ...(['@kimen/emitter', '@kimen/adapter-a2ui', '@kimen/adapter-mcp-apps'].includes(name)
    ? { dependencies: { '@kimen/catalog': version } }
    : {}),
  ...extra,
});

test('S7 a tarball that still carries a workspace range is refused before anything is installed', async (t) => {
  const tarballs = new Map();
  for (const name of GENERATIVE_CONSUMER) {
    const extra =
      name === '@kimen/emitter' ? { dependencies: { '@kimen/catalog': 'workspace:*' } } : {};
    tarballs.set(name, await packTarball(t, generativeManifest(name, extra)));
  }

  await assert.rejects(
    smokeGenerativeConsumer({ tarballs, version }),
    /@kimen\/emitter dependencies\.@kimen\/catalog still carries the workspace range workspace:\*/u,
  );
});

test('S7 a tarball is refused unless it is the named package at the candidate version with candidate Kimen dependencies', async (t) => {
  const accepted = await packTarball(t, generativeManifest('@kimen/emitter'));
  const { manifest, bytes } = await inspectTarball(accepted, { name: '@kimen/emitter', version });
  assert.deepEqual(manifest.dependencies, { '@kimen/catalog': version });
  assert.equal(JSON.parse(bytes.toString('utf8')).name, '@kimen/emitter');

  await assert.rejects(
    inspectTarball(accepted, { name: '@kimen/catalog', version }),
    /must be @kimen\/catalog@1\.2\.3; found @kimen\/emitter@1\.2\.3/u,
  );
  await assert.rejects(
    inspectTarball(accepted, { name: '@kimen/emitter', version: '1.2.4' }),
    /must be @kimen\/emitter@1\.2\.4/u,
  );
  for (const [field, dependencies, pattern] of [
    [
      'dependencies',
      { '@kimen/catalog': '^1.2.3' },
      /must be the candidate's 1\.2\.3; found \^1\.2\.3/u,
    ],
    ['peerDependencies', { '@kimen/nx-plugin': version }, /peerDependencies\.@kimen\/nx-plugin/u],
    ['optionalDependencies', { '@kimen/catalog': 'workspace:^' }, /workspace range workspace:\^/u],
  ]) {
    const tarball = await packTarball(
      t,
      generativeManifest('@kimen/emitter', { [field]: dependencies }),
    );
    await assert.rejects(inspectTarball(tarball, { name: '@kimen/emitter', version }), pattern);
  }
  await assert.rejects(
    inspectTarball(join(tmpdir(), 'kimen-missing-tarball.tgz'), {
      name: '@kimen/emitter',
      version,
    }),
    /cannot read package\/package\.json/u,
  );
});

async function installedConsumer(t, layout) {
  const root = await temporaryDirectory(t, 'kimen-consumer-smoke-installed-');
  const expected = new Map();
  for (const { path, name, packed = `{"name":"${name}"}\n`, installed = packed } of layout) {
    const directory = join(root, path);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'package.json'), installed);
    if (path === `node_modules/${name}`) expected.set(name, Buffer.from(packed));
  }
  return { root, expected };
}

test('S7 the installed consumer holds each Kimen package once, at the top level, from its tarball', async (t) => {
  const { root, expected } = await installedConsumer(t, [
    { path: 'node_modules/@kimen/catalog', name: '@kimen/catalog' },
    { path: 'node_modules/@kimen/emitter', name: '@kimen/emitter' },
    { path: 'node_modules/zod', name: 'zod' },
    { path: 'node_modules/zod/node_modules/@scope/helper', name: '@scope/helper' },
  ]);
  expected.delete('zod');

  assert.deepEqual(await verifyInstalledPackages(root, expected), [
    '@kimen/catalog',
    '@kimen/emitter',
  ]);
});

for (const [label, layout, pattern] of [
  [
    'a second, nested copy',
    [
      { path: 'node_modules/@kimen/catalog', name: '@kimen/catalog' },
      { path: 'node_modules/@kimen/emitter', name: '@kimen/emitter' },
      { path: 'node_modules/@kimen/emitter/node_modules/@kimen/catalog', name: '@kimen/catalog' },
    ],
    /@kimen\/catalog was installed again below the top level/u,
  ],
  [
    'a Kimen package the consumer did not ask for',
    [
      { path: 'node_modules/@kimen/catalog', name: '@kimen/catalog' },
      { path: 'node_modules/@kimen/emitter', name: '@kimen/emitter' },
      { path: 'node_modules/zod/node_modules/@kimen/elements', name: '@kimen/elements' },
    ],
    /@kimen\/elements was installed but is not part of this consumer/u,
  ],
  [
    'a manifest other than its tarball',
    [
      { path: 'node_modules/@kimen/catalog', name: '@kimen/catalog' },
      {
        path: 'node_modules/@kimen/emitter',
        name: '@kimen/emitter',
        installed: '{"name":"@kimen/emitter","version":"from-the-registry"}\n',
      },
    ],
    /@kimen\/emitter does not carry the manifest of its tarball/u,
  ],
]) {
  test(`S7 the installed consumer is refused with ${label}`, async (t) => {
    const { root, expected } = await installedConsumer(t, layout);
    await assert.rejects(verifyInstalledPackages(root, expected), pattern);
  });
}

test('S7 the installed consumer is refused when a package is missing or linked from elsewhere', async (t) => {
  const { root, expected } = await installedConsumer(t, [
    { path: 'node_modules/@kimen/catalog', name: '@kimen/catalog' },
  ]);
  expected.set('@kimen/emitter', Buffer.from('{}\n'));
  await assert.rejects(
    verifyInstalledPackages(root, expected),
    /@kimen\/emitter must be installed exactly once; found 0/u,
  );

  const workspace = await temporaryDirectory(t, 'kimen-consumer-smoke-workspace-');
  await writeFile(join(workspace, 'package.json'), '{}\n');
  await symlink(workspace, join(root, 'node_modules/@kimen/emitter'));
  await assert.rejects(
    verifyInstalledPackages(root, expected),
    /@kimen\/emitter is a link, not the installed tarball/u,
  );
});

// Module doubles that answer the probe the way the real packages do.
function generativeModules(overrides = {}) {
  const catalogData = { elementsVersion: version };
  return {
    catalog: {
      catalogData,
      validateUiSpec: (spec) => ({ ok: spec.root.component === 'ki-button', issues: [] }),
    },
    emitter: {
      catalogPrompt: (catalog) => ({
        ok: catalog?.elementsVersion === version,
        artifact: 'Use <ki-button>.',
      }),
      uiSpecJsonSchema: () => ({ ok: true, artifact: { type: 'object' } }),
    },
    a2ui: {
      createA2uiAdapter: () => ({
        apply: () => ({ ok: false, diagnostics: [{ rule: 'unsupported-version' }] }),
      }),
    },
    mcpApps: {
      KIMEN_APP_INFO: { name: 'kimen-surface', version },
      createKimenSurfaceResource: (name) => ({
        uri: `ui://kimen/${name}`,
        text: '<!doctype html>\n<html></html>',
      }),
    },
    resolved: {
      '@kimen/elements': 'file:///consumer/node_modules/@kimen/elements/dist/index.js',
      '@kimen/tokens/css': 'file:///consumer/node_modules/@kimen/tokens/dist/css/tokens.css',
    },
    ...overrides,
  };
}

test('S7 the probe makes one call per generative package and reports what it checked', () => {
  assert.deepEqual(probeGenerativeModules(generativeModules(), version).checked, [
    '@kimen/catalog validateUiSpec',
    '@kimen/emitter catalogPrompt',
    '@kimen/emitter uiSpecJsonSchema',
    '@kimen/adapter-a2ui createA2uiAdapter',
    '@kimen/adapter-mcp-apps createKimenSurfaceResource',
    '@kimen/elements resolves',
    '@kimen/tokens/css resolves',
  ]);
});

for (const [label, overrides, pattern] of [
  [
    'the catalog rejects the one-node spec',
    {
      catalog: {
        ...generativeModules().catalog,
        validateUiSpec: () => ({ ok: false, issues: ['x'] }),
      },
    },
    /@kimen\/catalog rejected a one-node spec: \["x"\]/u,
  ],
  [
    'the catalog describes other elements',
    { catalog: { ...generativeModules().catalog, catalogData: { elementsVersion: '0.0.0' } } },
    /@kimen\/catalog must describe @kimen\/elements 1\.2\.3/u,
  ],
  [
    'the prompt does not describe the catalog',
    {
      emitter: {
        ...generativeModules().emitter,
        catalogPrompt: () => ({ ok: true, artifact: 'nothing' }),
      },
    },
    /catalogPrompt did not describe the installed catalog/u,
  ],
  [
    'the schema is not an object schema',
    {
      emitter: {
        ...generativeModules().emitter,
        uiSpecJsonSchema: () => ({ ok: true, artifact: { type: 'array' } }),
      },
    },
    /uiSpecJsonSchema did not derive an object schema/u,
  ],
  [
    'the A2UI adapter accepts an unsupported version',
    { a2ui: { createA2uiAdapter: () => ({ apply: () => ({ ok: true, diagnostics: [] }) }) } },
    /did not refuse an unsupported protocol version/u,
  ],
  [
    'the MCP Apps resource is not a ui:// document',
    {
      mcpApps: {
        ...generativeModules().mcpApps,
        createKimenSurfaceResource: () => ({ uri: 'https://example.invalid', text: '' }),
      },
    },
    /did not create its ui:\/\/ surface resource/u,
  ],
  [
    'the MCP Apps surface announces another version',
    {
      mcpApps: {
        ...generativeModules().mcpApps,
        KIMEN_APP_INFO: { name: 'kimen-surface', version: '0.0.0' },
      },
    },
    /surface must announce 1\.2\.3/u,
  ],
  [
    'elements resolve outside the consumer',
    {
      resolved: {
        '@kimen/elements': 'file:///workspace/packages/elements/dist/index.js',
      },
    },
    /@kimen\/elements must resolve inside the consumer's node_modules/u,
  ],
]) {
  test(`S7 the probe fails when ${label}`, () => {
    assert.throws(() => probeGenerativeModules(generativeModules(overrides), version), pattern);
  });
}

// The driver imports every package from the consumer's own node_modules; an
// offline consumer of stub packages proves the specifiers it names.
test('S7 the driver imports the packages from the consumer and runs the probe there', async (t) => {
  const root = await temporaryDirectory(t, 'kimen-consumer-smoke-driver-');
  const stub = async (name, source, exports = { '.': './index.js' }) => {
    const directory = join(root, 'node_modules', name);
    await mkdir(directory, { recursive: true });
    await writeFile(
      join(directory, 'package.json'),
      JSON.stringify({ name, type: 'module', exports }),
    );
    await writeFile(join(directory, 'index.js'), source);
  };
  await writeFile(join(root, 'package.json'), '{"private":true,"type":"module"}\n');
  await stub(
    '@kimen/catalog',
    `export const catalogData = { elementsVersion: '${version}' };
export const validateUiSpec = () => ({ ok: true, issues: [] });`,
  );
  await stub(
    '@kimen/emitter',
    `export const catalogPrompt = () => ({ ok: true, artifact: 'ki-button' });
export const uiSpecJsonSchema = () => ({ ok: true, artifact: { type: 'object' } });`,
  );
  await stub(
    '@kimen/adapter-a2ui',
    `export const createA2uiAdapter = () => ({ apply: () => ({ ok: false, diagnostics: [{ rule: 'unsupported-version' }] }) });`,
  );
  await stub(
    '@kimen/adapter-mcp-apps',
    `export const KIMEN_APP_INFO = { version: '${version}' };
export const createKimenSurfaceResource = (name) => ({ uri: 'ui://kimen/' + name, text: '<!doctype html>' });`,
  );
  await stub('@kimen/elements', 'export {};');
  await stub('@kimen/tokens', '', { './css': './tokens.css' });

  const report = await runGenerativeProbe(root, version);
  assert.equal(report.checked.length, 7);
  assert.equal(
    await readFile(join(root, 'probe.mjs'), 'utf8').then((text) => text.includes('@kimen/catalog')),
    true,
  );
  await assert.rejects(
    runGenerativeProbe(root, '9.9.9'),
    /must describe @kimen\/elements 9\.9\.9/u,
  );
});

test('S7 each wrapper consumer installs its framework at the wrapper development versions', async () => {
  assert.deepEqual(
    WRAPPER_CONSUMERS.map(({ name }) => name),
    ['@kimen/react', '@kimen/vue', '@kimen/angular'],
  );
  for (const consumer of WRAPPER_CONSUMERS) {
    const manifest = JSON.parse(
      await readFile(
        new URL(
          `../../packages/${consumer.name.slice('@kimen/'.length)}/package.json`,
          import.meta.url,
        ),
        'utf8',
      ),
    );
    assert.deepEqual(
      await frameworkVersions(consumer),
      consumer.frameworks.map((framework) => `${framework}@${manifest.devDependencies[framework]}`),
    );
  }
  // vue-router is an optional peer of @kimen/vue: its consumer does without.
  const vue = WRAPPER_CONSUMERS.find(({ name }) => name === '@kimen/vue');
  assert.deepEqual(vue.frameworks, ['vue']);
  assert.deepEqual(vue.absent, ['vue-router']);
});

// Offline: stub packages, the real workspace compiler, bundler and Node.
test('S7 a wrapper consumer type-checks, bundles and imports the installed wrapper, and fails on a wrong prop', async (t) => {
  const root = await temporaryDirectory(t, 'kimen-consumer-smoke-wrapper-');
  const stub = async (name, files, exports) => {
    const directory = join(root, 'node_modules', name);
    await mkdir(directory, { recursive: true });
    await writeFile(
      join(directory, 'package.json'),
      JSON.stringify({ name, type: 'module', exports }),
    );
    for (const [file, text] of Object.entries(files)) await writeFile(join(directory, file), text);
  };
  await writeFile(join(root, 'package.json'), '{"private":true,"type":"module"}\n');
  await stub(
    '@kimen/react',
    {
      'index.js':
        "import { tag } from '@kimen/elements/tag.js';\nexport const KiButton = { tag, tone: 'danger' };\n",
      'index.d.ts': "export declare const KiButton: { tone: 'danger' | 'neutral' };\n",
    },
    { '.': { types: './index.d.ts', import: './index.js' } },
  );
  await stub(
    '@kimen/elements',
    { 'tag.js': "export const tag = 'ki-button';\n" },
    { './tag.js': './tag.js' },
  );
  const consumer = {
    name: '@kimen/react',
    entry: 'consumer.ts',
    absent: ['vue-router'],
    nodeImport: true,
    source: `import { KiButton } from '@kimen/react';
export const tone: 'danger' | 'neutral' = KiButton.tone;
// @ts-expect-error a tone is not a number
export const wrong: number = KiButton.tone;
`,
  };

  const report = await probeWrapperConsumer(root, consumer);
  assert.equal(report.typecheck, 'passed');
  assert.equal(report.bundle.inputs, 3);
  assert.equal(report.nodeImport, true);

  await assert.rejects(
    probeWrapperConsumer(root, {
      ...consumer,
      source:
        "import { KiButton } from '@kimen/react';\n// @ts-expect-error\nexport const tone: string = KiButton.tone;\n",
    }),
    /Unused '@ts-expect-error' directive/u,
  );
  await stub('vue-router', { 'index.js': '' }, { '.': './index.js' });
  await assert.rejects(
    probeWrapperConsumer(root, consumer),
    /the @kimen\/react consumer must not install vue-router/u,
  );
});
