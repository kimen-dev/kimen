import { execFileSync } from 'node:child_process';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { releaseChangelog, releaseVersion } from 'nx/release';
import {
  buildChangelog,
  prepareManifest,
  releaseNotes,
  releasePackages,
  releaseVersionPattern,
  selectReleaseVersion,
} from './release-plan.mjs';

const noGitWrites = { stageChanges: false, gitCommit: false, gitTag: false, gitPush: false };

async function prepareRelease() {
  const manifests = new Map();
  for (const [name, path] of releasePackages) {
    const manifest = JSON.parse(await readFile(path, 'utf8'));
    if (manifest.name !== name) throw new Error(`${path} must declare ${name}`);
    manifests.set(name, manifest);
  }
  const versions = [...new Set([...manifests.values()].map(({ version }) => version))];
  const [currentVersion] = versions;
  if (versions.length !== 1 || !releaseVersionPattern.test(currentVersion)) {
    throw new Error('Release packages must start at one fixed, stable version');
  }
  const changelog = await readFile('CHANGELOG.md', 'utf8');
  const hasCurrentEntry = Boolean(releaseNotes(changelog, currentVersion));
  if (hasCurrentEntry) {
    const [parent] = execFileSync('git', ['log', '-1', '--format=%P'], { encoding: 'utf8' })
      .trim()
      .split(' ');
    if (
      parent &&
      [...releasePackages.values()].every((path) => {
        const previous = execFileSync('git', ['show', `${parent}:${path}`], { encoding: 'utf8' });
        return JSON.parse(previous).version !== currentVersion;
      })
    ) {
      console.log(`Skipping release commit for v${currentVersion}`);
      return;
    }
  }

  const tags = execFileSync('git', ['tag', '--merged', 'HEAD', '--list', 'v*'], {
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter((tag) => tag.startsWith('v') && releaseVersionPattern.test(tag.slice(1)));
  if (hasCurrentEntry && !tags.includes(`v${currentVersion}`)) {
    throw new Error(
      `Merged release v${currentVersion} is awaiting its tag. Retry release preparation after release tagging succeeds.`,
    );
  }
  const options = { ...noGitWrites, firstRelease: tags.length === 0 };
  const preview = await releaseVersion({ ...options, dryRun: true });
  if (
    Object.keys(preview.projectsVersionData).length !== releasePackages.size ||
    Object.keys(preview.projectsVersionData).some((name) => !releasePackages.has(name))
  ) {
    throw new Error('Nx must plan exactly the two packages in the release scope');
  }
  if (
    Object.values(preview.projectsVersionData).some(
      (data) => data.currentVersion !== currentVersion,
    )
  ) {
    throw new Error('Nx resolved a release baseline different from the versions on main');
  }
  const version = selectReleaseVersion(currentVersion, preview.workspaceVersion);
  if (version === null) {
    console.log('No release-worthy changes in the publication scope');
    return;
  }

  const result = await releaseVersion({
    ...options,
    specifier: version,
    releaseGraph: preview.releaseGraph,
  });
  const { workspaceChangelog } = await releaseChangelog({
    ...options,
    dryRun: true,
    createRelease: false,
    version,
    versionData: result.projectsVersionData,
    releaseGraph: result.releaseGraph,
  });
  const nextChangelog = buildChangelog(changelog, version, workspaceChangelog?.contents ?? '');
  for (const [name, path] of releasePackages) {
    const source = await readFile(path, 'utf8');
    const updated = JSON.parse(source);
    const manifest = prepareManifest(updated, version, manifests.get(name));
    if (updated.private !== false) {
      const revised = source.replace(/^ {2}"private": true,/mu, '  "private": false,');
      await writeFile(
        path,
        revised === source ? `${JSON.stringify(manifest, null, 2)}\n` : revised,
      );
    }
  }
  await writeFile('CHANGELOG.md', nextChangelog);
  console.log(`Prepared v${version}`);
  if (process.env.GITHUB_OUTPUT)
    await appendFile(process.env.GITHUB_OUTPUT, `version=${version}\n`);
}

await prepareRelease();
