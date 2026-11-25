// @spec:018-project-integrity-hardening#S7
import { lstat, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, onTestFinished } from 'vitest';

import { needsStaging, releaseManifest, stageReleasePackage } from '../release/stage-package.mjs';

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
        emitter({ dependencies: { '@kimen/react': 'workspace:*' } }),
        '1.2.3',
      ),
    ).rejects.toThrow('@kimen/react is workspace:*');
    await expect(lstat(staging)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
