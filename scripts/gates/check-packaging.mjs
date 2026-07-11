#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { discoverComponentInventory } from '../lib/component-inventory.mjs';
import { checkComponentInventory } from './check-component-inventory.mjs';

const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

export function createAttwPlan(components) {
  if (!Array.isArray(components) || components.length === 0) {
    throw new TypeError('ATTW plan requires a non-empty component inventory');
  }
  const componentEntrypoints = components
    .map((component) => {
      if (
        !component ||
        typeof component.tag !== 'string' ||
        component.publicSubpath !== `./${component.tag}`
      ) {
        throw new Error('ATTW plan received an invalid direct component subpath');
      }
      return component.publicSubpath;
    })
    .sort(compareText);
  if (new Set(componentEntrypoints).size !== componentEntrypoints.length) {
    throw new Error('ATTW plan received duplicate component entrypoints');
  }
  return {
    rootEntrypoints: ['.'],
    loaderEntrypoints: ['./loader'],
    componentEntrypoints,
  };
}

const run = (command, args, cwd) => {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', env: process.env });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited ${result.status}`);
  }
};

export async function checkPackaging({
  workspaceRoot,
  execute = run,
  checkInventory = checkComponentInventory,
  discoverInventory = discoverComponentInventory,
}) {
  const root = resolve(workspaceRoot);
  await checkInventory({ workspaceRoot: root });
  const inventory = await discoverInventory({ workspaceRoot: root });
  const plan = createAttwPlan(inventory);

  for (const packageDirectory of [
    'packages/tokens',
    'packages/elements',
    'packages/catalog',
    'packages/kimen',
  ]) {
    execute('pnpm', ['exec', 'publint', packageDirectory], root);
  }
  execute(
    'pnpm',
    [
      'exec',
      'attw',
      '--pack',
      'packages/elements',
      '--profile',
      'esm-only',
      '--entrypoints',
      ...plan.rootEntrypoints,
    ],
    root,
  );
  execute(
    'pnpm',
    [
      'exec',
      'attw',
      '--pack',
      'packages/elements',
      '--profile',
      'esm-only',
      '--entrypoints',
      ...plan.loaderEntrypoints,
      '--ignore-rules',
      'internal-resolution-error',
    ],
    root,
  );
  execute('pnpm', ['exec', 'attw', '--pack', 'packages/catalog', '--profile', 'esm-only'], root);
  execute(
    'pnpm',
    [
      'exec',
      'attw',
      '--pack',
      'packages/elements',
      '--profile',
      'esm-only',
      '--entrypoints',
      ...plan.componentEntrypoints,
      '--ignore-rules',
      'internal-resolution-error',
    ],
    root,
  );
  return plan;
}

export async function runPackagingCli({
  workspaceRoot = process.cwd(),
  stdout = process.stdout,
  dependencies = {},
} = {}) {
  const plan = await checkPackaging({ workspaceRoot, ...dependencies });
  stdout.write(
    `GATE packaging: PASS (${plan.componentEntrypoints.length} source-derived component entrypoints)\n`,
  );
  return plan;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runPackagingCli().catch((error) => {
    process.stderr.write(`GATE packaging: FAIL — ${error.message}\n`);
    process.exitCode = 1;
  });
}
