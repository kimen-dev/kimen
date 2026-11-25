// @spec:018-project-integrity-hardening#S7
import { lstat, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, onTestFinished } from 'vitest';

import {
  builtPackageOutputs,
  needsStaging,
  releaseManifest,
  stageBuiltPackage,
  stageReleasePackage,
} from '../release/stage-package.mjs';
import { builtManifest, writeBuiltPackage } from '../tests/fixtures/built-package.mjs';

// The daily mutation run executes this directory only, so the staging rules
// the candidate builder relies on are pinned here directly as well as through
// release-candidate.spec.mjs.

const emitter = (overrides = {}) => ({
  name: '@kimen/emitter',
  version: '1.2.3',
  files: ['dist', 'NOTICE'],
  dependencies: { '@kimen/catalog': 'workspace:*', zod: '4.6.7' },
  devDependencies: { '@kimen/elements': 'workspace:*', vitest: '5.1.0' },
  ...overrides,
});

const temporaryDirectory = async (prefix) => {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  return directory;
};

const sourcePackage = async (files = {}) => {
  const source = await temporaryDirectory('kimen-stage-source-');
  const contents = {
    'dist/index.js': 'export {};\n',
    'dist/nested/deep.js': 'export const deep = 1;\n',
    NOTICE: 'notice\n',
    LICENSE: 'licence\n',
    'README.md': '# emitter\n',
    'src/index.ts': 'not packed\n',
    ...files,
  };
  for (const [path, text] of Object.entries(contents)) {
    if (text === null) continue;
    await mkdir(join(source, path, '..'), { recursive: true });
    await writeFile(join(source, path), text);
  }
  return source;
};

const listing = async (directory, prefix = '') => {
  const entries = [];
  for (const entry of await readdir(join(directory, prefix), { withFileTypes: true })) {
    const path = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) entries.push(...(await listing(directory, path)));
    else entries.push(path);
  }
  return entries.sort();
};

describe('release package staging', () => {
  it('S7 only a manifest with a runtime workspace range needs staging', () => {
    expect(needsStaging(emitter())).toBe(true);
    expect(needsStaging(emitter({ dependencies: { zod: '4.6.7' } }))).toBe(false);
    expect(
      needsStaging({
        name: '@kimen/elements',
        devDependencies: { '@kimen/tokens': 'workspace:*' },
      }),
    ).toBe(false);
    expect(() =>
      needsStaging(emitter({ dependencies: { '@kimen/catalog': 'workspace:^' } })),
    ).toThrow(
      '@kimen/emitter dependencies can only use workspace:* on a release package; @kimen/catalog is workspace:^',
    );
  });

  it('S7 the staged manifest names the exact version and drops development dependencies only', () => {
    const source = emitter({
      peerDependencies: { '@kimen/elements': 'workspace:*', lit: '^3.0.0' },
      optionalDependencies: { '@kimen/tokens': 'workspace:*' },
    });
    const published = releaseManifest(source, '1.2.3');

    expect(published).toEqual({
      name: '@kimen/emitter',
      version: '1.2.3',
      files: ['dist', 'NOTICE'],
      dependencies: { '@kimen/catalog': '1.2.3', zod: '4.6.7' },
      peerDependencies: { '@kimen/elements': '1.2.3', lit: '^3.0.0' },
      optionalDependencies: { '@kimen/tokens': '1.2.3' },
    });
    expect(Object.keys(published.dependencies)).toEqual(['@kimen/catalog', 'zod']);
    // The source manifest is left as it was.
    expect(source.dependencies['@kimen/catalog']).toBe('workspace:*');
    expect(source.devDependencies).toEqual({ '@kimen/elements': 'workspace:*', vitest: '5.1.0' });
  });

  it('S7 stages what files lists plus LICENSE and README.md and writes the release manifest', async () => {
    const source = await sourcePackage();
    const staging = join(await temporaryDirectory('kimen-stage-target-'), 'package');

    await expect(stageReleasePackage(source, staging, emitter(), '1.2.3')).resolves.toBe(staging);
    expect(await listing(staging)).toEqual([
      'LICENSE',
      'NOTICE',
      'README.md',
      'dist/index.js',
      'dist/nested/deep.js',
      'package.json',
    ]);
    expect(await readFile(join(staging, 'package.json'), 'utf8')).toBe(
      `${JSON.stringify(releaseManifest(emitter(), '1.2.3'), null, 2)}\n`,
    );
    expect(await readFile(join(staging, 'dist/nested/deep.js'), 'utf8')).toBe(
      'export const deep = 1;\n',
    );
  });

  it('S7 a files entry that npm itself packs anyway is staged once', async () => {
    const source = await sourcePackage();
    const staging = join(await temporaryDirectory('kimen-stage-target-'), 'package');

    await stageReleasePackage(
      source,
      staging,
      emitter({ files: ['dist', 'README.md', 'NOTICE'] }),
      '1.2.3',
    );
    expect(await listing(staging)).toContain('README.md');
  });

  it.each([
    ['no files list', { files: undefined }],
    ['an empty files list', { files: [] }],
    ['a glob', { files: ['dist/*.js'] }],
    ['a negation', { files: ['!dist'] }],
    ['a brace', { files: ['{dist,lib}'] }],
    ['a class', { files: ['dist/[a-z].js'] }],
    ['a backslash', { files: ['dist\\index.js'] }],
    ['a parent directory', { files: ['../dist'] }],
    ['a current directory', { files: ['./dist'] }],
    ['an absolute path', { files: ['/dist'] }],
    ['a trailing separator', { files: ['dist/'] }],
    ['a non-string entry', { files: [7] }],
  ])('S7 refuses to stage %s', async (_name, overrides) => {
    const source = await sourcePackage();
    const staging = join(await temporaryDirectory('kimen-stage-target-'), 'package');
    const manifest = emitter(overrides);

    await expect(stageReleasePackage(source, staging, manifest, '1.2.3')).rejects.toThrow(
      manifest.files?.length
        ? `@kimen/emitter files entry ${JSON.stringify(manifest.files[0])} must be a plain package path`
        : '@kimen/emitter must list the files it packs to be staged',
    );
  });

  it.each(['LICENSE', 'README.md', 'NOTICE'])('S7 refuses to stage without %s', async (file) => {
    const source = await sourcePackage({ [file]: null });
    const staging = join(await temporaryDirectory('kimen-stage-target-'), 'package');

    await expect(stageReleasePackage(source, staging, emitter(), '1.2.3')).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('S7 refuses a symbolic link at a listed path or inside a listed directory', async () => {
    const outside = await sourcePackage();
    for (const link of ['NOTICE', 'dist/escape.js']) {
      const source = await sourcePackage(link === 'NOTICE' ? { NOTICE: null } : {});
      await symlink(join(outside, 'NOTICE'), join(source, link));
      expect((await lstat(join(source, link))).isSymbolicLink()).toBe(true);
      const staging = join(await temporaryDirectory('kimen-stage-target-'), 'package');

      await expect(stageReleasePackage(source, staging, emitter(), '1.2.3')).rejects.toThrow(
        `Release staging refuses the symbolic link ${join(source, link)}`,
      );
    }
  });

  it('S7 never stages into a directory that already holds the package', async () => {
    const source = await sourcePackage();
    const staging = join(await temporaryDirectory('kimen-stage-target-'), 'package');
    await stageReleasePackage(source, staging, emitter(), '1.2.3');

    await expect(stageReleasePackage(source, staging, emitter(), '1.2.3')).rejects.toMatchObject({
      code: expect.stringMatching(/^(?:EEXIST|ERR_FS_CP_EEXIST)$/u),
    });
  });

  it('S7 refuses a workspace range it cannot rewrite before copying anything', async () => {
    const source = await sourcePackage();
    const staging = join(await temporaryDirectory('kimen-stage-target-'), 'package');

    await expect(
      stageReleasePackage(
        source,
        staging,
        emitter({ dependencies: { '@kimen/nx-plugin': 'workspace:*' } }),
        '1.2.3',
      ),
    ).rejects.toThrow('@kimen/nx-plugin is workspace:*');
    await expect(lstat(staging)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

const angular = (overrides = {}) => ({
  name: '@kimen/angular',
  version: '1.2.3',
  private: false,
  license: 'Apache-2.0',
  repository: {
    type: 'git',
    url: 'git+https://github.com/kimen-dev/kimen.git',
    directory: 'packages/angular',
  },
  scripts: { build: 'ng-packagr -p ng-package.json' },
  dependencies: { '@kimen/elements': 'workspace:*', tslib: '2.9.1' },
  peerDependencies: { '@angular/core': '^22.0.0' },
  devDependencies: { 'ng-packagr': '22.2.6' },
  ...overrides,
});

const angularSource = async (manifest = angular(), builtOverrides = {}) => {
  const source = await temporaryDirectory('kimen-stage-built-');
  await writeFile(join(source, 'package.json'), JSON.stringify(manifest));
  for (const [file, text] of [
    ['LICENSE', 'source licence\n'],
    ['NOTICE', 'source notice\n'],
    ['README.md', '# source readme\n'],
  ]) {
    await writeFile(join(source, file), text);
  }
  await writeBuiltPackage(source, manifest, builtOverrides);
  await writeFile(join(source, 'dist/LICENSE'), 'licence copied by the build\n');
  return source;
};

describe('built package staging', () => {
  it('S7 only @kimen/angular publishes from its build output, from dist', () => {
    expect(builtPackageOutputs).toEqual({ '@kimen/angular': 'dist' });
    expect(Object.isFrozen(builtPackageOutputs)).toBe(true);
  });

  it('S7 stages the build output with the source legal files and README and the release manifest', async () => {
    const manifest = angular();
    const source = await angularSource(manifest);
    const staging = join(await temporaryDirectory('kimen-stage-target-'), 'package');

    await expect(stageBuiltPackage(source, staging, manifest, '1.2.3')).resolves.toBe(staging);
    expect(await listing(staging)).toEqual([
      'LICENSE',
      'NOTICE',
      'README.md',
      'fesm2022/kimen-angular.mjs',
      'package.json',
      'types/kimen-angular.d.ts',
    ]);
    for (const [file, text] of [
      ['LICENSE', 'source licence\n'],
      ['NOTICE', 'source notice\n'],
      ['README.md', '# source readme\n'],
    ]) {
      expect(await readFile(join(staging, file), 'utf8')).toBe(text);
    }
    expect(JSON.parse(await readFile(join(staging, 'package.json'), 'utf8'))).toEqual({
      ...builtManifest(manifest),
      dependencies: { '@kimen/elements': '1.2.3', tslib: '2.9.1' },
    });
    expect(await readFile(join(staging, 'package.json'), 'utf8')).toBe(
      `${JSON.stringify(releaseManifest(builtManifest(manifest), '1.2.3'), null, 2)}\n`,
    );
  });

  it('S7 refuses a package that publishes from its source directory', async () => {
    const source = await sourcePackage();
    const staging = join(await temporaryDirectory('kimen-stage-target-'), 'package');

    await expect(stageBuiltPackage(source, staging, emitter(), '1.2.3')).rejects.toThrow(
      '@kimen/emitter publishes from its source directory',
    );
  });

  it('S7 refuses a build output whose manifest is missing or not JSON', async () => {
    const manifest = angular();
    const source = await angularSource(manifest);
    await writeFile(join(source, 'dist/package.json'), '{ not json');
    const staging = join(await temporaryDirectory('kimen-stage-target-'), 'package');

    await expect(stageBuiltPackage(source, staging, manifest, '1.2.3')).rejects.toThrow(
      /^@kimen\/angular has no readable dist\/package\.json; build it first: /u,
    );
  });

  it('S7 a source field the build does not carry must be absent from the build too', async () => {
    const manifest = angular({ optionalDependencies: { lit: '^3.0.0' } });
    const source = await angularSource(manifest, { optionalDependencies: undefined });
    const staging = join(await temporaryDirectory('kimen-stage-target-'), 'package');

    await expect(stageBuiltPackage(source, staging, manifest, '1.2.3')).rejects.toThrow(
      '@kimen/angular dist/package.json optionalDependencies differs from its source manifest; rebuild it',
    );
  });

  it.each(['dist/package.json', 'dist/fesm2022/link.mjs', 'NOTICE'])(
    'S7 refuses a symbolic link at %s',
    async (link) => {
      const manifest = angular();
      const source = await angularSource(manifest);
      const outside = await temporaryDirectory('kimen-stage-outside-');
      const target = join(outside, 'target');
      await writeFile(
        target,
        link === 'dist/package.json' ? JSON.stringify(builtManifest(manifest)) : 'x\n',
      );
      await rm(join(source, link), { force: true });
      await symlink(target, join(source, link));
      const staging = join(await temporaryDirectory('kimen-stage-target-'), 'package');

      await expect(stageBuiltPackage(source, staging, manifest, '1.2.3')).rejects.toThrow(
        `Release staging refuses the symbolic link ${join(source, link)}`,
      );
    },
  );

  it('S7 refuses a build output that is itself a symbolic link', async () => {
    const manifest = angular();
    const built = await angularSource(manifest);
    const source = await temporaryDirectory('kimen-stage-linked-');
    await symlink(join(built, 'dist'), join(source, 'dist'));
    const staging = join(await temporaryDirectory('kimen-stage-target-'), 'package');

    await expect(stageBuiltPackage(source, staging, manifest, '1.2.3')).rejects.toThrow(
      'Release staging refuses the symbolic link',
    );
  });

  it('S7 refuses a workspace range the release cannot rewrite in the built manifest', async () => {
    const manifest = angular({ dependencies: { '@kimen/elements': 'workspace:^' } });
    const source = await angularSource(manifest);
    const staging = join(await temporaryDirectory('kimen-stage-target-'), 'package');

    await expect(stageBuiltPackage(source, staging, manifest, '1.2.3')).rejects.toThrow(
      '@kimen/angular dependencies can only use workspace:* on a release package; @kimen/elements is workspace:^',
    );
    await expect(lstat(staging)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
