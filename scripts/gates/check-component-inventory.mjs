#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  discoverComponentInventory,
  readBudgetGroups,
  resolveComponentSubpaths,
  validateLegacyRootContract,
  validatePackageExportContract,
} from '../lib/component-inventory.mjs';

const REQUIRED_COMPOSITES = Object.freeze([
  { id: 'ki-avatar-group', members: ['ki-avatar-group', 'ki-avatar'] },
  { id: 'ki-radio-group', members: ['ki-radio-group', 'ki-radio'] },
  { id: 'ki-select', members: ['ki-select', 'ki-option'] },
  { id: 'ki-tabs', members: ['ki-tabs', 'ki-tab', 'ki-tab-panel'] },
]);

export async function checkComponentInventory({
  workspaceRoot,
  discoverInventory = discoverComponentInventory,
  readText = readFile,
  validateExports = validatePackageExportContract,
  resolveSubpaths = resolveComponentSubpaths,
  validateRoot = validateLegacyRootContract,
  readGroups = readBudgetGroups,
}) {
  const root = resolve(workspaceRoot);
  const inventory = await discoverInventory({ workspaceRoot: root });
  const packageJson = JSON.parse(
    await readText(resolve(root, 'packages/elements/package.json'), 'utf8'),
  );
  validateExports(packageJson.exports);
  const directSubpaths = resolveSubpaths(packageJson.exports, inventory);
  const rootContract = validateRoot(
    await readText(resolve(root, 'packages/elements/src/index.ts'), 'utf8'),
  );
  const groups = await readGroups({ workspaceRoot: root });

  if (JSON.stringify(groups) !== JSON.stringify(REQUIRED_COMPOSITES)) {
    throw new Error(
      'Composite budget exceptions must be exactly ki-avatar-group, ki-radio-group, ki-select, and ki-tabs',
    );
  }
  if (directSubpaths.length !== inventory.length) {
    throw new Error('Direct package subpaths do not cover the source-derived inventory');
  }
  const tags = new Set(inventory.map(({ tag }) => tag));
  for (const entry of [...rootContract.values, ...rootContract.namedTypes]) {
    const tag = entry.replacement.slice('@kimen/elements/'.length);
    if (!tags.has(tag)) {
      throw new Error(`Legacy root replacement is not a component subpath: ${entry.replacement}`);
    }
  }

  return { inventory, directSubpaths, rootContract, groups };
}

export async function runComponentInventoryCli({
  arguments_ = process.argv.slice(2),
  workspaceRoot = process.cwd(),
  stdout = process.stdout,
  dependencies = {},
} = {}) {
  const result = await checkComponentInventory({ workspaceRoot, ...dependencies });
  if (arguments_.includes('--json')) {
    stdout.write(`${JSON.stringify(result)}\n`);
    return result;
  }
  stdout.write(
    `GATE component-inventory: PASS (${result.inventory.length} components, ${result.groups.length} composite groups, ${result.rootContract.values.length + result.rootContract.namedTypes.length} frozen root symbols)\n`,
  );
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runComponentInventoryCli().catch((error) => {
    process.stderr.write(`GATE component-inventory: FAIL — ${error.message}\n`);
    process.exitCode = 1;
  });
}
