// Staging for a release package whose runtime fields name another release
// package as `workspace:*`. npm pack ships a manifest verbatim, so such a
// package is packed from a copy of what npm would pack from its directory,
// with that range rewritten to the exact candidate version. A package without
// such a range is never staged: its bytes stay what npm packs from source.
import { cp, lstat, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { releaseWorkspaceDependencies } from './release-plan.mjs';

// npm packs these beside `files` whatever the list says, and a release
// carries both, so staging requires them.
const ALWAYS_PACKED = Object.freeze(['LICENSE', 'README.md']);
const GLOB_CHARACTERS = /[*?[\]{}!\\]/u;

function fail(message) {
  throw new Error(message);
}

/** True when npm pack would ship a `workspace:` range from this manifest's runtime fields. */
export function needsStaging(manifest) {
  return releaseWorkspaceDependencies(manifest).length > 0;
}

/** The manifest a staged package publishes: exact release ranges, no development dependencies. */
export function releaseManifest(manifest, version) {
  const published = globalThis.structuredClone(manifest);
  for (const { field, name } of releaseWorkspaceDependencies(manifest)) {
    published[field][name] = version;
  }
  delete published.devDependencies;
  return published;
}

function stagedEntries(manifest) {
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    fail(`${manifest.name} must list the files it packs to be staged`);
  }
  for (const entry of manifest.files) {
    if (
      typeof entry !== 'string' ||
      GLOB_CHARACTERS.test(entry) ||
      entry.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
    ) {
      fail(`${manifest.name} files entry ${JSON.stringify(entry)} must be a plain package path`);
    }
  }
  return [...new Set([...manifest.files, ...ALWAYS_PACKED])];
}

// npm does not pack symbolic links, and a copy must not follow one out of
// the package.
async function refuseSymbolicLink(path) {
  if ((await lstat(path)).isSymbolicLink()) {
    fail(`Release staging refuses the symbolic link ${path}`);
  }
  return true;
}

/**
 * Copies what `manifest.files` lists, plus LICENSE and README.md, from
 * `source` into a new `staging` directory and writes the release manifest
 * there. Fails closed on a glob or out-of-package entry, a missing file, a
 * symbolic link, or a workspace range the release cannot rewrite.
 */
export async function stageReleasePackage(source, staging, manifest, version) {
  const published = releaseManifest(manifest, version);
  await mkdir(staging, { recursive: true });
  for (const entry of stagedEntries(manifest)) {
    const from = join(source, entry);
    await refuseSymbolicLink(from);
    await cp(from, join(staging, entry), {
      errorOnExist: true,
      filter: refuseSymbolicLink,
      force: false,
      recursive: true,
    });
  }
  await writeFile(join(staging, 'package.json'), `${JSON.stringify(published, null, 2)}\n`, {
    flag: 'wx',
  });
  return staging;
}
