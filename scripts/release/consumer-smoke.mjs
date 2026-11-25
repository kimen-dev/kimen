// Clean-consumer smoke of an exact release candidate: the generative UI
// packages install from their tarballs into a fresh npm project, with their
// third-party dependencies from the registry and lifecycle scripts off, and
// then answer one cheap call each in Node. The browser consumer contract
// (scripts/consumer-contract.mjs) keeps covering elements and tokens in every
// engine; this smoke proves the packages that depend on one another through
// rewritten workspace ranges resolve to each other, once, from the candidate.
import { execFile } from 'node:child_process';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { verifyCandidate } from './build-candidate.mjs';
import { releasePackages, runtimeDependencyFields } from './release-plan.mjs';

const execFileAsync = promisify(execFile);
const REGISTRY = 'https://registry.npmjs.org/';

// Elements and tokens complete the set a generative UI application installs.
export const GENERATIVE_CONSUMER = Object.freeze([
  '@kimen/elements',
  '@kimen/tokens',
  '@kimen/catalog',
  '@kimen/emitter',
  '@kimen/adapter-a2ui',
  '@kimen/adapter-mcp-apps',
]);

function fail(message) {
  throw new Error(`consumer smoke: ${message}`);
}

async function packedManifestBytes(tarball) {
  try {
    const { stdout } = await execFileAsync('tar', ['-xOzf', tarball, 'package/package.json'], {
      encoding: 'buffer',
      env: { LC_ALL: 'C', PATH: process.env.PATH },
      maxBuffer: 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    fail(`cannot read package/package.json from ${tarball}: ${error.message}`);
  }
}

/**
 * Reads the manifest a tarball will install and refuses one a clean npm
 * project cannot install from the registry: a `workspace:` range, or a Kimen
 * dependency that is not this candidate's package at its exact version.
 */
export async function inspectTarball(tarball, { name, version }) {
  const bytes = await packedManifestBytes(tarball);
  let manifest;
  try {
    manifest = JSON.parse(bytes.toString('utf8'));
  } catch {
    fail(`${tarball} has an invalid package.json`);
  }
  if (manifest.name !== name || manifest.version !== version) {
    fail(`${tarball} must be ${name}@${version}; found ${manifest.name}@${manifest.version}`);
  }
  for (const field of runtimeDependencyFields) {
    for (const [dependency, range] of Object.entries(manifest[field] ?? {})) {
      if (String(range).startsWith('workspace:')) {
        fail(`${name} ${field}.${dependency} still carries the workspace range ${range}`);
      }
      if (
        dependency.startsWith('@kimen/') &&
        (!releasePackages.has(dependency) || range !== version)
      ) {
        fail(`${name} ${field}.${dependency} must be the candidate's ${version}; found ${range}`);
      }
    }
  }
  return { bytes, manifest };
}

// Every installed package directory below `nodeModules`, at any depth. A
// linked package is listed but not entered.
async function kimenInstallations(nodeModules, found = []) {
  let entries;
  try {
    entries = await readdir(nodeModules, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return found;
    throw error;
  }
  const installed = (entry) => entry.isDirectory() || entry.isSymbolicLink();
  for (const entry of entries) {
    if (!installed(entry) || entry.name.startsWith('.')) continue;
    const path = join(nodeModules, entry.name);
    const packages = entry.name.startsWith('@')
      ? (await readdir(path, { withFileTypes: true }))
          .filter(installed)
          .map((child) => ({ name: `${entry.name}/${child.name}`, link: child.isSymbolicLink() }))
      : [{ name: entry.name, link: entry.isSymbolicLink() }];
    for (const { name, link } of packages) {
      const directory = join(nodeModules, name);
      if (name.startsWith('@kimen/')) found.push({ name, directory });
      if (!link) await kimenInstallations(join(directory, 'node_modules'), found);
    }
  }
  return found;
}

/**
 * Fails unless `node_modules` holds each expected Kimen package exactly once,
 * at the top level, with the manifest bytes of its tarball, and no other
 * Kimen package: nothing came from the registry or a workspace link.
 */
export async function verifyInstalledPackages(consumerRoot, expected) {
  const nodeModules = join(consumerRoot, 'node_modules');
  const installations = await kimenInstallations(nodeModules);
  for (const { name, directory } of installations) {
    if (!expected.has(name)) fail(`${name} was installed but is not part of this consumer`);
    if (directory !== join(nodeModules, name)) {
      fail(`${name} was installed again below the top level at ${directory}`);
    }
  }
  for (const [name, packed] of expected) {
    const copies = installations.filter((installation) => installation.name === name);
    if (copies.length !== 1) fail(`${name} must be installed exactly once; found ${copies.length}`);
    const directory = copies[0].directory;
    if ((await realpath(directory)) !== directory) {
      fail(`${name} is a link, not the installed tarball`);
    }
    const installed = await readFile(join(directory, 'package.json'));
    if (!installed.equals(packed)) fail(`${name} does not carry the manifest of its tarball`);
  }
  return installations.map(({ name }) => name).sort();
}

function npmEnvironment(root) {
  return {
    HOME: root,
    LC_ALL: 'C',
    PATH: process.env.PATH,
    npm_config_audit: 'false',
    npm_config_cache: join(root, '.npm-cache'),
    npm_config_fund: 'false',
    npm_config_globalconfig: join(root, '.npmrc-global'),
    npm_config_ignore_scripts: 'true',
    npm_config_registry: REGISTRY,
    npm_config_update_notifier: 'false',
    npm_config_userconfig: join(root, '.npmrc'),
  };
}

async function run(command, arguments_, options) {
  try {
    return await execFileAsync(command, arguments_, { maxBuffer: 16 * 1024 * 1024, ...options });
  } catch (error) {
    fail(
      `${command} ${arguments_.join(' ')} failed: ${error.stderr?.toString().trim() || error.message}`,
    );
  }
}

/**
 * The cheap, DOM-free call of each generative package, made in the clean
 * consumer with the modules it imported there. Throws on the first answer a
 * published package would not give.
 */
export function probeGenerativeModules({ catalog, emitter, a2ui, mcpApps, resolved }, version) {
  const report = catalog.validateUiSpec({
    version: 1,
    root: { component: 'ki-button', slots: { '': ['Save'] } },
  });
  if (report?.ok !== true) {
    fail(`@kimen/catalog rejected a one-node spec: ${JSON.stringify(report?.issues)}`);
  }
  if (catalog.catalogData?.elementsVersion !== version) {
    fail(`@kimen/catalog must describe @kimen/elements ${version}`);
  }
  const prompt = emitter.catalogPrompt(catalog.catalogData);
  if (prompt?.ok !== true || !String(prompt.artifact).includes('ki-button')) {
    fail('@kimen/emitter catalogPrompt did not describe the installed catalog');
  }
  const schema = emitter.uiSpecJsonSchema(catalog.catalogData);
  if (schema?.ok !== true || schema.artifact?.type !== 'object') {
    fail('@kimen/emitter uiSpecJsonSchema did not derive an object schema');
  }
  const refused = a2ui.createA2uiAdapter({ surface: () => null }).apply({ version: 'v0.8' });
  if (refused?.ok !== false || refused.diagnostics?.[0]?.rule !== 'unsupported-version') {
    fail('@kimen/adapter-a2ui did not refuse an unsupported protocol version');
  }
  const resource = mcpApps.createKimenSurfaceResource('smoke');
  if (
    resource?.uri !== 'ui://kimen/smoke' ||
    !String(resource.text).startsWith('<!doctype html>')
  ) {
    fail('@kimen/adapter-mcp-apps did not create its ui:// surface resource');
  }
  if (mcpApps.KIMEN_APP_INFO?.version !== version) {
    fail(`@kimen/adapter-mcp-apps surface must announce ${version}`);
  }
  for (const [specifier, url] of Object.entries(resolved)) {
    const name = specifier.split('/').slice(0, 2).join('/');
    if (!String(url).startsWith('file:') || !String(url).includes(`/node_modules/${name}/`)) {
      fail(`${specifier} must resolve inside the consumer's node_modules; found ${url}`);
    }
  }
  return {
    checked: [
      '@kimen/catalog validateUiSpec',
      '@kimen/emitter catalogPrompt',
      '@kimen/emitter uiSpecJsonSchema',
      '@kimen/adapter-a2ui createA2uiAdapter',
      '@kimen/adapter-mcp-apps createKimenSurfaceResource',
      ...Object.keys(resolved).map((specifier) => `${specifier} resolves`),
    ],
  };
}

// Imports every package from the consumer's own node_modules and hands them
// to the probe above, which is read from the repository.
export const generativeDriver = (
  probeModule,
) => `import { probeGenerativeModules } from ${JSON.stringify(probeModule)};
const modules = {
  catalog: await import('@kimen/catalog'),
  emitter: await import('@kimen/emitter'),
  a2ui: await import('@kimen/adapter-a2ui'),
  mcpApps: await import('@kimen/adapter-mcp-apps'),
  resolved: {
    '@kimen/elements': import.meta.resolve('@kimen/elements'),
    '@kimen/tokens/css': import.meta.resolve('@kimen/tokens/css'),
  },
};
process.stdout.write(\`\${JSON.stringify(probeGenerativeModules(modules, process.argv[2]))}\\n\`);
`;

/** Runs the generative driver in `root`, a consumer project, and returns the probe's report. */
export async function runGenerativeProbe(root, version) {
  await writeFile(join(root, 'probe.mjs'), generativeDriver(import.meta.url));
  const { stdout } = await run(process.execPath, ['probe.mjs', version], {
    cwd: root,
    env: { HOME: root, LC_ALL: 'C', PATH: process.env.PATH },
    timeout: 60_000,
  });
  return JSON.parse(stdout);
}

/**
 * Installs the generative UI consumer from `tarballs` (package name → path)
 * in a fresh npm project and runs the Node probe against it.
 */
export async function smokeGenerativeConsumer({ tarballs, version, timeout = 180_000 }) {
  const packed = new Map();
  for (const name of GENERATIVE_CONSUMER) {
    const tarball = tarballs.get(name);
    if (tarball === undefined) fail(`the candidate has no tarball for ${name}`);
    packed.set(name, (await inspectTarball(tarball, { name, version })).bytes);
  }
  const root = await realpath(await mkdtemp(join(tmpdir(), 'kimen-generative-consumer-')));
  try {
    const env = npmEnvironment(root);
    await Promise.all([
      writeFile(env.npm_config_userconfig, ''),
      writeFile(env.npm_config_globalconfig, ''),
      writeFile(
        join(root, 'package.json'),
        `${JSON.stringify({ name: 'kimen-generative-consumer', private: true, type: 'module' })}\n`,
      ),
      mkdir(join(root, 'tarballs')),
    ]);
    const local = [];
    for (const name of GENERATIVE_CONSUMER) {
      const file = join(root, 'tarballs', `${name.slice(1).replace('/', '-')}.tgz`);
      await copyFile(tarballs.get(name), file);
      local.push(file);
    }
    await run(
      'npm',
      ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', ...local],
      { cwd: root, env, timeout },
    );
    const installed = await verifyInstalledPackages(root, packed);
    return { installed, probe: await runGenerativeProbe(root, version) };
  } finally {
    await rm(root, { force: true, recursive: true });
  }
}

/**
 * Verifies the candidate archive against its digest, extracts its tarballs
 * and runs the clean-consumer smoke on them.
 */
export async function smokeCandidate({ archivePath, expectedSha256, environment = {} }) {
  const { manifest } = await verifyCandidate({ archivePath, expectedSha256, environment });
  const content = await mkdtemp(join(tmpdir(), 'kimen-consumer-candidate-'));
  try {
    await run('tar', ['-xf', archivePath, '-C', content], {
      env: { LC_ALL: 'C', PATH: process.env.PATH },
    });
    const tarballs = new Map(
      manifest.packages.map(({ name, file }) => [name, join(content, file)]),
    );
    const generative = await smokeGenerativeConsumer({ tarballs, version: manifest.version });
    return { version: manifest.version, generative };
  } finally {
    await rm(content, { force: true, recursive: true });
  }
}
