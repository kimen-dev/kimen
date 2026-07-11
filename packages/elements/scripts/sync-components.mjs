#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const START = '// <kimen:direct-types>';
const END = '// </kimen:direct-types>';

const loadInventoryContract = (workspaceRoot) => {
  const result = spawnSync(
    process.execPath,
    ['scripts/gates/check-component-inventory.mjs', '--json'],
    { cwd: workspaceRoot, encoding: 'utf8', env: process.env },
  );
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Component inventory gate failed: ${result.stderr.trim()}`);
  }
  return JSON.parse(result.stdout);
};

const assertFile = async (path) => {
  const details = await stat(path);
  if (!details.isFile()) {
    throw new Error(`Expected generated file: ${path}`);
  }
};

export function renderDirectTypeExports(component, rootContract) {
  const exportsByName = new Map();
  const mainTarget = `../types/components/${component.tag}/${component.tag}.js`;
  for (const name of component.moduleExports.types) {
    exportsByName.set(name, mainTarget);
  }
  for (const entry of rootContract.namedTypes) {
    if (entry.replacement !== `@kimen/elements/${component.tag}`) {
      continue;
    }
    const target = entry.from.replace(/^\.\/components\//u, '../types/components/');
    const previous = exportsByName.get(entry.name);
    if (previous && previous !== target) {
      throw new Error(`Conflicting direct type source for ${entry.name}`);
    }
    exportsByName.set(entry.name, target);
  }

  const lines = [...exportsByName]
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([name, target]) => `export type { ${name} } from '${target}';`);
  return [START, ...lines, END, ''].join('\n');
}

const replaceGeneratedBlock = (source, block) => {
  const start = source.indexOf(START);
  const end = source.indexOf(END);
  if ((start === -1) !== (end === -1)) {
    throw new Error('Malformed generated direct-types block');
  }
  const base =
    start === -1
      ? source.trimEnd()
      : `${source.slice(0, start)}${source.slice(end + END.length)}`.trimEnd();
  return `${base}\n${block}`;
};

const generatedComponentInterface =
  /(^|\n)(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)(?=\s+extends\s+Components\.)/gu;

export function augmentDirectDeclaration(source, component, rootContract) {
  const className = component.className;
  if (typeof className !== 'string' || className.trim() === '') {
    throw new Error(`Missing component class name for ${component.tag}`);
  }
  const matches = [...source.matchAll(generatedComponentInterface)].filter(
    (match) => match[2] === className,
  );
  if (matches.length !== 1) {
    throw new Error(
      `${component.tag} declaration must contain exactly one generated ${className} interface`,
    );
  }
  const exportedInterface = source.replace(generatedComponentInterface, (match, prefix, name) =>
    name === className ? `${prefix}export interface ${className}` : match,
  );
  return replaceGeneratedBlock(exportedInterface, renderDirectTypeExports(component, rootContract));
}

export async function syncComponentTypes({ workspaceRoot }) {
  const root = resolve(workspaceRoot);
  const { inventory, rootContract } = loadInventoryContract(root);

  for (const component of inventory) {
    const declarationPath = resolve(
      root,
      'packages/elements/dist/components',
      `${component.tag}.d.ts`,
    );
    const runtimePath = resolve(root, 'packages/elements/dist/components', `${component.tag}.js`);
    await assertFile(declarationPath);
    await assertFile(runtimePath);
    const current = await readFile(declarationPath, 'utf8');
    const next = augmentDirectDeclaration(current, component, rootContract);
    if (current !== next) {
      await writeFile(declarationPath, next, 'utf8');
    }
  }
  return inventory.length;
}

async function main() {
  const workspaceRoot = fileURLToPath(new URL('../../..', import.meta.url));
  const count = await syncComponentTypes({ workspaceRoot });
  process.stdout.write(`SYNC components: PASS (${count} direct type surfaces)\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`SYNC components: FAIL — ${error.message}\n`);
    process.exitCode = 1;
  });
}
