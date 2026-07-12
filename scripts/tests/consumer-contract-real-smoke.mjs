#!/usr/bin/env node
// @spec:018-project-integrity-hardening#S8
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readPackedLlmsFromTarball } from '../consumer-contract.mjs';

const repositoryRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const consumerContract = join(repositoryRoot, 'scripts/consumer-contract.mjs');

function run(command, arguments_, options) {
  const result = spawnSync(command, arguments_, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  });
  if (result.status !== 0) {
    const diagnostic = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    throw new Error(
      `${command} ${arguments_.join(' ')} failed:\n${diagnostic || result.error?.message || String(result.status)}`,
    );
  }
  return result;
}

function packedTarball(packageDirectory, destination, environment) {
  const result = run(
    'npm',
    ['pack', packageDirectory, '--json', '--ignore-scripts', '--pack-destination', destination],
    { cwd: repositoryRoot, env: environment },
  );
  const report = JSON.parse(result.stdout);
  if (!Array.isArray(report) || report.length !== 1 || typeof report[0]?.filename !== 'string') {
    throw new Error(`npm pack returned an invalid report for ${packageDirectory}`);
  }
  return join(destination, report[0].filename);
}

async function main() {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'kimen-real-consumer-smoke-'));
  try {
    const browserPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
    if (
      process.env.KIMEN_CACHE_ENV_READY !== '1' ||
      typeof browserPath !== 'string' ||
      !isAbsolute(browserPath)
    ) {
      throw new Error(
        'real consumer smoke requires the prepared cache environment; run pnpm test:consumer-contract',
      );
    }
    const cacheRoot = join(temporaryRoot, 'cache');
    const consumerCache = join(cacheRoot, 'consumer');
    const npmCache = join(consumerCache, 'npm');
    const pnpmStore = join(consumerCache, 'pnpm-store');
    const pnpmPrime = join(consumerCache, 'pnpm-prime');
    const consumerXdgCache = join(consumerCache, 'xdg');
    const corepackHome = join(cacheRoot, 'corepack');
    const home = join(temporaryRoot, 'home');
    const pnpmHome = join(cacheRoot, 'pnpm-home');
    const xdgCache = join(cacheRoot, 'xdg');
    const tarballDirectory = join(temporaryRoot, 'tarballs');
    const npmrc = join(temporaryRoot, 'empty.npmrc');
    const engine = process.env.KIMEN_BROWSER_ENGINE ?? 'chromium';
    await Promise.all([
      mkdir(npmCache, { recursive: true }),
      mkdir(pnpmStore, { recursive: true }),
      mkdir(pnpmPrime, { recursive: true }),
      mkdir(consumerXdgCache, { recursive: true }),
      mkdir(corepackHome, { recursive: true }),
      mkdir(home, { recursive: true }),
      mkdir(pnpmHome, { recursive: true }),
      mkdir(tarballDirectory, { recursive: true }),
      mkdir(xdgCache, { recursive: true }),
      writeFile(npmrc, '', { encoding: 'utf8', mode: 0o600 }),
    ]);
    await writeFile(
      join(pnpmPrime, 'package.json'),
      '{"name":"kimen-pnpm-prime","private":true}\n',
      'utf8',
    );
    const isolatedEnvironment = {
      ...process.env,
      CI: 'true',
      COREPACK_HOME: corepackHome,
      HOME: home,
      KIMEN_BROWSER_ENGINE: engine,
      npm_config_audit: 'false',
      npm_config_cache: npmCache,
      npm_config_fund: 'false',
      npm_config_ignore_scripts: 'true',
      npm_config_store_dir: pnpmStore,
      npm_config_userconfig: npmrc,
      NX_CACHE_DIRECTORY: join(cacheRoot, 'nx'),
      NX_DAEMON: 'false',
      NX_WORKSPACE_DATA_DIRECTORY: join(cacheRoot, 'nx-workspace-data'),
      PLAYWRIGHT_BROWSERS_PATH: browserPath,
      PNPM_HOME: pnpmHome,
      XDG_CACHE_HOME: xdgCache,
    };

    run(
      'pnpm',
      ['exec', 'nx', 'run-many', '--target=build', '--projects=@kimen/tokens,@kimen/elements'],
      { cwd: repositoryRoot, env: isolatedEnvironment },
    );
    run('npm', ['cache', 'add', '@stencil/core@4.43.5'], {
      cwd: repositoryRoot,
      env: { ...isolatedEnvironment, npm_config_offline: 'false' },
    });
    run(
      'pnpm',
      [
        '--dir',
        pnpmPrime,
        '--store-dir',
        pnpmStore,
        'add',
        '--ignore-scripts',
        '--save-exact',
        '@stencil/core@4.43.5',
      ],
      {
        cwd: repositoryRoot,
        env: {
          ...isolatedEnvironment,
          NPM_CONFIG_STORE_DIR: pnpmStore,
          XDG_CACHE_HOME: consumerXdgCache,
          npm_config_offline: 'false',
          npm_config_store_dir: pnpmStore,
        },
      },
    );
    run('pnpm', ['--filter', '@kimen/elements', 'exec', 'playwright', 'install', engine], {
      cwd: repositoryRoot,
      env: isolatedEnvironment,
    });

    const elementsTarball = packedTarball(
      join(repositoryRoot, 'packages/elements'),
      tarballDirectory,
      { ...isolatedEnvironment, npm_config_offline: 'true' },
    );
    const tokensTarball = packedTarball(join(repositoryRoot, 'packages/tokens'), tarballDirectory, {
      ...isolatedEnvironment,
      npm_config_offline: 'true',
    });
    const llms = join(temporaryRoot, 'packed-llms.txt');
    await writeFile(llms, readPackedLlmsFromTarball(elementsTarball));
    const reportPath = join(temporaryRoot, 'consumer-report.json');
    run(
      process.execPath,
      [
        consumerContract,
        '--elements-tarball',
        elementsTarball,
        '--tokens-tarball',
        tokensTarball,
        '--llms',
        llms,
        '--consumer-dir',
        join(temporaryRoot, 'consumer'),
        '--cache-dir',
        consumerCache,
        '--report',
        reportPath,
      ],
      {
        cwd: repositoryRoot,
        env: { ...isolatedEnvironment, npm_config_offline: 'true' },
      },
    );
    const report = JSON.parse(await readFile(reportPath, 'utf8'));
    if (
      report.browser?.engine !== engine ||
      !Number.isSafeInteger(report.browser?.executedSnippetCount) ||
      report.browser.executedSnippetCount < 1 ||
      report.browser?.httpRequestPolicyEnforced !== true ||
      JSON.stringify(report.browser?.networkPolicyScope) !==
        JSON.stringify(['http(s)-requests', 'websocket']) ||
      report.browser?.themeCustomPropertiesResolved !== true ||
      report.browser?.webSocketPolicyEnforced !== true ||
      report.packages?.length !== 2 ||
      report.packages.some(
        ({ source, workspaceLinked }) => source !== 'tarball' || workspaceLinked !== false,
      )
    ) {
      throw new Error(`real packed consumer report failed closed: ${JSON.stringify(report)}`);
    }
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
