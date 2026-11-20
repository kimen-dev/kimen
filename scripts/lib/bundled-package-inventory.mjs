import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const MCP_BUNDLE_INVENTORY_PREFIX = '// Bundled npm packages: ';

export function mergeBundledPackages(...inventories) {
  const packages = new Map(inventories.flat().map((pkg) => [`${pkg.name}@${pkg.version}`, pkg]));
  return [...packages.keys()].sort().map((key) => packages.get(key));
}

export async function bundledNpmPackages(metafile, workingDirectory) {
  const packageDirectories = new Set();
  for (const { inputs } of Object.values(metafile.outputs)) {
    for (const [file, { bytesInOutput }] of Object.entries(inputs)) {
      const segments = file.split('/');
      const modules = segments.lastIndexOf('node_modules');
      if (bytesInOutput <= 0 || modules < 0) continue;
      const first = segments[modules + 1];
      const packageEnd = modules + (first.startsWith('@') ? 3 : 2);
      packageDirectories.add(segments.slice(0, packageEnd).join('/'));
    }
  }
  const packages = await Promise.all(
    [...packageDirectories].map(async (directory) => {
      const path = resolve(workingDirectory, directory, 'package.json');
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
