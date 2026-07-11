#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
const toDistPath = (tag, projectRoot) =>
  projectRoot ? resolve(projectRoot, 'dist/components', `${tag}.js`) : `dist/components/${tag}.js`;

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

export function renderCompositeEntry(group, projectRoot) {
  if (!group || !Array.isArray(group.members) || group.members.length < 2) {
    throw new Error('Composite entry requires at least two component members');
  }
  const imports = group.members.map(
    (tag, index) =>
      `import { defineCustomElement as define${index} } from '${resolve(projectRoot, 'dist/components', `${tag}.js`)}';`,
  );
  const calls = group.members.map((_tag, index) => `  define${index}();`);
  return [...imports, '', 'export function defineComposite(): void {', ...calls, '}', ''].join(
    '\n',
  );
}

export function createSizeLimitConfig({
  components,
  groups,
  onlyTag,
  projectRoot = '',
  compositeEntries = {},
}) {
  if (!Array.isArray(components) || components.length === 0 || !Array.isArray(groups)) {
    throw new TypeError('Size budget derivation requires component inventory and groups');
  }
  const byTag = new Map(components.map((component) => [component.tag, component]));
  if (byTag.size !== components.length) {
    throw new Error('Size budget inventory contains duplicate components');
  }
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  if (groupsById.size !== groups.length) {
    throw new Error('Size budget configuration contains duplicate groups');
  }

  for (const group of groups) {
    if (!Array.isArray(group.members) || group.members.length < 2) {
      throw new Error(`Composite budget group ${group.id} must contain at least two members`);
    }
    for (const tag of group.members) {
      const component = byTag.get(tag);
      if (!component) {
        throw new Error(`Composite budget group ${group.id} references unknown component ${tag}`);
      }
      if (component.budgetGroup !== group.id) {
        throw new Error(`Component budget membership drifted for ${tag}`);
      }
    }
    const inventoryMembers = components
      .filter(({ budgetGroup }) => budgetGroup === group.id)
      .map(({ tag }) => tag)
      .sort(compareText);
    const declaredMembers = [...group.members].sort(compareText);
    if (JSON.stringify(inventoryMembers) !== JSON.stringify(declaredMembers)) {
      throw new Error(`Composite budget group membership is partial for ${group.id}`);
    }
  }
  for (const component of components) {
    if (component.budgetGroup !== 'default' && !groupsById.has(component.budgetGroup)) {
      throw new Error(`Unknown budget group ${component.budgetGroup} for ${component.tag}`);
    }
  }

  const selectedGroup = onlyTag ? byTag.get(onlyTag)?.budgetGroup : undefined;
  if (onlyTag && !byTag.has(onlyTag)) {
    throw new Error(`Unknown component requested for size budget: ${onlyTag}`);
  }
  const selectedGroups = groups
    .filter((group) => !onlyTag || group.id === selectedGroup)
    .sort((left, right) => compareText(left.id, right.id));
  const defaultComponents = components
    .filter(
      (component) => component.budgetGroup === 'default' && (!onlyTag || component.tag === onlyTag),
    )
    .sort((left, right) => compareText(left.tag, right.tag));
  const subjects = [
    ...selectedGroups.map((group) => ({
      id: group.id,
      members: group.members,
      composite: true,
    })),
    ...defaultComponents.map((component) => ({
      id: component.tag,
      members: [component.tag],
      composite: false,
    })),
  ];

  return subjects.flatMap((subject) => {
    const paths = subject.members.map((tag) => toDistPath(tag, projectRoot));
    const path = subject.composite ? (compositeEntries[subject.id] ?? paths) : paths[0];
    return [
      {
        name: `${subject.id} marginal cost (runtime excluded)`,
        path,
        ignore: ['@stencil/core'],
        limit: '9 KB',
      },
      {
        name: `${subject.id} worst case (full Stencil runtime)`,
        path,
        limit: '25 KB',
      },
    ];
  });
}

export async function runSizeLimit({ workspaceRoot, onlyTag }) {
  const root = resolve(workspaceRoot);
  const projectRoot = resolve(root, 'packages/elements');
  const { inventory: components, groups } = loadInventoryContract(root);
  const temporary = await mkdtemp(join(tmpdir(), 'kimen-size-limit-'));
  const configPath = join(temporary, 'size-limit.json');
  try {
    const compositeEntries = {};
    for (const group of groups) {
      const entryPath = join(temporary, `${group.id}-composite.ts`);
      await writeFile(entryPath, renderCompositeEntry(group, projectRoot), 'utf8');
      compositeEntries[group.id] = entryPath;
    }
    const config = createSizeLimitConfig({
      components,
      groups,
      onlyTag,
      projectRoot,
      compositeEntries,
    });
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
    const result = spawnSync('pnpm', ['exec', 'size-limit', '--config', configPath], {
      cwd: projectRoot,
      stdio: 'inherit',
      env: process.env,
    });
    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(`size-limit exited ${result.status}`);
    }
    return config;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

async function main() {
  const tagIndex = process.argv.indexOf('--tag');
  const onlyTag = tagIndex === -1 ? undefined : process.argv[tagIndex + 1];
  if (tagIndex !== -1 && !onlyTag) {
    throw new Error('--tag requires a ki-* value');
  }
  const workspaceRoot = fileURLToPath(new URL('../../..', import.meta.url));
  const config = await runSizeLimit({ workspaceRoot, onlyTag });
  process.stdout.write(`GATE size-limit: PASS (${config.length} derived checks)\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`GATE size-limit: FAIL — ${error.message}\n`);
    process.exitCode = 1;
  });
}
