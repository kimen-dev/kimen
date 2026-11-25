#!/usr/bin/env node
// Published-output pruning (Art. I — a deterministic post-pass of the build).
//
// The package publishes what a consumer reaches, and nothing else
// (scripts/lib/package-contents.mjs; the release candidate builder refuses
// anything more). Stencil writes two kinds of file no consumer can use:
// - a declaration under dist/types for every source module, including the
//   helpers each component bundles, which no public declaration imports;
// - a source map for every output module, including the re-export modules,
//   whose map names no source at all.
// This pass removes both from the published directories, and the link to
// each removed map. It never touches a module: a module the entry points
// fail to reach stops the release instead. It runs after the declaration
// specifiers are named, and it is idempotent.
import { readdir, readFile, rm, rmdir, stat, writeFile } from 'node:fs/promises';
import { join, posix, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DECLARATION_TREE = 'dist/types/';

async function walk(root, directory, files) {
  for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
    const path = posix.join(directory, entry.name);
    if (entry.isDirectory()) await walk(root, path, files);
    else if (entry.isFile()) files.set(path, await readFile(join(root, path)));
  }
}

/** The files npm packs from `packageRoot` for `manifest.files` (plain paths and `!` exclusions). */
async function packedFiles(packageRoot, manifest) {
  const files = new Map();
  const excluded = [];
  for (const entry of [...manifest.files, 'package.json', 'LICENSE', 'README.md']) {
    if (entry.startsWith('!')) {
      excluded.push(entry.slice(1));
      continue;
    }
    const absolute = join(packageRoot, entry);
    let status;
    try {
      status = await stat(absolute);
    } catch (error) {
      if (error?.code === 'ENOENT') continue;
      throw error;
    }
    if (status.isDirectory()) await walk(packageRoot, entry, files);
    else files.set(entry, await readFile(absolute));
  }
  for (const path of [...files.keys()]) {
    if (excluded.some((exclusion) => path === exclusion || path.startsWith(`${exclusion}/`))) {
      files.delete(path);
    }
  }
  return files;
}

function mapsNoSource(bytes) {
  try {
    const { sources } = JSON.parse(bytes.toString('utf8'));
    return Array.isArray(sources) && sources.length === 0;
  } catch {
    return false;
  }
}

async function removeEmptyDirectories(root, directory) {
  const absolute = join(root, directory);
  let entries;
  try {
    entries = await readdir(absolute, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) await removeEmptyDirectories(root, posix.join(directory, entry.name));
  }
  if ((await readdir(absolute)).length === 0) await rmdir(absolute);
}

export async function prunePackageOutputs({ packageRoot, workspaceRoot }) {
  const { packageContentRules, reachablePaths } = await import(
    pathToFileURL(resolve(workspaceRoot, 'scripts/lib/package-contents.mjs')).href
  );
  const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  const files = await packedFiles(packageRoot, manifest);

  let maps = 0;
  for (const [path, bytes] of files) {
    if (!path.startsWith('dist/') || !path.endsWith('.map') || !mapsNoSource(bytes)) continue;
    const module = path.slice(0, -'.map'.length);
    const link = `//# sourceMappingURL=${posix.basename(path)}`;
    const source = files.get(module)?.toString('utf8').trimEnd();
    if (source?.endsWith(link)) {
      const unlinked = `${source.slice(0, -link.length).trimEnd()}\n`;
      await writeFile(join(packageRoot, module), unlinked);
      files.set(module, Buffer.from(unlinked));
    }
    await rm(join(packageRoot, path));
    files.delete(path);
    maps += 1;
  }

  const reached = reachablePaths(files, manifest, packageContentRules[manifest.name].assets);
  let declarations = 0;
  for (const path of files.keys()) {
    if (path.startsWith(DECLARATION_TREE) && !reached.has(path)) {
      await rm(join(packageRoot, path));
      declarations += 1;
    }
  }
  await removeEmptyDirectories(packageRoot, DECLARATION_TREE.slice(0, -1));
  return { declarations, maps, published: files.size - declarations };
}

async function main() {
  const packageRoot = fileURLToPath(new URL('..', import.meta.url));
  const workspaceRoot = fileURLToPath(new URL('../../..', import.meta.url));
  const report = await prunePackageOutputs({ packageRoot, workspaceRoot });
  process.stdout.write(
    `PRUNE published outputs: PASS (${String(report.declarations)} unreachable declarations and ${String(report.maps)} empty source maps removed; ${String(report.published)} files published from ${relative(workspaceRoot, packageRoot)})\n`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`PRUNE published outputs: FAIL — ${error.message}\n`);
    process.exitCode = 1;
  });
}
