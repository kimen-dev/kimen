import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import ts from 'typescript';

export function checkRuntimeImports(packageRoot) {
  const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  const allowed = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ]);
  const dist = join(packageRoot, 'dist');
  for (const file of readdirSync(dist, { recursive: true, withFileTypes: true })) {
    if (!file.isFile() || !/\.(?:[cm]?js|d\.[cm]?ts)$/u.test(file.name)) continue;
    const path = join(file.parentPath, file.name);
    const source = readFileSync(path, 'utf8');
    for (const { fileName } of ts.preProcessFile(source, true, true).importedFiles) {
      if (fileName.startsWith('./') || fileName.startsWith('../')) continue;
      const dependency = fileName
        .split('/')
        .slice(0, fileName.startsWith('@') ? 2 : 1)
        .join('/');
      if (!allowed.has(dependency)) {
        throw new Error(
          `${path} imports ${fileName}, which ${manifest.name} neither depends on nor peers`,
        );
      }
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = process.cwd();
  // Incremental tsc builds can still have a copy from the old vendoring step.
  rmSync(join(root, 'dist/stencil-runtime'), { force: true, recursive: true });
  checkRuntimeImports(root);
}
