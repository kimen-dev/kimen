// @spec:151-release-automation
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const packageDirectory = fileURLToPath(new URL('../../packages/mcp-server/', import.meta.url));

test('S7 installs the locally packed MCP server and completes its stdio handshake', async (t) => {
  const { stageMcpPackage, verifyMcpTarball } = await import('../release/mcp-tarball.mjs');
  const root = await mkdtemp(join(tmpdir(), 'kimen-mcp-local-pack-'));
  t.after(() => rm(root, { force: true, recursive: true }));
  const manifest = JSON.parse(await readFile(join(packageDirectory, 'package.json'), 'utf8'));
  const staging = join(root, 'package');
  await stageMcpPackage(packageDirectory, staging, manifest);
  const { stdout } = await run('npm', ['pack', '--offline', '--ignore-scripts', '--json'], {
    cwd: staging,
    env: { HOME: root, PATH: process.env.PATH, npm_config_cache: join(root, 'cache') },
  });
  const [{ filename }] = JSON.parse(stdout);
  const tarball = await readFile(join(staging, filename));
  assert.deepEqual(await verifyMcpTarball(tarball, manifest.version), {
    name: '@kimen/mcp-server',
    source: 'tarball',
    workspaceLinked: false,
  });
  await assert.rejects(verifyMcpTarball(tarball, '0.0.999'), /serverInfo.*0\.0\.999/u);
});

test('S8 every npm package in the actual bundle has its own notice section', async () => {
  const { verifyMcpBundleNotices } = await import('../release/mcp-tarball.mjs');
  const [bundle, notice] = await Promise.all(
    ['dist/kimen-mcp.mjs', 'NOTICE'].map((file) => readFile(join(packageDirectory, file), 'utf8')),
  );
  const inventory = verifyMcpBundleNotices(bundle, notice);
  assert.ok(
    inventory.some(({ name }) => name === '@stencil/core'),
    'includes the nested surface',
  );
  assert.ok(inventory.some(({ name }) => name === '@modelcontextprotocol/core'));
  assert.ok(inventory.some(({ name }) => name === '@modelcontextprotocol/server'));
  assert.ok(inventory.some(({ name }) => name === 'zod'));
  assert.throws(() => verifyMcpBundleNotices(bundle, ''), /missing.*notice section/u);
  assert.throws(() => verifyMcpBundleNotices('#!/usr/bin/env node\n', notice), /inventory/u);
});
