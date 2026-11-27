import { execFile, spawn } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { isDeepStrictEqual, promisify } from 'node:util';

import { MCP_BUNDLE_INVENTORY_PREFIX } from '../lib/bundled-package-inventory.mjs';
import { bundledPackageNoticeTitle, noticeSections } from '../lib/package-notices.mjs';

const execFileAsync = promisify(execFile);
export const MCP_PACKAGE = '@kimen/mcp-server';
export const MCP_BINARY = 'dist/kimen-mcp.mjs';
const bin = 'kimen-mcp';
const files = [MCP_BINARY, 'COMPAT.md', 'NOTICE'];
const protocolVersion = '2025-11-25';
const toolNames = [
  'check_theme',
  'kimen_describe_component',
  'kimen_list_components',
  'kimen_render_spec',
  'kimen_surface_action',
  'kimen_validate_spec',
];

export function validateMcpPackage(manifest, { packed = false } = {}) {
  if (
    manifest.license !== 'Apache-2.0' ||
    !isDeepStrictEqual(manifest.bin, { [bin]: `./${MCP_BINARY}` }) ||
    !isDeepStrictEqual(manifest.files, files)
  ) {
    throw new Error(
      `${MCP_PACKAGE} manifest must declare its executable, shipped files and license`,
    );
  }
  for (const field of [
    'dependencies',
    'optionalDependencies',
    'peerDependencies',
    'bundleDependencies',
    'bundledDependencies',
  ]) {
    if (manifest[field] !== undefined && !isDeepStrictEqual(manifest[field], {})) {
      throw new Error(`${MCP_PACKAGE} cannot declare runtime ${field}`);
    }
  }
  if (packed && JSON.stringify(manifest).includes('workspace:')) {
    throw new Error(`${MCP_PACKAGE} packed manifest cannot contain workspace: ranges`);
  }
}

export async function stageMcpPackage(source, staging, manifest) {
  validateMcpPackage(manifest);
  // npm pack preserves devDependency specifiers. The standalone binary needs
  // none of the development tools or private workspace packages.
  const published = { ...manifest };
  delete published.devDependencies;
  await mkdir(join(staging, 'dist'), { recursive: true });
  await Promise.all([
    writeFile(join(staging, 'package.json'), `${JSON.stringify(published, null, 2)}\n`),
    ...[...files, 'LICENSE', 'README.md'].map((file) =>
      copyFile(join(source, file), join(staging, file)),
    ),
  ]);
  return staging;
}

export function verifyMcpBundleNotices(bundle, notice) {
  const header = bundle.split('\n', 2)[1];
  if (!header?.startsWith(MCP_BUNDLE_INVENTORY_PREFIX)) {
    throw new Error(`${MCP_PACKAGE} binary is missing its bundled package inventory`);
  }
  const packages = JSON.parse(header.slice(MCP_BUNDLE_INVENTORY_PREFIX.length));
  if (
    !Array.isArray(packages) ||
    packages.some(
      (item) =>
        !item ||
        ![item.name, item.version, item.license].every(
          (value) => typeof value === 'string' && value.length > 0,
        ),
    )
  ) {
    throw new Error(`${MCP_PACKAGE} binary has an invalid bundled package inventory`);
  }
  const { sections } = noticeSections(notice);
  for (const dependency of packages) {
    const title = bundledPackageNoticeTitle(dependency);
    if (!sections.has(title)) {
      throw new Error(`${MCP_PACKAGE} tarball is missing the notice section for ${title}`);
    }
  }
  return packages;
}

async function probeStdio(command, cwd, env, version) {
  const child = spawn(command, [], {
    cwd,
    env,
    killSignal: 'SIGKILL',
    signal: globalThis.AbortSignal.timeout(10_000),
  });
  let spawnError;
  child.on('error', (error) => {
    spawnError = error;
  });
  // A failed startup can close the pipe while a request is being sent.
  child.stdin.on('error', (error) => {
    spawnError ??= error;
  });
  const closed = new Promise((resolve) => child.once('close', resolve));
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  const messages = lines[Symbol.asyncIterator]();
  let stderr = '';
  child.stderr.setEncoding('utf8').on('data', (chunk) => {
    stderr = (stderr + chunk).slice(-2_000);
  });
  const send = (message) =>
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`);

  async function request(id, method, params) {
    send({ id, method, params });
    const { value, done } = await messages.next();
    if (done) {
      throw new Error(`${method} returned no response`, { cause: spawnError });
    }
    const reply = JSON.parse(value);
    if (reply?.id !== id || reply.jsonrpc !== '2.0' || !reply.result || reply.error) {
      throw new Error(`${method} returned an invalid JSON-RPC response`);
    }
    return reply.result;
  }

  try {
    const initialized = await request(1, 'initialize', {
      capabilities: {},
      clientInfo: { name: 'kimen-release-candidate', version: '1.0.0' },
      protocolVersion,
    });
    if (
      initialized.protocolVersion !== protocolVersion ||
      initialized.serverInfo?.name !== 'kimen' ||
      initialized.serverInfo.version !== version
    ) {
      throw new Error(
        `initialize must negotiate ${protocolVersion} and report serverInfo kimen@${version}`,
      );
    }
    send({ method: 'notifications/initialized' });
    const { tools, nextCursor } = await request(2, 'tools/list');
    if (
      nextCursor !== undefined ||
      !Array.isArray(tools) ||
      !isDeepStrictEqual(tools.map((tool) => tool?.name).sort(), toolNames)
    ) {
      throw new Error('tools/list must return the six Kimen tools');
    }
    child.stdin.end();
    if ((await closed) !== 0) throw new Error('the stdio binary did not exit cleanly');
  } catch (error) {
    throw new Error(`${bin} smoke test failed: ${error.message}${stderr ? `\n${stderr}` : ''}`, {
      cause: error,
    });
  } finally {
    lines.close();
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await closed;
  }
}

export async function verifyMcpTarball(bytes, version) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'kimen-mcp-consumer-')));
  try {
    const tarball = join(root, 'server.tgz');
    const env = { HOME: root, LC_ALL: 'C', PATH: process.env.PATH };
    await writeFile(tarball, bytes);
    await writeFile(join(root, 'package.json'), '{"private":true}\n');
    await execFileAsync(
      'npm',
      [
        'install',
        '--offline',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        '--no-save',
        '--package-lock=false',
        tarball,
      ],
      {
        cwd: root,
        env: {
          ...env,
          npm_config_cache: join(root, 'cache'),
          npm_config_update_notifier: 'false',
          npm_config_userconfig: join(root, '.npmrc'),
          npm_config_globalconfig: join(root, 'npmrc'),
        },
        timeout: 30_000,
      },
    );
    const command = join(root, 'node_modules/.bin', bin);
    const installed = join(root, 'node_modules', MCP_PACKAGE);
    if (
      (await realpath(installed)) !== installed ||
      (await realpath(command)) !== join(installed, MCP_BINARY)
    ) {
      throw new Error(`${bin} must resolve to the locally installed tarball binary`);
    }
    await probeStdio(command, root, env, version);
    return { name: MCP_PACKAGE, source: 'tarball', workspaceLinked: false };
  } finally {
    await rm(root, { force: true, recursive: true });
  }
}
