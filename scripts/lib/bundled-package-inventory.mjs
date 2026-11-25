import { access, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

export const MCP_BUNDLE_INVENTORY_PREFIX = '// Bundled npm packages: ';

export function mergeBundledPackages(...inventories) {
  const packages = new Map(inventories.flat().map((pkg) => [`${pkg.name}@${pkg.version}`, pkg]));
  return [...packages.keys()].sort().map((key) => packages.get(key));
}

// The segments of a path up to and including the package it reaches inside
// `node_modules`, or null.
function packageSegments(path) {
  const segments = path.split(/[\\/]/u);
  const modules = segments.lastIndexOf('node_modules');
  if (modules < 0 || modules + 1 >= segments.length) return null;
  return segments.slice(0, modules + (segments[modules + 1].startsWith('@') ? 3 : 2));
}

// The npm packages a workspace build output compiled in, as its source map
// names them: the per-component modules of @kimen/elements carry Stencil's
// client runtime, which an esbuild metafile lists as the elements file it is.
// The map names the package by its path in the store the build read it from,
// which Stencil writes relative to the package rather than to the map, so the
// package is looked up by name the way that build resolved it: in the
// nearest node_modules above the output.
async function compiledPackageDirectories(file) {
  let map;
  try {
    map = JSON.parse(await readFile(`${file}.map`, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw new Error(`Bundled source map ${file}.map is not valid JSON: ${error.message}`, {
      cause: error,
    });
  }
  const names = new Set(
    (Array.isArray(map.sources) ? map.sources : [])
      .filter((source) => typeof source === 'string')
      .map((source) => packageSegments(source)?.slice(-2))
      .filter((segments) => segments !== undefined)
      .map(([scope, name]) => (scope.startsWith('@') ? `${scope}/${name}` : name)),
  );
  const directories = [];
  for (const name of names) {
    directories.push(await installedPackageDirectory(name, dirname(file), `${file}.map`));
  }
  return directories;
}

async function installedPackageDirectory(name, from, mapFile) {
  for (let directory = from; ; directory = dirname(directory)) {
    const candidate = join(directory, 'node_modules', name);
    try {
      await access(join(candidate, 'package.json'));
      return candidate;
    } catch {
      if (dirname(directory) === directory) {
        throw new Error(`Bundled source map ${mapFile} names ${name}, which is not installed`);
      }
    }
  }
}

export async function bundledNpmPackages(metafile, workingDirectory) {
  const packageDirectories = new Set();
  for (const { inputs } of Object.values(metafile.outputs)) {
    for (const [file, { bytesInOutput }] of Object.entries(inputs)) {
      if (bytesInOutput <= 0) continue;
      const installed = packageSegments(file);
      if (installed !== null) {
        packageDirectories.add(resolve(workingDirectory, installed.join('/')));
        continue;
      }
      for (const directory of await compiledPackageDirectories(resolve(workingDirectory, file))) {
        packageDirectories.add(directory);
      }
    }
  }
  const packages = await Promise.all(
    [...packageDirectories].map(async (directory) => {
      const path = resolve(directory, 'package.json');
      const { name, version, license } = JSON.parse(await readFile(path, 'utf8'));
      if (![name, version, license].every((value) => typeof value === 'string' && value !== '')) {
        throw new Error(
          `Bundled npm package must declare its name, version and license in ${path}`,
        );
      }
      return { name, version, license };
    }),
  );
  return mergeBundledPackages(packages);
}
