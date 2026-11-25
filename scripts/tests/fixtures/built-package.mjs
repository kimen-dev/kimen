// A package whose build writes its own publishable directory, the way
// ng-packagr writes @kimen/angular's dist/: a manifest derived from the
// source one (no scripts, devDependencies or files; entry fields added), the
// bundled module, its declarations and a copy of the README.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** The dist/package.json ng-packagr derives from `manifest`. */
export function builtManifest(manifest, overrides = {}) {
  const built = { ...manifest };
  delete built.files;
  delete built.scripts;
  delete built.devDependencies;
  return {
    ...built,
    module: 'fesm2022/kimen-angular.mjs',
    typings: 'types/kimen-angular.d.ts',
    exports: {
      './package.json': { default: './package.json' },
      '.': { types: './types/kimen-angular.d.ts', default: './fesm2022/kimen-angular.mjs' },
    },
    type: 'module',
    ...overrides,
  };
}

/** Writes the build output of `manifest` under `directory`/dist. */
export async function writeBuiltPackage(directory, manifest, overrides = {}) {
  const dist = join(directory, 'dist');
  await mkdir(join(dist, 'fesm2022'), { recursive: true });
  await mkdir(join(dist, 'types'), { recursive: true });
  await Promise.all([
    writeFile(
      join(dist, 'package.json'),
      `${JSON.stringify(builtManifest(manifest, overrides), null, 2)}\n`,
    ),
    writeFile(join(dist, 'fesm2022/kimen-angular.mjs'), 'export class KiButton {}\n'),
    writeFile(join(dist, 'types/kimen-angular.d.ts'), 'export declare class KiButton {}\n'),
    writeFile(join(dist, 'README.md'), `# ${manifest.name} (as built)\n`),
  ]);
}
