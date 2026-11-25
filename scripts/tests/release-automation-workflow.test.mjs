// @spec:151-release-automation
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateWorkflowSource } from '../gates/check-workflows.mjs';

const read = (file) => readFile(new URL(`../../${file}`, import.meta.url), 'utf8');
const workflows = await Promise.all(
  ['release-pr.yml', 'release-tag.yml'].map(async (file) => [
    file,
    await read(`.github/workflows/${file}`),
  ]),
);

test('S1 and S2 release preparation only writes after Nx produces a release plan', () => {
  const [, source] = workflows[0];
  assert.match(source, /^ {2}workflow_dispatch:/mu);
  assert.match(source, /if: steps\.plan\.outputs\.version != ''/u);
  assert.match(source, /node scripts\/release\/prepare-release\.mjs/u);
  assert.match(source, /node scripts\/release\/release-github\.mjs pr/u);
  assert.match(source, /run: pnpm regen/u);
});

test('S3 tagging binds to the pushed SHA and the existing workflow remains the tag publisher', async () => {
  const [, source] = workflows[1];
  assert.match(source, /ref: \$\{\{ github\.sha \}\}/u);
  assert.match(source, /node scripts\/release\/release-github\.mjs tag/u);
  assert.match(
    source,
    /if: "startsWith\(github\.event\.head_commit\.message, 'chore\(release\): v'\)"/u,
  );
  assert.doesNotMatch(source, /workflow_dispatch|npm publish|registry\.npmjs/u);
  const publisher = await read('.github/workflows/release.yml');
  assert.match(publisher, /tags:\s*\n\s*- 'v\*\.\*\.\*'/u);
});

test('S4 both workflows fail closed and use only scoped App credentials for writes', () => {
  for (const [file, source] of workflows) {
    validateWorkflowSource(source, file);
    assert.match(source, /branches: \[main\]/u);
    assert.match(source, /permissions:\n {6}contents: read/u);
    assert.match(source, /persist-credentials: false/u);
    assert.match(source, /RELEASE_APP_ID: \$\{\{ secrets\.RELEASE_APP_ID \}\}/u);
    assert.match(source, /RELEASE_APP_PRIVATE_KEY: \$\{\{ secrets\.RELEASE_APP_PRIVATE_KEY \}\}/u);
    assert.match(source, /-z "\$RELEASE_APP_ID" \|\| -z "\$RELEASE_APP_PRIVATE_KEY"/u);
    assert.match(
      source,
      /actions\/create-github-app-token@64ab729a6294000f5aa4a4bc0b73d1f32bc45510/u,
    );
    assert.match(source, /RELEASE_APP_TOKEN: \$\{\{ steps\.app\.outputs\.token \}\}/u);
    assert.doesNotMatch(source, /GITHUB_TOKEN|id-token: write|token: \$\{\{ github\.token/u);
  }
});

test('S6 Nx fixed releases target the publication packages without updating dependents or the lockfile', async () => {
  const { release } = JSON.parse(await read('nx.json'));
  const { releasePackages } = await import('../release/release-plan.mjs');
  assert.deepEqual(release.projects, [...releasePackages.keys()]);
  assert.equal(release.version.preserveLocalDependencyProtocols, true);
  assert.equal(release.projectsRelationship, 'fixed');
  assert.equal(release.version.conventionalCommits, true);
  assert.equal(release.version.updateDependents, 'never');
  assert.equal(release.version.versionActionsOptions.skipLockFileUpdate, true);
});

test('A feat raises the minor version whatever its scope (Nx useCommitScope is off)', async () => {
  // With Nx's default useCommitScope, a commit whose scope names no package
  // (feat(release), feat(genui)) counts as an indirect change and bumps only
  // the patch: #609 shipped as 0.2.1 that way. docs/releasing.md promises that
  // a feat raises the minor version, so scopes stay descriptive only.
  const { release } = JSON.parse(await read('nx.json'));
  assert.deepEqual(release.conventionalCommits, { useCommitScope: false });
});
